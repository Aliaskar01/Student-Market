from contextlib import asynccontextmanager
from typing import Annotated
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import engine, get_db
from app.models import Base, Product
from app.schemas import ProductResponse, ProductCreate

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
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
    return {"status": "online", "message": "FastAPI is running and database tables are ready!"}

@app.get("/api/products", response_model=list[ProductResponse])
def get_products(db: DbSession):
    return db.scalars(select(Product)).all()

@app.post("/api/products", response_model=ProductResponse)
def create_product(product: ProductCreate, db: DbSession):
    new_product = Product(**product.model_dump())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product