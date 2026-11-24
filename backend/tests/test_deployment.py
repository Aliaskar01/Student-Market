from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.config import normalize_database_url
from app.frontend import SPAStaticFiles
from app.main import lifespan


@pytest.mark.parametrize("prefix", ["postgres://", "postgresql://"])
def test_render_database_url_uses_psycopg(prefix):
    assert normalize_database_url(prefix + "user:pass@host/db?sslmode=require") == (
        "postgresql+psycopg://user:pass@host/db?sslmode=require"
    )


@pytest.mark.parametrize("url", ["sqlite:///:memory:", "postgresql+psycopg://host/db"])
def test_explicit_driver_is_preserved(url):
    assert normalize_database_url(url) == url


def test_spa_deep_links_and_missing_resources(tmp_path):
    (tmp_path / "index.html").write_text("<html>Student Market</html>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("console.log('market')")
    app = FastAPI()
    app.mount("/", SPAStaticFiles(directory=tmp_path, html=True))
    with TestClient(app) as client:
        for path in ("/", "/login", "/listing/123", "/profile"):
            response = client.get(path)
            assert response.status_code == 200
            assert "<html>Student Market</html>" == response.text
        assert client.get("/assets/app.js").status_code == 200
        for path in ("/api", "/api/missing", "/assets/missing.js", "/missing.png"):
            assert client.get(path).status_code == 404


def test_database_failure_stops_startup():
    app = FastAPI(lifespan=lifespan)
    failure = OperationalError("connect", {}, Exception("unavailable"))
    with patch("app.main.init_database", side_effect=failure) as initialize:
        with patch("app.main.time.sleep"):
            with pytest.raises(OperationalError):
                with TestClient(app):
                    pass
    assert initialize.call_count == 5
