import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Annotated, Optional

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session, joinedload, selectinload

from app import schemas
from app.auth.dependencies import get_current_student, get_optional_student
from app.auth.providers import get_auth_provider
from app.auth.security import (
    create_access_token,
    ensure_utc,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.auth.validators import (
    normalize_telegram_handle,
    validate_password_strength,
    validate_registration_email,
)
from app.config import settings
from app.frontend import SPAStaticFiles
from app.database import SessionLocal, engine, ensure_schema_updates, get_db
from app.models import (
    Base,
    Category,
    Favorite,
    Listing,
    ListingPhoto,
    ListingReport,
    Student,
    UserSession,
)

DEFAULT_CATEGORIES = [
    ("Books", "books"),
    ("Electronics", "electronics"),
    ("Furniture", "furniture"),
    ("Clothes", "clothes"),
    ("Other", "other"),
]

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_PHOTOS_PER_LISTING = 5


def seed_default_categories(db: Session) -> None:
    """Populate default marketplace categories if the category table is empty."""
    existing_count = db.scalars(select(Category.category_id).limit(1)).first()
    if existing_count is not None:
        return
    for name, slug in DEFAULT_CATEGORIES:
        db.add(Category(name=name, slug=slug))
    db.commit()


def init_database(target_engine=engine, session_factory=SessionLocal) -> None:
    """Create missing tables, evolve existing columns safely, and seed base categories."""
    Base.metadata.create_all(bind=target_engine)
    ensure_schema_updates(target_engine)
    with session_factory() as db:
        seed_default_categories(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    retries = 5
    while retries > 0:
        try:
            init_database()
            print("Database connected, schema verified, and default categories ready!")
            break
        except OperationalError:
            if retries == 1:
                raise
            print(f"Database not ready. Retrying... ({retries} left)")
            retries -= 1
            time.sleep(3)
    yield


app = FastAPI(title="Student Marketplace API", version="2.0.0", lifespan=lifespan)

cors_origins_raw = settings.CORS_ORIGINS.strip()
if cors_origins_raw == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    origins_list = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/api/uploads/{filename}")
def serve_uploaded_file(filename: str):
    upload_root = settings.UPLOAD_DIR.resolve()
    target = (upload_root / filename).resolve()
    if not target.is_relative_to(upload_root) or not target.is_file():
        raise HTTPException(status_code=404, detail="Image not found.")
    return FileResponse(target)

DbSession = Annotated[Session, Depends(get_db)]
CurrentStudent = Annotated[Student, Depends(get_current_student)]
OptionalStudent = Annotated[Optional[Student], Depends(get_optional_student)]


# --- HELPERS ---
def _extract_client_ip(request: Request) -> Optional[str]:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    if request.client and request.client.host:
        return request.client.host[:64]
    return None


def _create_session_and_tokens(
    db: Session,
    student: Student,
    request: Request,
    remember_me: bool = True,
) -> schemas.AuthTokenResponse:
    access_token, expires_in = create_access_token(student)
    raw_refresh = generate_refresh_token()
    ttl_days = (
        settings.REFRESH_TOKEN_EXPIRE_DAYS
        if remember_me
        else settings.SESSION_SHORT_EXPIRE_DAYS
    )
    now = datetime.now(timezone.utc)
    session_row = UserSession(
        student_id=student.student_id,
        refresh_token_hash=hash_refresh_token(raw_refresh),
        auth_provider=student.auth_provider,
        user_agent=(request.headers.get("user-agent") or "")[:300] or None,
        ip_address=_extract_client_ip(request),
        expires_at=now + timedelta(days=ttl_days),
        last_used_at=now,
    )
    db.add(session_row)
    db.commit()
    db.refresh(student)

    return schemas.AuthTokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        token_type="bearer",
        expires_in=expires_in,
        user=schemas.StudentPrivateResponse.model_validate(student),
    )


def _serialize_listing(
    listing: Listing,
    favorited_ids: set[int],
) -> schemas.ListingResponse:
    return schemas.ListingResponse(
        listing_id=listing.listing_id,
        seller_id=listing.seller_id,
        category_id=listing.category_id,
        category_name=listing.category.name if listing.category else "Other",
        title=listing.title,
        description=listing.description,
        price=listing.price,
        usage_state=listing.usage_state,
        condition=listing.condition,
        status=listing.status,
        created_at=listing.created_at,
        updated_at=listing.updated_at,
        photos=[schemas.ListingPhotoResponse.model_validate(p) for p in listing.photos],
        seller=schemas.SellerPublicInfo.model_validate(listing.seller),
        is_favorited=listing.listing_id in favorited_ids,
    )


def _delete_local_photo_file(image_reference: str) -> None:
    prefix = "/api/uploads/"
    if not image_reference.startswith(prefix):
        return
    filename = image_reference.removeprefix(prefix)
    candidate = (settings.UPLOAD_DIR / filename).resolve()
    upload_root = settings.UPLOAD_DIR.resolve()
    if candidate.is_relative_to(upload_root) and candidate.is_file():
        candidate.unlink(missing_ok=True)


# --- HEALTH ---
@app.get("/api/health")
def root():
    return {
        "status": "online",
        "auth_provider": settings.AUTH_PROVIDER,
        "message": "Student Marketplace API is running and database tables are ready.",
    }


@app.get("/", include_in_schema=False)
def homepage():
    if settings.FRONTEND_DIST:
        return FileResponse(Path(settings.FRONTEND_DIST) / "index.html")
    return root()


# --- AUTHENTICATION ENDPOINTS ---
@app.get("/api/auth/config", response_model=schemas.AuthConfigResponse)
def get_auth_config():
    provider = get_auth_provider()
    return provider.get_public_config()


@app.post(
    "/api/auth/register",
    response_model=schemas.AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: schemas.RegisterRequest, request: Request, db: DbSession):
    if settings.AUTH_PROVIDER == "keycloak":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is managed through Keycloak SSO.",
        )

    try:
        email = validate_registration_email(payload.university_email)
        validate_password_strength(payload.password)
        telegram_handle = normalize_telegram_handle(payload.telegram_handle)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    existing = db.scalar(select(Student).where(Student.university_email == email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this university email already exists.",
        )

    student = Student(
        full_name=payload.full_name.strip(),
        university_email=email,
        password_hash=hash_password(payload.password),
        university=payload.university.strip(),
        telegram_handle=telegram_handle,
        phone_number=payload.phone_number.strip() if payload.phone_number else None,
        auth_provider="local",
    )
    db.add(student)
    try:
        db.commit()
        db.refresh(student)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this university email already exists.",
        )

    return _create_session_and_tokens(
        db=db, student=student, request=request, remember_me=payload.remember_me
    )


@app.post("/api/auth/login", response_model=schemas.AuthTokenResponse)
def login(payload: schemas.LoginRequest, request: Request, db: DbSession):
    provider = get_auth_provider()
    student = provider.authenticate_credentials(
        payload.university_email, payload.password, db
    )
    return _create_session_and_tokens(
        db=db, student=student, request=request, remember_me=payload.remember_me
    )


@app.post("/api/auth/refresh", response_model=schemas.AuthTokenResponse)
def refresh_session(
    payload: schemas.RefreshTokenRequest, request: Request, db: DbSession
):
    token_hash = hash_refresh_token(payload.refresh_token)
    session_row = db.scalar(
        select(UserSession).where(UserSession.refresh_token_hash == token_hash)
    )
    now = datetime.now(timezone.utc)
    if (
        not session_row
        or session_row.revoked_at is not None
        or ensure_utc(session_row.expires_at) <= now
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or revoked. Please sign in again.",
        )

    student = db.get(Student, session_row.student_id)
    if not student or not student.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive or unavailable.",
        )

    # Rotate refresh token on each refresh
    new_raw_refresh = generate_refresh_token()
    session_row.refresh_token_hash = hash_refresh_token(new_raw_refresh)
    session_row.last_used_at = now
    session_row.user_agent = (request.headers.get("user-agent") or "")[:300] or session_row.user_agent
    session_row.ip_address = _extract_client_ip(request) or session_row.ip_address
    db.commit()

    access_token, expires_in = create_access_token(student)
    return schemas.AuthTokenResponse(
        access_token=access_token,
        refresh_token=new_raw_refresh,
        token_type="bearer",
        expires_in=expires_in,
        user=schemas.StudentPrivateResponse.model_validate(student),
    )


@app.post("/api/auth/logout")
def logout(payload: schemas.LogoutRequest, db: DbSession):
    if payload.refresh_token:
        token_hash = hash_refresh_token(payload.refresh_token)
        session_row = db.scalar(
            select(UserSession).where(UserSession.refresh_token_hash == token_hash)
        )
        if session_row and session_row.revoked_at is None:
            session_row.revoked_at = datetime.now(timezone.utc)
            db.commit()
    return {"status": "signed_out"}


@app.post("/api/auth/logout-all")
def logout_all_sessions(current_student: CurrentStudent, db: DbSession):
    now = datetime.now(timezone.utc)
    sessions = db.scalars(
        select(UserSession).where(
            UserSession.student_id == current_student.student_id,
            UserSession.revoked_at.is_(None),
        )
    ).all()
    for sess in sessions:
        sess.revoked_at = now
    db.commit()
    return {"status": "signed_out_all", "revoked_count": len(sessions)}


@app.get("/api/auth/sessions", response_model=list[schemas.UserSessionResponse])
def list_my_sessions(
    current_student: CurrentStudent,
    db: DbSession,
    refresh_token: Optional[str] = Query(None),
):
    now = datetime.now(timezone.utc)
    current_hash = hash_refresh_token(refresh_token) if refresh_token else None
    sessions = db.scalars(
        select(UserSession)
        .where(
            UserSession.student_id == current_student.student_id,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now,
        )
        .order_by(UserSession.last_used_at.desc())
    ).all()
    return [
        schemas.UserSessionResponse(
            session_id=s.session_id,
            auth_provider=s.auth_provider,
            user_agent=s.user_agent,
            ip_address=s.ip_address,
            created_at=s.created_at,
            last_used_at=s.last_used_at,
            expires_at=s.expires_at,
            is_current=bool(current_hash and s.refresh_token_hash == current_hash),
        )
        for s in sessions
    ]


@app.delete("/api/auth/sessions/{session_id}")
def revoke_session(session_id: int, current_student: CurrentStudent, db: DbSession):
    session_row = db.get(UserSession, session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session_row.student_id != current_student.student_id:
        raise HTTPException(status_code=403, detail="Cannot revoke another user's session.")
    if session_row.revoked_at is None:
        session_row.revoked_at = datetime.now(timezone.utc)
        db.commit()
    return {"status": "revoked", "session_id": session_id}


@app.get("/api/auth/me", response_model=schemas.StudentPrivateResponse)
def get_me(current_student: CurrentStudent):
    return current_student


@app.patch("/api/auth/me", response_model=schemas.StudentPrivateResponse)
def update_me(
    payload: schemas.StudentProfileUpdate,
    current_student: CurrentStudent,
    db: DbSession,
):
    if payload.full_name is not None:
        current_student.full_name = payload.full_name.strip()
    if payload.university is not None:
        current_student.university = payload.university.strip()
    if payload.university_email is not None:
        try:
            new_email = validate_registration_email(payload.university_email)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        if new_email != current_student.university_email:
            taken = db.scalar(
                select(Student).where(
                    Student.university_email == new_email,
                    Student.student_id != current_student.student_id,
                )
            )
            if taken:
                raise HTTPException(
                    status_code=409,
                    detail="That university email is already registered to another account.",
                )
            current_student.university_email = new_email
    if payload.telegram_handle is not None:
        try:
            current_student.telegram_handle = normalize_telegram_handle(
                payload.telegram_handle
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
    if payload.phone_number is not None:
        cleaned_phone = payload.phone_number.strip()
        current_student.phone_number = cleaned_phone or None

    db.commit()
    db.refresh(current_student)
    return current_student


@app.post("/api/auth/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    current_student: CurrentStudent,
    db: DbSession,
):
    if current_student.auth_provider != "local" or not current_student.password_hash:
        raise HTTPException(
            status_code=400,
            detail="Password changes are managed by your external SSO provider.",
        )
    if not verify_password(payload.current_password, current_student.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    try:
        validate_password_strength(payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    current_student.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "password_updated"}


# --- CATEGORY ENDPOINTS ---
@app.get("/api/categories", response_model=list[schemas.CategoryResponse])
def get_categories(db: DbSession):
    return db.scalars(select(Category).order_by(Category.category_id)).all()


@app.post(
    "/api/categories",
    response_model=schemas.CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    category: schemas.CategoryCreate,
    current_student: CurrentStudent,
    db: DbSession,
):
    if current_student.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create new categories.",
        )
    slug = (category.slug or category.name).strip().lower().replace(" ", "-")
    new_category = Category(name=category.name.strip(), slug=slug)
    db.add(new_category)
    try:
        db.commit()
        db.refresh(new_category)
        return new_category
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Category already exists.")


# --- LISTING ENDPOINTS ---
@app.get("/api/listings", response_model=list[schemas.ListingResponse])
def get_listings(
    db: DbSession,
    current_student: OptionalStudent,
    search: Optional[str] = Query(None, max_length=200),
    category_id: Optional[int] = Query(None),
    min_price: Optional[Decimal] = Query(None, ge=0),
    max_price: Optional[Decimal] = Query(None, ge=0),
    condition: Optional[str] = Query(None, max_length=100),
    sort: str = Query("newest", pattern="^(newest|price_asc|price_desc)$"),
):
    stmt = (
        select(Listing)
        .options(
            joinedload(Listing.seller),
            joinedload(Listing.category),
            selectinload(Listing.photos),
        )
        .where(Listing.status == "Active")
    )

    if search and search.strip():
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(Listing.title.ilike(pattern), Listing.description.ilike(pattern))
        )
    if category_id is not None:
        stmt = stmt.where(Listing.category_id == category_id)
    if min_price is not None:
        stmt = stmt.where(Listing.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Listing.price <= max_price)
    if condition and condition.strip() and condition.strip().lower() != "all":
        stmt = stmt.where(Listing.condition.ilike(f"%{condition.strip()}%"))

    if sort == "price_asc":
        stmt = stmt.order_by(Listing.price.asc(), Listing.created_at.desc())
    elif sort == "price_desc":
        stmt = stmt.order_by(Listing.price.desc(), Listing.created_at.desc())
    else:
        stmt = stmt.order_by(Listing.created_at.desc(), Listing.listing_id.desc())

    listings = db.scalars(stmt).unique().all()

    favorited_ids: set[int] = set()
    if current_student:
        favorited_ids = set(
            db.scalars(
                select(Favorite.listing_id).where(
                    Favorite.student_id == current_student.student_id
                )
            ).all()
        )

    return [_serialize_listing(item, favorited_ids) for item in listings]


@app.get("/api/listings/my", response_model=list[schemas.ListingResponse])
def get_my_listings(current_student: CurrentStudent, db: DbSession):
    stmt = (
        select(Listing)
        .options(
            joinedload(Listing.seller),
            joinedload(Listing.category),
            selectinload(Listing.photos),
        )
        .where(Listing.seller_id == current_student.student_id)
        .order_by(Listing.updated_at.desc(), Listing.listing_id.desc())
    )
    listings = db.scalars(stmt).unique().all()
    favorited_ids = set(
        db.scalars(
            select(Favorite.listing_id).where(
                Favorite.student_id == current_student.student_id
            )
        ).all()
    )
    return [_serialize_listing(item, favorited_ids) for item in listings]


@app.get("/api/listings/{listing_id}", response_model=schemas.ListingDetailResponse)
def get_listing_detail(
    listing_id: int,
    db: DbSession,
    current_student: OptionalStudent,
):
    stmt = (
        select(Listing)
        .options(
            joinedload(Listing.seller),
            joinedload(Listing.category),
            selectinload(Listing.photos),
        )
        .where(Listing.listing_id == listing_id)
    )
    listing = db.scalars(stmt).unique().first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")

    if listing.status != "Active" and (
        not current_student or current_student.student_id != listing.seller_id
    ):
        raise HTTPException(status_code=404, detail="Listing not found.")

    is_favorited = False
    seller_contact = None
    contact_requires_auth = True
    if current_student:
        is_favorited = (
            db.scalar(
                select(Favorite.favorite_id).where(
                    Favorite.student_id == current_student.student_id,
                    Favorite.listing_id == listing_id,
                )
            )
            is not None
        )
        seller_contact = schemas.SellerContactInfo(
            university_email=listing.seller.university_email,
            telegram_handle=listing.seller.telegram_handle,
            phone_number=listing.seller.phone_number,
        )
        contact_requires_auth = False

    base_data = _serialize_listing(
        listing, {listing.listing_id} if is_favorited else set()
    )
    return schemas.ListingDetailResponse(
        **base_data.model_dump(),
        seller_contact=seller_contact,
        contact_requires_auth=contact_requires_auth,
    )


@app.post(
    "/api/listings",
    response_model=schemas.ListingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_listing(
    payload: schemas.ListingCreate,
    current_student: CurrentStudent,
    db: DbSession,
):
    category = db.get(Category, payload.category_id)
    if not category:
        raise HTTPException(status_code=400, detail="Selected category does not exist.")

    new_listing = Listing(
        seller_id=current_student.student_id,
        category_id=payload.category_id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        price=payload.price,
        usage_state=payload.usage_state,
        condition=payload.condition,
        status=payload.status,
    )
    db.add(new_listing)
    db.commit()

    created = db.scalars(
        select(Listing)
        .options(
            joinedload(Listing.seller),
            joinedload(Listing.category),
            selectinload(Listing.photos),
        )
        .where(Listing.listing_id == new_listing.listing_id)
    ).unique().first()
    return _serialize_listing(created, set())


@app.patch("/api/listings/{listing_id}", response_model=schemas.ListingResponse)
def update_listing(
    listing_id: int,
    payload: schemas.ListingUpdate,
    current_student: CurrentStudent,
    db: DbSession,
):
    listing = db.scalars(
        select(Listing)
        .options(
            joinedload(Listing.seller),
            joinedload(Listing.category),
            selectinload(Listing.photos),
        )
        .where(Listing.listing_id == listing_id)
    ).unique().first()

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.seller_id != current_student.student_id:
        raise HTTPException(
            status_code=403, detail="You can only edit your own listings."
        )

    if payload.category_id is not None:
        category = db.get(Category, payload.category_id)
        if not category:
            raise HTTPException(status_code=400, detail="Selected category does not exist.")
        listing.category_id = payload.category_id
    if payload.title is not None:
        listing.title = payload.title.strip()
    if payload.description is not None:
        listing.description = payload.description.strip() or None
    if payload.price is not None:
        listing.price = payload.price
    if payload.usage_state is not None:
        listing.usage_state = payload.usage_state
    if payload.condition is not None:
        listing.condition = payload.condition
    if payload.status is not None:
        listing.status = payload.status

    db.commit()
    updated = db.scalars(
        select(Listing)
        .options(
            joinedload(Listing.seller),
            joinedload(Listing.category),
            selectinload(Listing.photos),
        )
        .where(Listing.listing_id == listing_id)
    ).unique().first()
    is_fav = (
        db.scalar(
            select(Favorite.favorite_id).where(
                Favorite.student_id == current_student.student_id,
                Favorite.listing_id == listing_id,
            )
        )
        is not None
    )
    return _serialize_listing(updated, {listing_id} if is_fav else set())


@app.delete("/api/listings/{listing_id}")
def delete_listing(
    listing_id: int,
    current_student: CurrentStudent,
    db: DbSession,
):
    listing = db.scalars(
        select(Listing)
        .options(selectinload(Listing.photos))
        .where(Listing.listing_id == listing_id)
    ).unique().first()

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.seller_id != current_student.student_id:
        raise HTTPException(
            status_code=403, detail="You can only delete your own listings."
        )

    photo_refs = [p.image_reference for p in listing.photos]
    db.delete(listing)
    db.commit()

    for ref in photo_refs:
        _delete_local_photo_file(ref)

    return {"status": "deleted", "listing_id": listing_id}


# --- LISTING PHOTO UPLOAD ENDPOINTS ---
@app.post(
    "/api/listings/{listing_id}/photos",
    response_model=schemas.ListingPhotoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_listing_photo(
    listing_id: int,
    current_student: CurrentStudent,
    db: DbSession,
    file: UploadFile = File(...),
):
    listing = db.scalars(
        select(Listing)
        .options(selectinload(Listing.photos))
        .where(Listing.listing_id == listing_id)
    ).unique().first()

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.seller_id != current_student.student_id:
        raise HTTPException(
            status_code=403, detail="You can only upload photos to your own listings."
        )
    if len(listing.photos) >= MAX_PHOTOS_PER_LISTING:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_PHOTOS_PER_LISTING} photos allowed per listing.",
        )

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format. Use JPG, PNG, WEBP, or GIF.",
        )
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Image exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit.",
        )

    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_filename = f"listing_{listing_id}_{uuid.uuid4().hex}{ext}"
    target_path = settings.UPLOAD_DIR / safe_filename
    target_path.write_bytes(content)

    next_pos = max((p.position for p in listing.photos), default=0) + 1
    photo = ListingPhoto(
        listing_id=listing_id,
        image_reference=f"/api/uploads/{safe_filename}",
        position=next_pos,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@app.delete("/api/listings/{listing_id}/photos/{photo_id}")
def delete_listing_photo(
    listing_id: int,
    photo_id: int,
    current_student: CurrentStudent,
    db: DbSession,
):
    listing = db.get(Listing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.seller_id != current_student.student_id:
        raise HTTPException(
            status_code=403, detail="You can only modify photos on your own listings."
        )

    photo = db.get(ListingPhoto, photo_id)
    if not photo or photo.listing_id != listing_id:
        raise HTTPException(status_code=404, detail="Photo not found.")

    ref = photo.image_reference
    db.delete(photo)
    db.commit()
    _delete_local_photo_file(ref)
    return {"status": "deleted", "photo_id": photo_id}


# --- FAVORITES ENDPOINTS ---
@app.get("/api/favorites", response_model=list[schemas.ListingResponse])
def get_favorites(current_student: CurrentStudent, db: DbSession):
    stmt = (
        select(Listing)
        .join(Favorite, Favorite.listing_id == Listing.listing_id)
        .options(
            joinedload(Listing.seller),
            joinedload(Listing.category),
            selectinload(Listing.photos),
        )
        .where(
            Favorite.student_id == current_student.student_id,
            Listing.status == "Active",
        )
        .order_by(Favorite.created_at.desc())
    )
    listings = db.scalars(stmt).unique().all()
    fav_ids = {item.listing_id for item in listings}
    return [_serialize_listing(item, fav_ids) for item in listings]


@app.post("/api/favorites/{listing_id}", response_model=schemas.FavoriteToggleResponse)
def add_favorite(
    listing_id: int,
    current_student: CurrentStudent,
    db: DbSession,
):
    listing = db.get(Listing, listing_id)
    if not listing or listing.status != "Active":
        raise HTTPException(status_code=404, detail="Listing not found.")

    existing = db.scalar(
        select(Favorite).where(
            Favorite.student_id == current_student.student_id,
            Favorite.listing_id == listing_id,
        )
    )
    if not existing:
        db.add(Favorite(student_id=current_student.student_id, listing_id=listing_id))
        db.commit()

    return schemas.FavoriteToggleResponse(listing_id=listing_id, is_favorited=True)


@app.delete("/api/favorites/{listing_id}", response_model=schemas.FavoriteToggleResponse)
def remove_favorite(
    listing_id: int,
    current_student: CurrentStudent,
    db: DbSession,
):
    existing = db.scalar(
        select(Favorite).where(
            Favorite.student_id == current_student.student_id,
            Favorite.listing_id == listing_id,
        )
    )
    if existing:
        db.delete(existing)
        db.commit()

    return schemas.FavoriteToggleResponse(listing_id=listing_id, is_favorited=False)


# --- REPORT ENDPOINTS ---
@app.post(
    "/api/listings/{listing_id}/reports",
    response_model=schemas.ListingReportResponse,
    status_code=status.HTTP_201_CREATED,
)
def report_listing(
    listing_id: int,
    payload: schemas.ListingReportCreate,
    current_student: CurrentStudent,
    db: DbSession,
):
    listing = db.get(Listing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.seller_id == current_student.student_id:
        raise HTTPException(status_code=400, detail="You cannot report your own listing.")

    existing_open = db.scalar(
        select(ListingReport).where(
            ListingReport.listing_id == listing_id,
            ListingReport.reporter_id == current_student.student_id,
            ListingReport.status == "Open",
        )
    )
    if existing_open:
        raise HTTPException(
            status_code=409,
            detail="You have already submitted an open report for this listing.",
        )

    report = ListingReport(
        listing_id=listing_id,
        reporter_id=current_student.student_id,
        reason=payload.reason.strip(),
        details=payload.details.strip() if payload.details else None,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@app.get("/api/reports/my", response_model=list[schemas.ListingReportResponse])
def get_my_reports(current_student: CurrentStudent, db: DbSession):
    return db.scalars(
        select(ListingReport)
        .where(ListingReport.reporter_id == current_student.student_id)
        .order_by(ListingReport.created_at.desc())
    ).all()


# Keep this last so API endpoints take precedence over React client-side routes.
if settings.FRONTEND_DIST:
    app.mount("/", SPAStaticFiles(directory=settings.FRONTEND_DIST, html=True))
