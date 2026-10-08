"""SQLite Database layer for AirDose.
Provides connection management, user authentication storage,
user saved places, exposure segments, daily exposure aggregation,
and telemetry samples.
"""

import sqlite3
import os
from contextlib import contextmanager
from typing import Optional, Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "airdose.db")


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Initializes tables, migrates missing columns, and seeds demo data."""
    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL COLLATE NOCASE,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 2. User saved places table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                location_type TEXT NOT NULL, -- 'home', 'office', 'college', 'other'
                name TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                address TEXT DEFAULT '',
                radius_meters REAL DEFAULT 50.0,
                indoor_coefficient REAL DEFAULT 0.5,
                questionnaire_json TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # Migrate user_locations columns if upgrading from earlier version
        cursor.execute("PRAGMA table_info(user_locations)")
        existing_cols = {row["name"] for row in cursor.fetchall()}
        if "radius_meters" not in existing_cols:
            cursor.execute("ALTER TABLE user_locations ADD COLUMN radius_meters REAL DEFAULT 50.0")
        if "indoor_coefficient" not in existing_cols:
            cursor.execute("ALTER TABLE user_locations ADD COLUMN indoor_coefficient REAL DEFAULT 0.5")
        if "questionnaire_json" not in existing_cols:
            cursor.execute("ALTER TABLE user_locations ADD COLUMN questionnaire_json TEXT DEFAULT NULL")
        if "updated_at" not in existing_cols:
            cursor.execute("ALTER TABLE user_locations ADD COLUMN updated_at TIMESTAMP DEFAULT NULL")

        # 3. Exposure Segments table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS exposure_segments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                location_type TEXT NOT NULL, -- 'HOME', 'OFFICE', 'COLLEGE', 'OUTDOOR', 'TRANSIT', 'OTHER'
                location_id INTEGER,
                latitude REAL,
                longitude REAL,
                pm25 REAL NOT NULL,
                pm25_timestamp TIMESTAMP,
                pm25_source TEXT,
                pm25_confidence TEXT DEFAULT 'medium',
                infiltration_factor REAL NOT NULL,
                breathing_factor REAL NOT NULL DEFAULT 1.0,
                base_breathing_rate_m3_s REAL NOT NULL DEFAULT 0.0001,
                inhalation_rate_ug_s REAL NOT NULL,
                exposure_ug REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (location_id) REFERENCES user_locations(id) ON DELETE SET NULL
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_segments_user_time ON exposure_segments(user_id, start_time)")

        # 4. Daily Exposure summary table (Source of truth cache with UNIQUE user_id, date)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_exposure (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TEXT NOT NULL, -- 'YYYY-MM-DD'
                total_pm25_ug REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_daily_user_date ON daily_exposure(user_id, date)")

        # 5. Location samples table (optional debugging/telemetry history)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS location_samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                accuracy_meters REAL,
                speed_mps REAL,
                heading REAL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # 6. Air quality observations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS air_quality_samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                pm25 REAL NOT NULL,
                source TEXT,
                confidence TEXT DEFAULT 'medium'
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_aq_samples_coords ON air_quality_samples(latitude, longitude, timestamp)")

        # Check demo user
        cursor.execute("SELECT id FROM users WHERE email = ?", ("demo@example.com",))
        demo_row = cursor.fetchone()
        demo_id = None
        if not demo_row:
            cursor.execute(
                "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                ("Demo User", "demo@example.com", "password123")
            )
            demo_id = cursor.lastrowid
            print("[Database] Seeded default demo account: demo@example.com / password123")
        else:
            demo_id = demo_row["id"]

        # Check demo user locations
        cursor.execute("SELECT COUNT(*) as cnt FROM user_locations WHERE user_id = ?", (demo_id,))
        loc_count = cursor.fetchone()["cnt"]
        if loc_count == 0:
            cursor.execute(
                """INSERT INTO user_locations (user_id, location_type, name, latitude, longitude, address, radius_meters, indoor_coefficient)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (demo_id, "home", "Home Residence", 28.6139, 77.2090, "Central Delhi, India", 100.0, 0.5)
            )
            cursor.execute(
                """INSERT INTO user_locations (user_id, location_type, name, latitude, longitude, address, radius_meters, indoor_coefficient)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (demo_id, "office", "Tech Hub Office", 28.4595, 77.0266, "Cyber Hub, Gurugram, India", 150.0, 0.4)
            )
            cursor.execute(
                """INSERT INTO user_locations (user_id, location_type, name, latitude, longitude, address, radius_meters, indoor_coefficient)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (demo_id, "college", "University Campus", 28.5457, 77.1928, "IIT Delhi Campus, New Delhi", 200.0, 0.5)
            )
            print("[Database] Seeded sample coordinates for demo account")


# User management
def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, password, created_at FROM users WHERE email = ?", (email.strip(),))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, password, created_at FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_user(name: str, email: str, password: str) -> Dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            (name.strip(), email.strip().lower(), password.strip())
        )
        user_id = cursor.lastrowid
        cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,))
        return dict(cursor.fetchone())


# User Saved Places Management
def create_user_location(
    user_id: int,
    location_type: str,
    name: str,
    latitude: float,
    longitude: float,
    address: str = "",
    radius_meters: float = 50.0,
    indoor_coefficient: Optional[float] = 0.5,
    questionnaire_json: Optional[str] = None,
) -> Dict[str, Any]:
    coeff = indoor_coefficient if indoor_coefficient is not None else 0.5
    raw_rad = float(radius_meters) if radius_meters is not None else 50.0
    rad = max(50.0, min(500.0, raw_rad))
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO user_locations (user_id, location_type, name, latitude, longitude, address, radius_meters, indoor_coefficient, questionnaire_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, location_type.strip().lower(), name.strip(), float(latitude), float(longitude), address.strip(), float(rad), float(coeff), questionnaire_json)
        )
        loc_id = cursor.lastrowid
        cursor.execute("SELECT * FROM user_locations WHERE id = ?", (loc_id,))
        return dict(cursor.fetchone())


def get_user_locations(user_id: int) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM user_locations WHERE user_id = ? ORDER BY id DESC",
            (user_id,)
        )
        return [dict(row) for row in cursor.fetchall()]


def get_user_location_by_id(location_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM user_locations WHERE id = ? AND user_id = ?",
            (location_id, user_id)
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def update_user_location(
    location_id: int,
    user_id: int,
    name: Optional[str] = None,
    location_type: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    address: Optional[str] = None,
    radius_meters: Optional[float] = None,
    indoor_coefficient: Optional[float] = None,
    questionnaire_json: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        existing = get_user_location_by_id(location_id, user_id)
        if not existing:
            return None

        new_name = name.strip() if name is not None else existing["name"]
        new_type = location_type.strip().lower() if location_type is not None else existing["location_type"]
        new_lat = float(latitude) if latitude is not None else existing["latitude"]
        new_lon = float(longitude) if longitude is not None else existing["longitude"]
        new_addr = address if address is not None else existing["address"]
        raw_rad = float(radius_meters) if radius_meters is not None else existing["radius_meters"]
        new_rad = max(50.0, min(500.0, raw_rad))
        new_coeff = float(indoor_coefficient) if indoor_coefficient is not None else existing["indoor_coefficient"]
        new_q = questionnaire_json if questionnaire_json is not None else existing.get("questionnaire_json")

        cursor.execute(
            """UPDATE user_locations
               SET name = ?, location_type = ?, latitude = ?, longitude = ?, address = ?, radius_meters = ?, indoor_coefficient = ?, questionnaire_json = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ? AND user_id = ?""",
            (new_name, new_type, new_lat, new_lon, new_addr, new_rad, new_coeff, new_q, location_id, user_id)
        )
        cursor.execute("SELECT * FROM user_locations WHERE id = ?", (location_id,))
        return dict(cursor.fetchone())


def delete_user_location(location_id: int, user_id: int) -> bool:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM user_locations WHERE id = ? AND user_id = ?",
            (location_id, user_id)
        )
        return cursor.rowcount > 0


# Exposure Segments Management
def insert_exposure_segment(
    user_id: int,
    start_time: str,
    end_time: str,
    location_type: str,
    location_id: Optional[int],
    latitude: Optional[float],
    longitude: Optional[float],
    pm25: float,
    pm25_timestamp: Optional[str],
    pm25_source: Optional[str],
    pm25_confidence: Optional[str],
    infiltration_factor: float,
    breathing_factor: float,
    base_breathing_rate_m3_s: float,
    inhalation_rate_ug_s: float,
    exposure_ug: float,
) -> Dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO exposure_segments (
                user_id, start_time, end_time, location_type, location_id,
                latitude, longitude, pm25, pm25_timestamp, pm25_source, pm25_confidence,
                infiltration_factor, breathing_factor, base_breathing_rate_m3_s,
                inhalation_rate_ug_s, exposure_ug
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id, start_time, end_time, location_type.upper(), location_id,
                latitude, longitude, float(pm25), pm25_timestamp, pm25_source, pm25_confidence,
                float(infiltration_factor), float(breathing_factor), float(base_breathing_rate_m3_s),
                float(inhalation_rate_ug_s), float(exposure_ug)
            )
        )
        seg_id = cursor.lastrowid
        cursor.execute("SELECT * FROM exposure_segments WHERE id = ?", (seg_id,))
        return dict(cursor.fetchone())


def get_exposure_segments_for_day(user_id: int, date_str: str) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        # Filter segments where date(start_time) matches the given day (YYYY-MM-DD)
        cursor.execute(
            """SELECT * FROM exposure_segments
               WHERE user_id = ? AND DATE(start_time) = ?
               ORDER BY start_time ASC""",
            (user_id, date_str)
        )
        return [dict(row) for row in cursor.fetchall()]


# Daily Exposure Management
def get_daily_exposure(user_id: int, date_str: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM daily_exposure WHERE user_id = ? AND date = ?",
            (user_id, date_str)
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def upsert_daily_exposure(user_id: int, date_str: str, total_pm25_ug: float) -> Dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO daily_exposure (user_id, date, total_pm25_ug)
               VALUES (?, ?, ?)
               ON CONFLICT(user_id, date) DO UPDATE SET
                   total_pm25_ug = excluded.total_pm25_ug,
                   updated_at = CURRENT_TIMESTAMP""",
            (user_id, date_str, float(total_pm25_ug))
        )
        cursor.execute(
            "SELECT * FROM daily_exposure WHERE user_id = ? AND date = ?",
            (user_id, date_str)
        )
        return dict(cursor.fetchone())


def get_daily_exposure_history(
    user_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 30
) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT date, total_pm25_ug FROM daily_exposure WHERE user_id = ?"
        params: List[Any] = [user_id]
        if start_date:
            query += " AND date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND date <= ?"
            params.append(end_date)
        query += " ORDER BY date ASC LIMIT ?"
        params.append(limit)
        cursor.execute(query, tuple(params))
        return [dict(row) for row in cursor.fetchall()]


def get_location_contributions(user_id: int, date_str: str) -> Dict[str, float]:
    """Calculates exposure contribution by location_type for a given day."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT location_type, SUM(exposure_ug) AS total_exposure
               FROM exposure_segments
               WHERE user_id = ? AND DATE(start_time) = ?
               GROUP BY location_type""",
            (user_id, date_str)
        )
        rows = cursor.fetchall()
        return {row["location_type"]: round(float(row["total_exposure"]), 4) for row in rows}


# Location & Air Quality Sample logs
def insert_location_sample(
    user_id: int,
    latitude: float,
    longitude: float,
    accuracy_meters: Optional[float] = None,
    speed_mps: Optional[float] = None,
    heading: Optional[float] = None,
) -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO location_samples (user_id, latitude, longitude, accuracy_meters, speed_mps, heading)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, latitude, longitude, accuracy_meters, speed_mps, heading)
        )


def insert_air_quality_sample(
    latitude: float,
    longitude: float,
    pm25: float,
    source: str = "OpenAQ",
    confidence: str = "medium"
) -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO air_quality_samples (latitude, longitude, pm25, source, confidence)
               VALUES (?, ?, ?, ?, ?)""",
            (latitude, longitude, pm25, source, confidence)
        )
