from typing import Optional
from fastapi import FastAPI, Request, Response
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.coder import PickleCoder
from redis import asyncio as aioredis
from app.core.config import settings
import logging
import hashlib
import json

logger = logging.getLogger(__name__)

# Global Redis client
redis_client: Optional[aioredis.Redis] = None

def cache_key_builder(
    func,
    namespace: Optional[str] = "",
    request: Optional[Request] = None,
    response: Optional[Response] = None,
    *args,
    **kwargs,
):
    """
    Custom key builder that excludes 'db' session and other non-serializable objects.
    """
    prefix = FastAPICache.get_prefix()
    cache_key = f"{prefix}:{namespace}:{func.__module__}:{func.__name__}"
    
    # Process args and kwargs to create a stable key
    # We explicitly exclude 'db' and 'response' and 'request'
    # We assume 'current_user' should be part of key if present (for RBAC)
    
    filtered_kwargs = {}
    for key, value in kwargs.items():
        if key in ['db', 'request', 'response', 'background_tasks']:
            continue
        # For SQLAlchemy models (like User), we try to use their ID or specific string repr
        if hasattr(value, "id"):
            filtered_kwargs[key] = str(value.id)
        elif hasattr(value, "model_dump"): # Pydantic v2
             filtered_kwargs[key] = value.model_dump()
        elif hasattr(value, "dict"): # Pydantic v1
             filtered_kwargs[key] = value.dict()
        else:
            filtered_kwargs[key] = str(value)

    # Add args to key
    args_str = ":".join([str(arg) for arg in args])
    
    # Add filtered kwargs to key
    # Sort keys for stability
    kwargs_str = ":".join([f"{k}={v}" for k, v in sorted(filtered_kwargs.items())])
    
    combined = f"{args_str}:{kwargs_str}"
    hashed = hashlib.md5(combined.encode()).hexdigest()
    
    return f"{cache_key}:{hashed}"

async def init_redis(app: FastAPI) -> None:
    """
    Initialize Redis connection and FastAPI Cache.
    """
    global redis_client
    try:
        logger.info(f"Connecting to Redis at {settings.REDIS_URL}")
        redis_client = aioredis.from_url(
            settings.REDIS_URL, 
            encoding="utf8", 
            decode_responses=False,
            socket_connect_timeout=5,
            socket_timeout=5
        )
        FastAPICache.init(RedisBackend(redis_client), prefix="fastapi-cache", coder=PickleCoder)
        logger.info("Redis cache initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Redis: {e}")
        # We don't raise here to allow app to start without cache if needed (fallback behavior)
        # However, decorators might fail if not initialized. 
        # Ideally, we should have a fallback backend or handle it.
        # For now, we log the error.

async def invalidate_cache(namespace: str):
    """
    Invalidate all cache keys with the given namespace/prefix.
    Note: fastapi-cache2 doesn't support namespace invalidation out of the box easily 
    without custom key builders or using the redis client directly to scan keys.
    """
    try:
        redis = FastAPICache.get_backend().redis
        # Scan for keys with the prefix
        # This is a bit expensive but necessary for pattern matching
        # FastAPICache prefix is "fastapi-cache"
        full_pattern = f"fastapi-cache:{namespace}*"
        keys = await redis.keys(full_pattern)
        if keys:
            await redis.delete(*keys)
            logger.info(f"Invalidated {len(keys)} keys for namespace {namespace}")
    except Exception as e:
        logger.error(f"Failed to invalidate cache for {namespace}: {e}")
