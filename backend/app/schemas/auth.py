"""Authentication request and response validation schemas."""

from pydantic import BaseModel
from typing import Optional


class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str


class SignInRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    success: bool
    message: str
    token: str
    user: UserOut
