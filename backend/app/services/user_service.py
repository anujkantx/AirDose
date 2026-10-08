"""User Service for AirDose.

Handles user registration, lookup, authentication, and profile management.
"""

from typing import Optional, Dict, Any
from app.repositories.user_repository import UserRepository


class UserService:
    """Provides operations for User accounts using the repository layer."""

    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """Retrieves a user by their email address."""
        return UserRepository.get_by_email(email)

    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves a user by their unique primary ID."""
        return UserRepository.get_by_id(user_id)

    @staticmethod
    def create_user(name: str, email: str, password: str) -> Dict[str, Any]:
        """Creates a new user account."""
        return UserRepository.create_user(name=name, email=email, password=password)


# Standalone function aliases for direct functional usage & backward compatibility
get_user_by_email = UserService.get_user_by_email
get_user_by_id = UserService.get_user_by_id
create_user = UserService.create_user
