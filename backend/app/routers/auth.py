"""Authentication router for user registration, login, and profile lookup."""

from typing import Optional
from fastapi import APIRouter, HTTPException, status, Query
from app.services.user_service import get_user_by_email, create_user
from app.schemas import SignUpRequest, SignInRequest, AuthResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=AuthResponse)
def sign_up(payload: SignUpRequest):
    """Registers a new user account."""
    name = payload.name.strip()
    email = payload.email.strip().lower()
    password = payload.password.strip()

    if not name or not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name, email, and password are required.",
        )

    if get_user_by_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    try:
        new_user = create_user(name=name, email=email, password=password)
        token = f"mvp-token-{new_user['id']}-{new_user['email']}"
        return AuthResponse(
            success=True,
            message="Account created successfully",
            token=token,
            user=UserOut(
                id=new_user["id"],
                name=new_user["name"],
                email=new_user["email"],
                created_at=str(new_user.get("created_at", "")),
            ),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create account: {str(e)}",
        )


@router.post("/signin", response_model=AuthResponse)
def sign_in(payload: SignInRequest):
    """Authenticates an existing user."""
    email = payload.email.strip().lower()
    password = payload.password.strip()

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required.",
        )

    user = get_user_by_email(email)
    if not user or user["password"] != password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = f"mvp-token-{user['id']}-{user['email']}"
    return AuthResponse(
        success=True,
        message="Signed in successfully",
        token=token,
        user=UserOut(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            created_at=str(user.get("created_at", "")),
        ),
    )


@router.get("/me", response_model=UserOut)
def get_current_user_profile(email: Optional[str] = Query(None)):
    """Returns the profile of the requested user or default demo account."""
    target_email = email.strip().lower() if email else "demo@example.com"
    user = get_user_by_email(target_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        created_at=str(user.get("created_at", "")),
    )
