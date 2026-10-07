import time
from contextlib import asynccontextmanager
from typing import Annotated
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import OperationalError, IntegrityError

from app.database import engine, get_db
from app.models import Base, Listing, Student, Category, ListingPhoto
from app import schemas

@asynccontextmanager
async def lifespan(app: FastAPI):
    retries = 5
    while retries > 0:
        try:
            # Safely creates all 4 tables dynamically on startup
            Base.metadata.create_all(bind=engine)
            print("Database connected and schema created safely!")
            break
        except OperationalError:
            print(f"Database not ready. Retrying... ({retries} left)")
            retries -= 1
            time.sleep(3)
    yield

app = FastAPI(title="Student Marketplace API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DbSession = Annotated[Session, Depends(get_db)]

@app.get("/")
def root():
    return {"status": "online", "message": "FastAPI is running and tables are ready!"}

# --- STUDENT ENDPOINTS ---
@app.post("/api/students", response_model=schemas.StudentResponse)
def create_student(student: schemas.StudentCreate, db: DbSession):
    new_student = Student(**student.model_dump())
    db.add(new_student)
    try:
        db.commit()
        db.refresh(new_student)
        return new_student
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")

@app.get("/api/students", response_model=list[schemas.StudentResponse])
def get_students(db: DbSession):
    return db.scalars(select(Student)).all()

# --- CATEGORY ENDPOINTS ---
@app.post("/api/categories", response_model=schemas.CategoryResponse)
def create_category(category: schemas.CategoryCreate, db: DbSession):
    new_category = Category(**category.model_dump())
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

@app.get("/api/categories", response_model=list[schemas.CategoryResponse])
def get_categories(db: DbSession):
    return db.scalars(select(Category)).all()

# --- LISTING ENDPOINTS ---
@app.post("/api/listings", response_model=schemas.ListingResponse)
def create_listing(listing: schemas.ListingCreate, db: DbSession):
    new_listing = Listing(**listing.model_dump())
    db.add(new_listing)
    try:
        db.commit()
        db.refresh(new_listing)
        return new_listing
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid seller_id or category_id")

@app.get("/api/listings", response_model=list[schemas.ListingResponse])
def get_listings(db: DbSession):
    return db.scalars(select(Listing)).all()