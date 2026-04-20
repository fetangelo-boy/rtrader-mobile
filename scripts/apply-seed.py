#!/usr/bin/env python3
"""
Apply seed SQL to Supabase database
"""
import os
import sys

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2...")
    os.system("pip install psycopg2-binary")
    import psycopg2

# Database connection string
DB_URL = "postgresql://postgres:YOUR_PASSWORD@db.vfxezndvkaxlimthkeyx.supabase.co:5432/postgres"

def apply_seed():
    """Apply seed SQL to database"""
    seed_file = "/home/ubuntu/rtrader-mobile/supabase/seed.sql"
    
    if not os.path.exists(seed_file):
        print(f"❌ Seed file not found: {seed_file}")
        return False
    
    with open(seed_file, "r") as f:
        seed_sql = f.read()
    
    try:
        # Connect to database
        conn = psycopg2.connect(DB_URL, sslmode="require")
        cursor = conn.cursor()
        
        # Execute seed SQL
        cursor.execute(seed_sql)
        conn.commit()
        
        print("✅ Seed data applied successfully!")
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Error applying seed: {e}")
        return False

if __name__ == "__main__":
    if not apply_seed():
        sys.exit(1)
