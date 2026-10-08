"""User Service for AirDose.
Handles user registration, lookup, authentication, and profile management CRUD.
"""

from typing import Optional, Dict, Any
from app.db.connection import get_db


class UserService:
    """Provides CRUD operations for User accounts."""

    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """Retrieves a user by their email address."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, email, password, created_at FROM users WHERE email = ?", (email.strip(),))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves a user by their unique primary ID."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, email, password, created_at FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def create_user(name: str, email: str, password: str) -> Dict[str, Any]:
        """Creates a new user account in SQLite."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                (name.strip(), email.strip().lower(), password.strip())
            )
            user_id = cursor.lastrowid
            cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,))
            return dict(cursor.fetchone())


# Standalone function aliases for direct functional usage & backward compatibility
get_user_by_email = UserService.get_user_by_email
get_user_by_id = UserService.get_user_by_id
create_user = UserService.create_user
