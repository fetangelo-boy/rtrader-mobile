#!/usr/bin/env python3
"""
Setup test user and seed data in Supabase
"""
import os
import sys
import json
import subprocess
from pathlib import Path

# Supabase credentials
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

TEST_EMAIL = "test@rtrader.com"
TEST_PASSWORD = "TestPassword123!"

def create_test_user():
    """Create test user via Supabase Auth using curl"""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("❌ Missing Supabase credentials")
        return None
    
    # Try to create user via Auth API
    cmd = [
        "curl", "-X", "POST",
        f"{SUPABASE_URL}/auth/v1/signup",
        "-H", "Content-Type: application/json",
        "-H", f"apikey: {SUPABASE_ANON_KEY}",
        "-d", json.dumps({
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        response = json.loads(result.stdout)
        
        if "user" in response:
            user_id = response["user"]["id"]
            print(f"✅ Test user created: {TEST_EMAIL}")
            print(f"   User ID: {user_id}")
            return user_id
        elif "error_code" in response and response["error_code"] == "user_already_exists":
            print(f"⚠️  Test user already exists: {TEST_EMAIL}")
            # Try to get user ID via sign in
            return get_user_id_from_signin()
        else:
            print(f"❌ Error creating user: {response}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def get_user_id_from_signin():
    """Get user ID by signing in"""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return None
    
    cmd = [
        "curl", "-X", "POST",
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        "-H", "Content-Type: application/json",
        "-H", f"apikey: {SUPABASE_ANON_KEY}",
        "-d", json.dumps({
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        response = json.loads(result.stdout)
        
        if "user" in response:
            return response["user"]["id"]
        else:
            print(f"⚠️  Could not get user ID: {response}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def seed_test_data(user_id):
    """Seed test data in Supabase using SQL"""
    if not user_id:
        print("❌ No user ID provided")
        return False
    
    # Read seed.sql and replace placeholder
    seed_file = Path(__file__).parent.parent / "supabase" / "seed.sql"
    if not seed_file.exists():
        print(f"❌ Seed file not found: {seed_file}")
        return False
    
    with open(seed_file, "r") as f:
        seed_sql = f.read()
    
    # Replace placeholder with actual user ID
    seed_sql = seed_sql.replace("test-user-uuid-placeholder", user_id)
    
    # Use Supabase CLI to execute SQL
    # First, try using psql if available
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
            result = subprocess.run(
                ["psql", db_url, "-f", "-"],
                input=seed_sql,
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                print("✅ Test data seeded successfully")
                return True
            else:
                print(f"⚠️  psql error: {result.stderr}")
                return False
        except Exception as e:
            print(f"⚠️  Could not use psql: {e}")
    
    # Fallback: use Supabase CLI
    try:
        # Save modified seed to temp file
        temp_seed = "/tmp/seed_test.sql"
        with open(temp_seed, "w") as f:
            f.write(seed_sql)
        
        # Use Supabase CLI to push SQL
        result = subprocess.run(
            ["npx", "supabase", "db", "push", "--dry-run"],
            cwd=str(Path(__file__).parent.parent),
            capture_output=True,
            text=True,
            timeout=30
        )
        print(f"⚠️  Manual SQL execution needed. Use Supabase Dashboard or:")
        print(f"   psql {db_url} < {temp_seed}")
        return False
    except Exception as e:
        print(f"⚠️  Could not execute seed: {e}")
        return False

def main():
    print("🚀 Setting up test user and data...")
    print(f"   Supabase URL: {SUPABASE_URL}")
    print()
    
    # Create test user
    user_id = create_test_user()
    if not user_id:
        print("❌ Failed to create test user")
        sys.exit(1)
    
    print()
    
    # Seed test data
    if seed_test_data(user_id):
        print()
        print("✅ Test setup complete!")
        print(f"   Email: {TEST_EMAIL}")
        print(f"   Password: {TEST_PASSWORD}")
        print(f"   User ID: {user_id}")
    else:
        print()
        print("⚠️  Test user created, but data seeding needs manual setup")
        print(f"   Email: {TEST_EMAIL}")
        print(f"   Password: {TEST_PASSWORD}")
        print(f"   User ID: {user_id}")
        print()
        print("   To seed data manually:")
        print(f"   1. Replace 'test-user-uuid-placeholder' with '{user_id}' in supabase/seed.sql")
        print(f"   2. Run: psql <DATABASE_URL> < supabase/seed.sql")

if __name__ == "__main__":
    main()
