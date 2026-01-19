"""
Database connection and session management.

This module handles the SQLAlchemy database connection, including:
- Connection pooling configuration
- Error handling and logging
- Session management
- Connection verification
"""
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import SQLAlchemyError
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Connection arguments
engine_connect_args: dict = {}

# Supabase requires SSL mode
if settings.DATABASE_SSL_MODE:
    engine_connect_args["sslmode"] = settings.DATABASE_SSL_MODE

# Engine configuration with pooling
# Requirement 3: Connection pooling for optimal performance
engine_kwargs: dict = {
    "poolclass": QueuePool,
    "pool_size": 5,        # Baseline number of connections to keep open
    "max_overflow": 10,    # Max extra connections to create during spikes
    "pool_pre_ping": True, # Verify connections before using (health check)
    "pool_recycle": 3600,  # Recycle connections every hour
    "echo": settings.DEBUG,
}

if engine_connect_args:
    engine_kwargs["connect_args"] = engine_connect_args

# Create database engine
try:
    engine = create_engine(
        settings.DATABASE_URL,
        **engine_kwargs,
    )
    logger.info("Database engine created successfully")
except Exception as e:
    # Requirement 4 & 5: Error handling and logging
    logger.critical(f"Failed to create database engine: {str(e)}")
    raise

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency that provides a database session.
    Automatically closes the session after the request.
    
    Yields:
        Session: SQLAlchemy database session
        
    Raises:
        SQLAlchemyError: If database connection fails
    """
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        logger.error(f"Database session error: {str(e)}")
        raise
    finally:
        db.close()


def check_db_connection():
    """
    Verify database connection by executing a simple query.
    
    Requirement 6: Verify connection works
    
    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            logger.info("Database connection verified successfully")
            return True
    except Exception as e:
        logger.error(f"Database connection check failed: {str(e)}")
        return False
