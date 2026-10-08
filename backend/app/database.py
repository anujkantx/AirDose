"""SQLite Database layer for AirDose MVP.
Provides simple connection management, user authentication storage,
and user location coordinate records (office, home, other).
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
    """Initializes tables and seeds a demo account and locations if not present."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL COLLATE NOCASE,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 2. Create user_locations table for coordinates (office, home, other, etc.)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                location_type TEXT NOT NULL, -- 'home', 'office', 'other'
                name TEXT NOT NULL,          -- e.g. 'Home Residence', 'Main Office'
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                address TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # Check if demo user exists, if not seed it
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

        # Check if default coordinates exist for demo user, if not seed sample home, office & college
        cursor.execute("SELECT COUNT(*) as cnt FROM user_locations WHERE user_id = ?", (demo_id,))
        loc_count = cursor.fetchone()["cnt"]
        if loc_count == 0:
            cursor.execute(
                """INSERT INTO user_locations (user_id, location_type, name, latitude, longitude, address)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (demo_id, "home", "Home Residence", 28.6139, 77.2090, "Central Delhi, India")
            )
            cursor.execute(
                """INSERT INTO user_locations (user_id, location_type, name, latitude, longitude, address)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (demo_id, "office", "Tech Hub Office", 28.4595, 77.0266, "Cyber Hub, Gurugram, India")
            )
            cursor.execute(
                """INSERT INTO user_locations (user_id, location_type, name, latitude, longitude, address)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (demo_id, "college", "University Campus", 28.5457, 77.1928, "IIT Delhi Campus, New Delhi")
            )
            print("[Database] Seeded sample coordinates (home, office & college) for demo account")



def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, password, created_at FROM users WHERE email = ?", (email.strip(),))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, password, created_at FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None


def create_user(name: str, email: str, password: str) -> Dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            (name.strip(), email.strip().lower(), password.strip())
        )
        user_id = cursor.lastrowid
        cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row)


def get_all_users() -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, created_at FROM users ORDER BY id DESC")
        return [dict(row) for row in cursor.fetchall()]


# Location & Coordinates Management
def create_user_location(
    user_id: int,
    location_type: str,
    name: str,
    latitude: float,
    longitude: float,
    address: str = ""
) -> Dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO user_locations (user_id, location_type, name, latitude, longitude, address)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, location_type.strip().lower(), name.strip(), float(latitude), float(longitude), address.strip())
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


def delete_user_location(location_id: int, user_id: int) -> bool:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM user_locations WHERE id = ? AND user_id = ?",
            (location_id, user_id)
        )
        return cursor.rowcount > 0
