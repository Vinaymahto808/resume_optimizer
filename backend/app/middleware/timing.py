import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)


class RequestTimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration = time.time() - start
        logger.info("%s %s completed in %.3fs", request.method, request.url.path, duration)
        response.headers["X-Response-Time"] = f"{duration:.3f}s"
        return response
