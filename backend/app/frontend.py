from pathlib import Path

from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles


class SPAStaticFiles(StaticFiles):
    """Serve React routes while retaining real 404s for API calls and assets."""

    async def get_response(self, path, scope):
        normalized_path = path.replace("\\", "/")
        if normalized_path == "api" or normalized_path.startswith("api/"):
            raise HTTPException(status_code=404)
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404 or Path(path).suffix:
                raise
            return await super().get_response("index.html", scope)
