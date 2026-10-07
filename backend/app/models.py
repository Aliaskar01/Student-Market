from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Text, Numeric, ForeignKey, DateTime, Integer, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Student(Base):
    __tablename__ = "student"

    student_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String)
    university_email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    university: Mapped[str] = mapped_column(String)

    # 1:N Relationship (One student -> many listings)
    listings: Mapped[list["Listing"]] = relationship(back_populates="seller")

class Category(Base):
    __tablename__ = "category"

    category_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String)

    # 1:N Relationship (One category -> many listings)
    listings: Mapped[list["Listing"]] = relationship(back_populates="category")

class Listing(Base):
    __tablename__ = "listing"

    listing_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("student.student_id"))
    category_id: Mapped[int] = mapped_column(ForeignKey("category.category_id"))
    
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    usage_state: Mapped[str | None] = mapped_column(String)
    condition: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="Draft") # Draft or Active
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    seller: Mapped["Student"] = relationship(back_populates="listings")
    category: Mapped["Category"] = relationship(back_populates="listings")
    photos: Mapped[list["ListingPhoto"]] = relationship(back_populates="listing", cascade="all, delete-orphan")

class ListingPhoto(Base):
    __tablename__ = "listing_photo"
    
    # Enforces the unique pair constraint shown in the schema
    __table_args__ = (UniqueConstraint('listing_id', 'position', name='uq_listing_position'),)

    photo_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listing.listing_id"))
    image_reference: Mapped[str] = mapped_column(String)
    position: Mapped[int] = mapped_column(Integer)

    # Relationship
    listing: Mapped["Listing"] = relationship(back_populates="photos")