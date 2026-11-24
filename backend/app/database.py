from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Yield a SQLAlchemy database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema_updates(target_engine) -> None:
    """Safely add any missing columns/indexes on pre-existing tables without dropping data."""
    inspector = inspect(target_engine)
    dialect = target_engine.dialect.name

    column_upgrades: dict[str, dict[str, str]] = {
        "student": {
            "telegram_handle": "VARCHAR(100)",
            "phone_number": "VARCHAR(50)",
            "auth_provider": "VARCHAR(50) NOT NULL DEFAULT 'local'",
            "external_subject_id": "VARCHAR(255)",
            "role": "VARCHAR(30) NOT NULL DEFAULT 'student'",
            "is_active": "BOOLEAN NOT NULL DEFAULT TRUE",
            "created_at": "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
            if dialect == "postgresql"
            else "DATETIME",
            "updated_at": "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
            if dialect == "postgresql"
            else "DATETIME",
        },
        "category": {
            "slug": "VARCHAR(100)",
        },
    }

    with target_engine.begin() as conn:
        existing_tables = set(inspector.get_table_names())
        for table_name, columns in column_upgrades.items():
            if table_name not in existing_tables:
                continue
            existing_cols = {col["name"] for col in inspector.get_columns(table_name)}
            for col_name, col_ddl in columns.items():
                if col_name not in existing_cols:
                    conn.execute(
                        text(f'ALTER TABLE "{table_name}" ADD COLUMN "{col_name}" {col_ddl}')
                    )

        # Ensure password_hash can be NULL in Postgres when Keycloak users register later
        if dialect == "postgresql" and "student" in existing_tables:
            student_cols = {col["name"]: col for col in inspector.get_columns("student")}
            pwd_col = student_cols.get("password_hash")
            if pwd_col and not pwd_col.get("nullable", True):
                conn.execute(
                    text('ALTER TABLE "student" ALTER COLUMN "password_hash" DROP NOT NULL')
                )

        # Ensure unique index on student.external_subject_id when upgrading existing DB
        if "student" in existing_tables:
            existing_indexes = {idx["name"] for idx in inspector.get_indexes("student")}
            if "ix_student_external_subject_id" not in existing_indexes:
                conn.execute(
                    text(
                        'CREATE UNIQUE INDEX IF NOT EXISTS ix_student_external_subject_id '
                        'ON "student" ("external_subject_id")'
                    )
                )
