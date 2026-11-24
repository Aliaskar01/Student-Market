from abc import ABC, abstractmethod
from typing import Optional

import jwt
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import decode_local_access_token, verify_password
from app.auth.validators import normalize_email
from app.config import settings
from app.models import Student


class AuthProvider(ABC):
    """Abstract authentication provider to support local DB auth now and Keycloak OIDC later."""

    @abstractmethod
    def get_public_config(self) -> dict:
        raise NotImplementedError

    @abstractmethod
    def resolve_access_token(self, token: str, db: Session) -> Student:
        raise NotImplementedError

    @abstractmethod
    def authenticate_credentials(
        self, email: str, password: str, db: Session
    ) -> Student:
        raise NotImplementedError


class LocalDbAuthProvider(AuthProvider):
    """Database-backed email/password + JWT authentication provider."""

    def get_public_config(self) -> dict:
        return {
            "provider": "local",
            "allow_registration": True,
            "password_min_length": 8,
            "keycloak": None,
        }

    def authenticate_credentials(
        self, email: str, password: str, db: Session
    ) -> Student:
        normalized_email = normalize_email(email)
        student = db.scalar(
            select(Student).where(Student.university_email == normalized_email)
        )
        if not student or not verify_password(password, student.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid university email or password.",
            )
        if not student.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated.",
            )
        return student

    def resolve_access_token(self, token: str, db: Session) -> Student:
        try:
            payload = decode_local_access_token(token)
            student_id = int(payload.get("sub", ""))
        except (jwt.PyJWTError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        student = db.get(Student, student_id)
        if not student or not student.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or inactive.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return student


class KeycloakAuthProvider(AuthProvider):
    """OIDC / Keycloak authentication adapter ready for future switch via AUTH_PROVIDER=keycloak.

    When enabled, validates RS256 OIDC JWTs against Keycloak's JWKS endpoint and
    maps `sub` (`external_subject_id`) / `email` to a local `Student` record via JIT provisioning.
    """

    def __init__(self) -> None:
        self._jwks_client: Optional[jwt.PyJWKClient] = None

    @property
    def issuer_url(self) -> str:
        return (
            f"{settings.KEYCLOAK_SERVER_URL.rstrip('/')}/realms/{settings.KEYCLOAK_REALM}"
        )

    def _get_jwks_client(self) -> jwt.PyJWKClient:
        if not settings.KEYCLOAK_SERVER_URL or not settings.KEYCLOAK_REALM:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Keycloak OIDC settings are not configured.",
            )
        if self._jwks_client is None:
            jwks_url = f"{self.issuer_url}/protocol/openid-connect/certs"
            self._jwks_client = jwt.PyJWKClient(jwks_url)
        return self._jwks_client

    def get_public_config(self) -> dict:
        return {
            "provider": "keycloak",
            "allow_registration": False,
            "password_min_length": 8,
            "keycloak": {
                "url": settings.KEYCLOAK_SERVER_URL,
                "realm": settings.KEYCLOAK_REALM,
                "client_id": settings.KEYCLOAK_CLIENT_ID,
                "issuer": self.issuer_url,
            },
        }

    def authenticate_credentials(
        self, email: str, password: str, db: Session
    ) -> Student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direct password login is disabled when Keycloak SSO is active.",
        )

    def resolve_access_token(self, token: str, db: Session) -> Student:
        try:
            jwks_client = self._get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            decode_kwargs = {
                "algorithms": ["RS256"],
                "issuer": self.issuer_url,
            }
            if settings.KEYCLOAK_AUDIENCE:
                decode_kwargs["audience"] = settings.KEYCLOAK_AUDIENCE
            else:
                decode_kwargs["options"] = {"verify_aud": False}

            claims = jwt.decode(token, signing_key.key, **decode_kwargs)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Keycloak token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        sub = claims.get("sub")
        email = normalize_email(claims.get("email", ""))
        if not sub or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Keycloak token missing required subject or email claims.",
            )

        student = db.scalar(
            select(Student).where(Student.external_subject_id == sub)
        )
        if not student:
            student = db.scalar(
                select(Student).where(Student.university_email == email)
            )
            if student:
                student.external_subject_id = sub
                student.auth_provider = "keycloak"
            else:
                student = Student(
                    full_name=claims.get("name") or email.split("@")[0],
                    university_email=email,
                    password_hash=None,
                    university=claims.get("university") or "University",
                    auth_provider="keycloak",
                    external_subject_id=sub,
                )
                db.add(student)
            db.commit()
            db.refresh(student)

        if not student.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated.",
            )
        return student


def get_auth_provider() -> AuthProvider:
    if settings.AUTH_PROVIDER == "keycloak":
        return KeycloakAuthProvider()
    return LocalDbAuthProvider()
