"""User domain entity model."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class UserModel:
    id: int
    name: str
    email: str
    password_hash: str
    created_at: Optional[str] = None
