"""Database connection and session management for AirDose."""

import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "airdose.db")


@contextmanager
def get_db():
    """Context manager for SQLite database connection.
    Enforces foreign keys, enables dictionary-like row factory,
    and handles automatic transaction commit/rollback.
    """
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
