from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

# --- STUDENT ---
class StudentBase(BaseModel):
    full_name: str
    university_email: str
    university: str

class StudentCreate(StudentBase):
    password_hash: str

class StudentResponse(StudentBase):
    student_id: int
    model_config = ConfigDict(from_attributes=True)

# --- CATEGORY ---
class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    category_id: int
    model_config = ConfigDict(from_attributes=True)

# --- LISTING PHOTO ---
class ListingPhotoBase(BaseModel):
    image_reference: str
    position: int

class ListingPhotoCreate(ListingPhotoBase):
    listing_id: int

class ListingPhotoResponse(ListingPhotoBase):
    photo_id: int
    listing_id: int
    model_config = ConfigDict(from_attributes=True)

# --- LISTING ---
class ListingBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    price: Decimal = Field(..., ge=0)
    usage_state: Optional[str] = None
    condition: Optional[str] = None
    status: str = "Active"

class ListingCreate(ListingBase):
    seller_id: int
    category_id: int

class ListingResponse(ListingBase):
    listing_id: int
    seller_id: int
    category_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)