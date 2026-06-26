import logging
from functools import wraps
from cachetools import TTLCache, LRUCache

logger = logging.getLogger(__name__)

template_cache = TTLCache(maxsize=50, ttl=300)
job_recommendation_cache = TTLCache(maxsize=100, ttl=600)
analysis_cache = TTLCache(maxsize=50, ttl=300)
prices_cache = LRUCache(maxsize=1)


def cached(cache: TTLCache | LRUCache, key_prefix: str = ""):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}:{args}:{kwargs}"
            if cache_key in cache:
                logger.debug("Cache hit for %s", cache_key)
                return cache[cache_key]
            result = func(*args, **kwargs)
            cache[cache_key] = result
            return result
        return wrapper
    return decorator


def invalidate_template_cache():
    template_cache.clear()
    logger.debug("Template cache cleared")


def invalidate_job_cache():
    job_recommendation_cache.clear()
    logger.debug("Job recommendation cache cleared")
