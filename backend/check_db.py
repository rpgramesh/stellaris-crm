"""
Script to verify Supabase connections.

This script tests:
1. SQLAlchemy connection (Relational Database)
2. Supabase Client connection (Auth/Storage/Realtime)
"""
import sys
import os
import logging

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.core.database import check_db_connection
from app.core.supabase import SupabaseManager
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    print("\n--- Supabase Connection Verification ---\n")
    
    # 1. Test SQLAlchemy Connection (Postgres Direct)
    print("1. Testing SQLAlchemy Connection (Database)...")
    if "YOUR-PASSWORD" in settings.DATABASE_URL:
        print("❌ SKIPPING: Password placeholder still present in .env")
        print("   Action: Update DATABASE_URL in backend/.env with your actual password.")
    else:
        if check_db_connection():
            print("✅ Database connection successful!")
        else:
            print("❌ Database connection failed.")
            
    print("\n----------------------------------------\n")

    # 2. Test Supabase Client Connection (API)
    print("2. Testing Supabase Official Client (API)...")
    if "YOUR-SUPABASE-ANON-KEY" in str(settings.SUPABASE_KEY):
        print("❌ SKIPPING: API Key placeholder still present in .env")
        print("   Action: Update SUPABASE_KEY in backend/.env with your Anon public key.")
    else:
        try:
            client = SupabaseManager.get_client()
            if client:
                # Simple health check via auth endpoint (doesn't require login)
                # Just checking if we can initialize and make a basic call
                settings_check = client.auth.get_session()
                print("✅ Supabase Client initialized successfully!")
                print(f"   URL: {settings.SUPABASE_URL}")
            else:
                print("❌ Supabase Client failed to initialize.")
        except Exception as e:
            print(f"❌ Supabase Client error: {str(e)}")

    print("\n----------------------------------------\n")

if __name__ == "__main__":
    main()
