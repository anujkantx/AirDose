"""User Accounts Database Repository.

Pure data access layer for user account CRUD operations.
Zero HTTP or business logic.
"""

from typing import Dict, Any, Optional
from app.db.connection import get_db


class UserRepository:
    """Repository for user accounts."""

    @staticmethod
    def get_by_email(email: str) -> Optional[Dict[str, Any]]:
        """Retrieves a user by email address."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, name, email, password, created_at FROM users WHERE email = ?",
                (email.strip(),),
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def get_by_id(user_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves a user by primary key ID."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, name, email, password, created_at FROM users WHERE id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def create_user(name: str, email: str, password: str) -> Dict[str, Any]:
        """Inserts a new user account."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                (name.strip(), email.strip().lower(), password.strip()),
            )
            user_id = cursor.lastrowid
            cursor.execute(
                "SELECT id, name, email, created_at FROM users WHERE id = ?",
                (user_id,),
            )
            return dict(cursor.fetchone())
