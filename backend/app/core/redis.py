from typing import Optional
from fastapi import FastAPI, Request, Response
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.backends.inmemory import InMemoryBackend
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
    Falls back to InMemoryBackend if Redis is unavailable.
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
        
        # Verify connection
        await redis_client.ping()
        
        FastAPICache.init(RedisBackend(redis_client), prefix="fastapi-cache", coder=PickleCoder)
        logger.info("Redis cache initialized successfully")
        
    except Exception as e:
        logger.warning(f"Failed to connect to Redis: {e}. Falling back to InMemoryBackend.")
        # Fallback to in-memory cache
        FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache", coder=PickleCoder)
        logger.info("InMemory cache initialized as fallback")

async def invalidate_cache(namespace: str):
    """
    Invalidate all cache keys with the given namespace/prefix.
    Supports RedisBackend and InMemoryBackend.
    """
    try:
        backend = FastAPICache.get_backend()
        
        # RedisBackend
        if hasattr(backend, "redis"):
            redis = backend.redis
            # FastAPICache prefix is "fastapi-cache"
            full_pattern = f"fastapi-cache:{namespace}*"
            keys = await redis.keys(full_pattern)
            if keys:
                await redis.delete(*keys)
                logger.info(f"Invalidated {len(keys)} keys for namespace {namespace}")
                
        # InMemoryBackend
        elif hasattr(backend, "_store"):
            # Keys in _store include the prefix
            prefix = f"fastapi-cache:{namespace}"
            keys_to_delete = [k for k in backend._store.keys() if k.startswith(prefix)]
            for k in keys_to_delete:
                del backend._store[k]
            if keys_to_delete:
                logger.info(f"Invalidated {len(keys_to_delete)} keys for namespace {namespace} (InMemory)")
        
        else:
            logger.warning(f"Backend {type(backend).__name__} does not support namespace invalidation")
            
    except Exception as e:
        logger.error(f"Failed to invalidate cache for {namespace}: {e}")
