from typing import Annotated, Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.providers import get_auth_provider
from app.database import get_db
from app.models import Student


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def get_current_student(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[Optional[str], Header()] = None,
) -> Student:
    """Require an authenticated, active Student from the Authorization Bearer token."""
    token = _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    provider = get_auth_provider()
    return provider.resolve_access_token(token, db)


def get_optional_student(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[Optional[str], Header()] = None,
) -> Optional[Student]:
    """Return the authenticated Student if a valid Bearer token is sent, otherwise None."""
    token = _extract_bearer_token(authorization)
    if not token:
        return None
    provider = get_auth_provider()
    try:
        return provider.resolve_access_token(token, db)
    except HTTPException:
        return None
