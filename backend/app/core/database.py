"""
Database connection and session management.
"""
import logging
import socket
import re
from urllib.parse import urlparse, urlunparse
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

# Hack: Resolve hostname to IPv4 to avoid Vercel IPv6 issues
db_url = settings.DATABASE_URL

# Fix for Vercel IPv6 issue: Use Supavisor Regional Pooler (IPv4)
# The direct connection (db.project.supabase.co) only resolves to IPv6 in Vercel, which fails.
# We switch to the regional pooler which supports IPv4.
# NOTE: Users should provide the Transaction Mode (Port 6543) connection string directly in DATABASE_URL.
# This code block is kept for backward compatibility with Direct URLs but is risky if region differs.
import os
match = re.search(r"db\.([a-z0-9]+)\.supabase\.co", db_url)
if match and os.environ.get("VERCEL"):
    project_ref = match.group(1)
    # Default to direct URL if no pooler info is available
    # We removed the hardcoded region rewrite because it breaks if the project is not in ap-south-1
    # Users MUST provide the correct pooler URL in DATABASE_URL environment variable
    logger.warning("Detected Vercel environment with Direct Connection URL. This may fail due to IPv6 issues.")
    logger.warning("Please update DATABASE_URL to use the Supabase Connection Pooler (Transaction Mode, Port 6543).")

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
        db_url,
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
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            logger.info("Database connection verified successfully")
            return True, None
    except Exception as e:
        error_msg = str(e)
        try:
            # Add debug info for Vercel troubleshooting
            from urllib.parse import urlparse
            safe_url = engine.url.render_as_string(hide_password=True)
            parsed = urlparse(safe_url)
            hostname = parsed.hostname
            
            # Resolve hostname to check what Vercel sees
            import socket
            ip_debug = "Resolution failed"
            try:
                # Try IPv4 first
                ipv4 = socket.gethostbyname(hostname)
                ip_debug = f"IPv4: {ipv4}"
            except Exception:
                # Try IPv6
                try:
                    addr_info = socket.getaddrinfo(hostname, 5432, socket.AF_INET6)
                    ip_debug = f"IPv6: {[a[4][0] for a in addr_info]}"
                except Exception as e6:
                    ip_debug = f"Resolution Error: {str(e6)}"
            
            error_msg += f" | DB_URL_HOST: {hostname} | DNS: {ip_debug}"
        except Exception as debug_e:
            error_msg += f" | Debug Error: {str(debug_e)}"
            
        logger.error(f"Database connection check failed: {error_msg}")
        return False, error_msg
