import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": {
                        "code": str(exc.status_code),
                        "message": exc.detail,
                    }
                },
            )
        except Exception as exc:
            logger.exception("Unhandled error on %s %s", request.method, request.url.path)
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "500",
                        "message": "Internal server error",
                    }
                },
            )
