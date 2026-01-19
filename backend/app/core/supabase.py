"""
Supabase Client Configuration.

This module initializes the official Supabase client for use in the application.
It provides a singleton instance of the client that can be imported and used
throughout the backend.

Requirements implemented:
1. Official Supabase client library usage
2. Environment variable configuration
"""
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings
import logging

# Configure logging
logger = logging.getLogger(__name__)

class SupabaseManager:
    """
    Manager class for Supabase client connection.
    Singleton pattern to ensure only one client instance is created.
    """
    _instance: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        """
        Get or create the Supabase client instance.
        
        Returns:
            Client: The initialized Supabase client.
            
        Raises:
            ValueError: If SUPABASE_URL or SUPABASE_KEY are not set.
        """
        if cls._instance is None:
            try:
                if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
                    logger.warning("Supabase credentials not found. Client will not be initialized.")
                    return None
                
                cls._instance = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_KEY
                )
                logger.info("Supabase client initialized successfully")
                
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {str(e)}")
                raise

        return cls._instance

# Create a global instance
try:
    supabase: Optional[Client] = SupabaseManager.get_client()
except Exception:
    supabase = None
