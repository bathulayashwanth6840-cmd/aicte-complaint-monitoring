from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, models, schemas

router = APIRouter(prefix="/users", tags=["Users & Authentication"])


@router.get("", response_model=List[schemas.UserResponse])
def list_users(db: Session = Depends(get_db)):
    """List system users and role assignments."""
    return db.query(models.User).order_by(models.User.id.asc()).all()


@router.post("", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    """Create a new user with login identifier and role."""
    existing = crud.get_user_by_login(db, user_in.login_identifier)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with login identifier '{user_in.login_identifier}' already exists.",
        )
    return crud.create_user(db, user_in)


@router.post("/login")
def login(login_in: schemas.UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate user credentials and return role authorization context."""
    user = crud.get_user_by_login(db, login_in.login_identifier)
    if not user or not crud.verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid login identifier or password.",
        )
    if not user.active_status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact Central Administrator.",
        )
    return {
        "message": "Authentication successful.",
        "user": {
            "id": user.id,
            "name": user.name,
            "login_identifier": user.login_identifier,
            "role": user.role,
            "active_status": user.active_status,
            "created_at": user.created_at,
        },
        "token": f"aicte-auth-token-{user.id}-{user.role.lower().replace(' ', '_')}",
    }


@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Retrieve user details."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' not found.",
        )
    return user

