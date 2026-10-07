from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime

class ProductBase(BaseModel):
    title: str = Field(..., max_length=100)
    description: str | None = None
    price: float = Field(..., gt=0)
    category: str | None = None
    condition: str | None = None

class ProductCreate(ProductBase):
    seller_id: int

class ProductResponse(ProductBase):
    id: int
    seller_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)