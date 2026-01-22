from fastapi import APIRouter, Depends, HTTPException, status
from app.core.redis import redis_client
from app.api.dependencies import RoleChecker
from app.models.user import User

router = APIRouter(prefix="/monitoring", tags=["System Monitoring"])

@router.get("/redis/stats")
async def get_redis_stats(
    current_user: User = Depends(RoleChecker(["admin"]))
):
    """
    Get Redis cache statistics.
    Permissions: admin only
    """
    if not redis_client:
        return {"status": "disabled", "details": "Redis client not initialized"}
        
    try:
        info = await redis_client.info()
        # Filter relevant stats
        stats = {
            "status": "connected",
            "used_memory_human": info.get("used_memory_human"),
            "connected_clients": info.get("connected_clients"),
            "uptime_in_seconds": info.get("uptime_in_seconds"),
            "hits": info.get("keyspace_hits"),
            "misses": info.get("keyspace_misses"),
            "keys": await redis_client.dbsize()
        }
        
        # Calculate hit ratio
        total_ops = stats["hits"] + stats["misses"]
        if total_ops > 0:
            stats["hit_ratio"] = f"{(stats['hits'] / total_ops) * 100:.2f}%"
        else:
            stats["hit_ratio"] = "0%"
            
        return stats
    except Exception as e:
        return {"status": "error", "details": str(e)}

@router.post("/redis/clear")
async def clear_redis_cache(
    current_user: User = Depends(RoleChecker(["admin"]))
):
    """
    Clear all Redis cache.
    Permissions: admin only
    """
    if not redis_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis is not enabled"
        )
        
    try:
        await redis_client.flushdb()
        return {"message": "Cache cleared successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
