#!/usr/bin/env python3
"""
Supabase Debug Script
Provides direct access to Supabase API for authentication and database debugging
"""

import requests
import json
import sys
from typing import Any, Dict, Optional

# Supabase credentials
SUPABASE_URL = "https://vfxezndvkaxlimthkeyx.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmeGV6bmR2a2F4bGltdGhrZXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjcxODEsImV4cCI6MjA5MTk0MzE4MX0.Kt0v47bv258m-pOMymSY2PZeVxw7WI5yItE6wdxddCE"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmeGV6bmR2a2F4bGltdGhrZXl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2NzE4MSwiZXhwIjoyMDkxOTQzMTgxfQ.-jz2hvvZ5obqegQP8W3GzpEPvQuU1hAO91Tp5jQ1Z0I"

class SupabaseDebugger:
    def __init__(self, url: str, anon_key: str, service_role_key: str):
        self.url = url
        self.anon_key = anon_key
        self.service_role_key = service_role_key
        self.session = requests.Session()
    
    def _get_headers(self, use_service_role: bool = False) -> Dict[str, str]:
        """Get headers for Supabase API requests"""
        key = self.service_role_key if use_service_role else self.anon_key
        return {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "apikey": key,
        }
    
    def check_auth_status(self) -> Dict[str, Any]:
        """Check if Supabase Auth is working"""
        print("\n📋 Checking Supabase Auth Status...")
        
        try:
            response = self.session.get(
                f"{self.url}/auth/v1/",
                headers=self._get_headers(use_service_role=True),
                timeout=10
            )
            
            if response.status_code == 200:
                print("✅ Supabase Auth is accessible")
                return {"status": "ok", "code": response.status_code}
            else:
                print(f"⚠️ Auth returned status {response.status_code}")
                print(f"Response: {response.text}")
                return {"status": "error", "code": response.status_code, "text": response.text}
        except Exception as e:
            print(f"❌ Error checking auth: {e}")
            return {"status": "error", "error": str(e)}
    
    def test_sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """Test sign in with email and password"""
        print(f"\n📋 Testing sign in with {email}...")
        
        try:
            response = self.session.post(
                f"{self.url}/auth/v1/token?grant_type=password",
                headers=self._get_headers(),
                json={"email": email, "password": password},
                timeout=10
            )
            
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Sign in successful!")
                print(f"   User ID: {data.get('user', {}).get('id')}")
                print(f"   Email: {data.get('user', {}).get('email')}")
                return {"status": "ok", "data": data}
            else:
                print(f"❌ Sign in failed with status {response.status_code}")
                return {"status": "error", "code": response.status_code, "text": response.text}
        except Exception as e:
            print(f"❌ Error during sign in: {e}")
            return {"status": "error", "error": str(e)}
    
    def check_users_table(self) -> Dict[str, Any]:
        """Check if users table exists and has data"""
        print("\n📋 Checking users table...")
        
        try:
            response = self.session.get(
                f"{self.url}/rest/v1/auth.users?select=*",
                headers=self._get_headers(use_service_role=True),
                timeout=10
            )
            
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Users table accessible")
                print(f"   Total users: {len(data)}")
                for user in data:
                    print(f"   - {user.get('email')} (ID: {user.get('id')})")
                return {"status": "ok", "count": len(data), "users": data}
            else:
                print(f"⚠️ Could not access users table: {response.status_code}")
                print(f"Response: {response.text}")
                return {"status": "error", "code": response.status_code}
        except Exception as e:
            print(f"❌ Error checking users table: {e}")
            return {"status": "error", "error": str(e)}
    
    def list_tables(self) -> Dict[str, Any]:
        """List all tables in the database"""
        print("\n📋 Listing database tables...")
        
        try:
            response = self.session.get(
                f"{self.url}/rest/v1/information_schema.tables?select=table_name&table_schema=public",
                headers=self._get_headers(use_service_role=True),
                timeout=10
            )
            
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Found {len(data)} tables:")
                for table in data:
                    print(f"   - {table.get('table_name')}")
                return {"status": "ok", "tables": data}
            else:
                print(f"⚠️ Could not list tables: {response.status_code}")
                print(f"Response: {response.text}")
                return {"status": "error", "code": response.status_code}
        except Exception as e:
            print(f"❌ Error listing tables: {e}")
            return {"status": "error", "error": str(e)}
    
    def run_diagnostics(self):
        """Run full diagnostics"""
        print("=" * 60)
        print("🔍 SUPABASE DIAGNOSTICS")
        print("=" * 60)
        
        auth_status = self.check_auth_status()
        tables = self.list_tables()
        users = self.check_users_table()
        sign_in = self.test_sign_in("test@rtrader.com", "TestPassword123!")
        
        print("\n" + "=" * 60)
        print("📊 DIAGNOSTICS SUMMARY")
        print("=" * 60)
        print(f"Auth Status: {auth_status.get('status')}")
        print(f"Tables Found: {len(tables.get('tables', []))}")
        print(f"Users in DB: {users.get('count', 0)}")
        print(f"Sign In Test: {sign_in.get('status')}")
        print("=" * 60)

if __name__ == "__main__":
    debugger = SupabaseDebugger(SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
    debugger.run_diagnostics()
