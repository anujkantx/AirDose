"""Database initialization, schema migrations, and initial seeding."""

from app.db.connection import get_db


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
