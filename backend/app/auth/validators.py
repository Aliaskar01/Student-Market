import re
from app.config import settings

EMAIL_REGEX = re.compile(r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$")


def normalize_email(email: str) -> str:
    """Normalize an email address by stripping whitespace and lowercasing."""
    return email.strip().lower()


def validate_registration_email(email: str) -> str:
    """Validate an email address for registration and profile updates.

    Currently accepts any syntactically valid email address so testing and diverse
    university domains (.edu, .kz, etc.) work without friction. To restrict to
    specific university domains in the future, configure ALLOWED_EMAIL_DOMAINS
    (e.g., '.edu,.edu.kz,kbtu.kz') or extend this function with custom verification.
    """
    normalized = normalize_email(email)
    if not normalized or len(normalized) > 255 or not EMAIL_REGEX.match(normalized):
        raise ValueError("Please enter a valid email address.")

    allowed_raw = settings.ALLOWED_EMAIL_DOMAINS.strip()
    if allowed_raw:
        allowed_domains = [d.strip().lower() for d in allowed_raw.split(",") if d.strip()]
        domain = normalized.split("@", 1)[1]
        matches = any(
            domain == rule.lstrip("@")
            or (rule.startswith(".") and domain.endswith(rule))
            or domain.endswith(f".{rule}")
            for rule in allowed_domains
        )
        if not matches:
            raise ValueError(
                f"Email domain must match an approved university domain ({', '.join(allowed_domains)})."
            )

    return normalized


def validate_password_strength(password: str) -> str:
    """Validate password strength for registration and password changes."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must not exceed 72 bytes.")
    if not any(ch.isalpha() for ch in password) or not any(ch.isdigit() for ch in password):
        raise ValueError("Password must include at least one letter and one number.")
    return password


def normalize_telegram_handle(handle: str | None) -> str | None:
    """Clean up optional Telegram username (strips leading @ and whitespace)."""
    if handle is None:
        return None
    cleaned = handle.strip()
    if not cleaned:
        return None
    if cleaned.startswith("https://t.me/"):
        cleaned = cleaned.removeprefix("https://t.me/")
    if cleaned.startswith("@"):
        cleaned = cleaned[1:]
    if not re.match(r"^[A-Za-z0-9_]{3,64}$", cleaned):
        raise ValueError("Telegram handle must be 3-64 letters, numbers, or underscores.")
    return f"@{cleaned}"
