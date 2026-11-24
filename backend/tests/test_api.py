import io
import os
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.config import settings
from app.database import ensure_schema_updates, get_db
from app.main import app, seed_default_categories
from app.models import Base


@pytest.fixture()
def client(tmp_path):
    db_file = tmp_path / "test_market.db"
    test_engine = create_engine(
        f"sqlite:///{db_file}", connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )

    Base.metadata.create_all(bind=test_engine)
    ensure_schema_updates(test_engine)
    with TestingSessionLocal() as db:
        seed_default_categories(db)

    old_upload_dir = settings.UPLOAD_DIR
    settings.UPLOAD_DIR = tmp_path / "uploads"
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.ALLOWED_EMAIL_DOMAINS = ""

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client, test_engine
    app.dependency_overrides.clear()
    settings.UPLOAD_DIR = old_upload_dir
    test_engine.dispose()


def _register_user(
    client: TestClient,
    email: str = "aibar@kbtu.kz",
    password: str = "Student123!",
    full_name: str = "Aibar Khamitov",
    university: str = "KBTU",
    telegram_handle: str = "aibar_k",
):
    return client.post(
        "/api/auth/register",
        json={
            "full_name": full_name,
            "university_email": email,
            "university": university,
            "password": password,
            "telegram_handle": telegram_handle,
            "remember_me": True,
        },
    )


def test_tables_created_and_categories_seeded(client):
    test_client, test_engine = client
    tables = set(inspect(test_engine).get_table_names())
    assert {
        "student",
        "category",
        "listing",
        "listing_photo",
        "user_session",
        "favorite",
        "listing_report",
    }.issubset(tables)

    res = test_client.get("/api/categories")
    assert res.status_code == 200
    names = [c["name"] for c in res.json()]
    assert names == ["Books", "Electronics", "Furniture", "Clothes", "Other"]


def test_registration_login_refresh_logout_and_sessions(client):
    test_client, _ = client

    # Reject weak password
    weak = _register_user(test_client, email="weak@test.com", password="short")
    assert weak.status_code == 422

    # Reject invalid email syntax
    bad_email = _register_user(test_client, email="not-an-email", password="Password1")
    assert bad_email.status_code == 400

    # Valid registration with any valid email domain
    reg = _register_user(test_client, email="aibar@gmail.com", password="Password1")
    assert reg.status_code == 201
    data = reg.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert "password_hash" not in data["user"]
    assert data["user"]["university_email"] == "aibar@gmail.com"
    assert data["user"]["telegram_handle"] == "@aibar_k"

    # Duplicate registration blocked
    dup = _register_user(test_client, email="AIBAR@gmail.com", password="Password1")
    assert dup.status_code == 409

    # Wrong password blocked
    bad_login = test_client.post(
        "/api/auth/login",
        json={"university_email": "aibar@gmail.com", "password": "WrongPassword1"},
    )
    assert bad_login.status_code == 401

    # Valid login works
    login = test_client.post(
        "/api/auth/login",
        json={"university_email": "aibar@gmail.com", "password": "Password1"},
    )
    assert login.status_code == 200
    tokens = login.json()

    # Access protected /api/auth/me
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    me = test_client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["full_name"] == "Aibar Khamitov"

    # Refresh rotates token
    ref = test_client.post(
        "/api/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert ref.status_code == 200
    rotated = ref.json()
    assert rotated["refresh_token"] != tokens["refresh_token"]

    # Old refresh token cannot be reused
    reused = test_client.post(
        "/api/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert reused.status_code == 401

    # Logout revokes session
    out = test_client.post(
        "/api/auth/logout",
        json={"refresh_token": rotated["refresh_token"]},
    )
    assert out.status_code == 200

    after_logout = test_client.post(
        "/api/auth/refresh",
        json={"refresh_token": rotated["refresh_token"]},
    )
    assert after_logout.status_code == 401


def test_configurable_email_domain_restriction(client):
    test_client, _ = client
    settings.ALLOWED_EMAIL_DOMAINS = ".edu,.edu.kz,kbtu.kz"
    blocked = _register_user(test_client, email="user@gmail.com")
    assert blocked.status_code == 400
    allowed = _register_user(test_client, email="student@kbtu.kz")
    assert allowed.status_code == 201


def test_unauthenticated_users_cannot_perform_protected_actions(client):
    test_client, _ = client

    assert test_client.get("/api/auth/me").status_code == 401
    assert test_client.get("/api/listings/my").status_code == 401
    assert test_client.get("/api/favorites").status_code == 401
    assert (
        test_client.post(
            "/api/listings",
            json={"title": "Test", "price": 1000, "category_id": 1},
        ).status_code
        == 401
    )
    assert test_client.patch("/api/listings/1", json={"title": "Hacked"}).status_code == 401
    assert test_client.delete("/api/listings/1").status_code == 401
    assert test_client.post("/api/favorites/1").status_code == 401
    assert (
        test_client.post("/api/listings/1/reports", json={"reason": "Spam"}).status_code
        == 401
    )


def test_listings_ownership_photos_favorites_reports_and_privacy(client):
    test_client, _ = client

    # Register Seller & Buyer
    seller_res = _register_user(
        test_client, email="seller@kbtu.kz", full_name="Seller One"
    ).json()
    buyer_res = _register_user(
        test_client, email="buyer@nu.edu.kz", full_name="Buyer Two"
    ).json()
    seller_headers = {"Authorization": f"Bearer {seller_res['access_token']}"}
    buyer_headers = {"Authorization": f"Bearer {buyer_res['access_token']}"}

    # Seller creates two listings
    create1 = test_client.post(
        "/api/listings",
        headers=seller_headers,
        json={
            "title": "Calculus Book",
            "description": "Clean textbook for Math 101",
            "price": 12000,
            "category_id": 1,
            "condition": "Good",
            "status": "Active",
        },
    )
    assert create1.status_code == 201
    listing1 = create1.json()
    assert listing1["seller_id"] == seller_res["user"]["student_id"]
    assert listing1["category_name"] == "Books"

    create2 = test_client.post(
        "/api/listings",
        headers=seller_headers,
        json={
            "title": "Study Lamp",
            "description": "LED desk lamp",
            "price": 5000,
            "category_id": 3,
            "condition": "New",
            "status": "Active",
        },
    )
    assert create2.status_code == 201

    # Upload photo to listing1
    fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\nfakeimagedata")
    upload = test_client.post(
        f"/api/listings/{listing1['listing_id']}/photos",
        headers=seller_headers,
        files={"file": ("book.png", fake_png, "image/png")},
    )
    assert upload.status_code == 201
    photo = upload.json()
    assert photo["image_reference"].startswith("/api/uploads/")

    # Uploaded photo is served cleanly
    img_res = test_client.get(photo["image_reference"])
    assert img_res.status_code == 200

    # Buyer cannot upload photo, edit, or delete seller's listing
    assert (
        test_client.patch(
            f"/api/listings/{listing1['listing_id']}",
            headers=buyer_headers,
            json={"price": 1},
        ).status_code
        == 403
    )
    assert (
        test_client.delete(
            f"/api/listings/{listing1['listing_id']}", headers=buyer_headers
        ).status_code
        == 403
    )

    # Guest detail hides seller contact details
    guest_detail = test_client.get(f"/api/listings/{listing1['listing_id']}").json()
    assert guest_detail["contact_requires_auth"] is True
    assert guest_detail["seller_contact"] is None
    assert guest_detail["seller"]["full_name"] == "Seller One"

    # Authenticated buyer sees seller contact details
    buyer_detail = test_client.get(
        f"/api/listings/{listing1['listing_id']}", headers=buyer_headers
    ).json()
    assert buyer_detail["contact_requires_auth"] is False
    assert buyer_detail["seller_contact"]["university_email"] == "seller@kbtu.kz"
    assert buyer_detail["seller_contact"]["telegram_handle"] == "@aibar_k"

    # Search, filter & price sorting work
    sorted_asc = test_client.get("/api/listings?sort=price_asc").json()
    assert [float(x["price"]) for x in sorted_asc] == [5000.0, 12000.0]

    filtered_search = test_client.get("/api/listings?search=Calculus&category_id=1").json()
    assert len(filtered_search) == 1
    assert filtered_search[0]["title"] == "Calculus Book"

    # Buyer favorites & reports listing1
    fav = test_client.post(
        f"/api/favorites/{listing1['listing_id']}", headers=buyer_headers
    )
    assert fav.status_code == 200
    assert fav.json()["is_favorited"] is True
    assert len(test_client.get("/api/favorites", headers=buyer_headers).json()) == 1

    rep = test_client.post(
        f"/api/listings/{listing1['listing_id']}/reports",
        headers=buyer_headers,
        json={"reason": "Misleading", "details": "Wrong edition listed"},
    )
    assert rep.status_code == 201

    # Seller cannot report own listing
    self_rep = test_client.post(
        f"/api/listings/{listing1['listing_id']}/reports",
        headers=seller_headers,
        json={"reason": "Spam"},
    )
    assert self_rep.status_code == 400

    # Seller updates & deletes own listing
    upd = test_client.patch(
        f"/api/listings/{listing1['listing_id']}",
        headers=seller_headers,
        json={"price": 11000, "status": "Sold"},
    )
    assert upd.status_code == 200
    assert float(upd.json()["price"]) == 11000.0

    # Sold listing hidden from public browse, visible in seller's /my
    assert len(test_client.get("/api/listings").json()) == 1
    assert len(test_client.get("/api/listings/my", headers=seller_headers).json()) == 2

    dele = test_client.delete(
        f"/api/listings/{listing1['listing_id']}", headers=seller_headers
    )
    assert dele.status_code == 200


def test_legacy_four_table_schema_evolves_without_data_loss(tmp_path):
    legacy_db = tmp_path / "legacy.db"
    legacy_engine = create_engine(
        f"sqlite:///{legacy_db}", connect_args={"check_same_thread": False}
    )
    with legacy_engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE student ("
                "student_id INTEGER PRIMARY KEY, "
                "full_name VARCHAR, "
                "university_email VARCHAR UNIQUE, "
                "password_hash VARCHAR, "
                "university VARCHAR)"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE category (category_id INTEGER PRIMARY KEY, name VARCHAR)"
            )
        )
        conn.execute(
            text(
                "INSERT INTO student (student_id, full_name, university_email, password_hash, university) "
                "VALUES (1, 'Legacy Student', 'legacy@uni.edu', 'hash', 'KBTU')"
            )
        )
        conn.execute(text("INSERT INTO category (category_id, name) VALUES (1, 'Books')"))

    Base.metadata.create_all(bind=legacy_engine)
    ensure_schema_updates(legacy_engine)

    tables = set(inspect(legacy_engine).get_table_names())
    assert {"user_session", "favorite", "listing_report"}.issubset(tables)
    student_cols = {c["name"] for c in inspect(legacy_engine).get_columns("student")}
    assert {"telegram_handle", "auth_provider", "external_subject_id", "is_active"}.issubset(
        student_cols
    )
    with legacy_engine.connect() as conn:
        row = conn.execute(text("SELECT full_name FROM student WHERE student_id = 1")).fetchone()
        assert row is not None and row[0] == "Legacy Student"
    legacy_engine.dispose()
