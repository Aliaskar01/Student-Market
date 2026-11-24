from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# --- AUTH & STUDENT ---
class AuthConfigResponse(BaseModel):
    provider: str
    allow_registration: bool
    password_min_length: int
    keycloak: Optional[dict] = None


class StudentPrivateResponse(BaseModel):
    student_id: int
    full_name: str
    university_email: str
    university: str
    telegram_handle: Optional[str] = None
    phone_number: Optional[str] = None
    auth_provider: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    university_email: str = Field(..., max_length=255)
    university: str = Field(..., min_length=2, max_length=200)
    password: str = Field(..., min_length=8, max_length=72)
    telegram_handle: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=50)
    remember_me: bool = True


class LoginRequest(BaseModel):
    university_email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=1, max_length=72)
    remember_me: bool = True


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10)


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: StudentPrivateResponse


class StudentProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    university: Optional[str] = Field(None, min_length=2, max_length=200)
    university_email: Optional[str] = Field(None, max_length=255)
    telegram_handle: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=50)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=72)
    new_password: str = Field(..., min_length=8, max_length=72)


class UserSessionResponse(BaseModel):
    session_id: int
    auth_provider: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime
    is_current: bool = False

    model_config = ConfigDict(from_attributes=True)


# --- CATEGORY ---
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: Optional[str] = Field(None, max_length=100)


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    category_id: int

    model_config = ConfigDict(from_attributes=True)


# --- LISTING PHOTO ---
class ListingPhotoResponse(BaseModel):
    photo_id: int
    listing_id: int
    image_reference: str
    position: int

    model_config = ConfigDict(from_attributes=True)


# --- LISTING ---
class SellerPublicInfo(BaseModel):
    student_id: int
    full_name: str
    university: str

    model_config = ConfigDict(from_attributes=True)


class SellerContactInfo(BaseModel):
    university_email: str
    telegram_handle: Optional[str] = None
    phone_number: Optional[str] = None


class ListingCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    price: Decimal = Field(..., ge=0, max_digits=10, decimal_places=2)
    category_id: int
    usage_state: Optional[str] = Field(None, max_length=100)
    condition: Optional[str] = Field(None, max_length=100)
    status: Literal["Active", "Draft"] = "Active"


class ListingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    price: Optional[Decimal] = Field(None, ge=0, max_digits=10, decimal_places=2)
    category_id: Optional[int] = None
    usage_state: Optional[str] = Field(None, max_length=100)
    condition: Optional[str] = Field(None, max_length=100)
    status: Optional[Literal["Active", "Draft", "Sold"]] = None


class ListingResponse(BaseModel):
    listing_id: int
    seller_id: int
    category_id: int
    category_name: str
    title: str
    description: Optional[str] = None
    price: Decimal
    usage_state: Optional[str] = None
    condition: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    photos: list[ListingPhotoResponse] = []
    seller: SellerPublicInfo
    is_favorited: bool = False


class ListingDetailResponse(ListingResponse):
    seller_contact: Optional[SellerContactInfo] = None
    contact_requires_auth: bool = False


# --- FAVORITES ---
class FavoriteToggleResponse(BaseModel):
    listing_id: int
    is_favorited: bool


# --- REPORTS ---
class ListingReportCreate(BaseModel):
    reason: str = Field(..., min_length=2, max_length=100)
    details: Optional[str] = Field(None, max_length=1000)


class ListingReportResponse(BaseModel):
    report_id: int
    listing_id: int
    reporter_id: int
    reason: str
    details: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
