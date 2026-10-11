"""Database connection and session management for AirDose."""

import os
import sqlite3
from contextlib import contextmanager
from app.core.config import settings

DB_PATH = settings.DB_PATH


@contextmanager
def get_db():
    """Context manager for SQLite database connection.
    Enforces foreign keys, enables dictionary-like row factory,
    and handles automatic transaction commit/rollback.
    """
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
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
