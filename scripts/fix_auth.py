#!/usr/bin/env python3
"""
Fix Supabase Auth - Confirm email for test user
"""

import requests
import json

SUPABASE_URL = "https://vfxezndvkaxlimthkeyx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmeGV6bmR2a2F4bGltdGhrZXl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2NzE4MSwiZXhwIjoyMDkxOTQzMTgxfQ.-jz2hvvZ5obqegQP8W3GzpEPvQuU1hAO91Tp5jQ1Z0I"

def get_headers():
    return {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
    }

def confirm_email(email: str):
    """Confirm email for a user"""
    print(f"\n📋 Confirming email for {email}...")
    
    try:
        # First, get the user by email
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/admin/users?email={email}",
            headers=get_headers(),
            timeout=10
        )
        
        print(f"Get user response: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Error getting user: {response.text}")
            return False
        
        data = response.json()
        users = data.get('users', []) if isinstance(data, dict) else data
        
        if not users:
            print(f"No user found with email {email}")
            return False
        
        user = users[0]
        user_id = user.get('id')
        print(f"Found user: {user_id}")
        print(f"Email verified: {user.get('user_metadata', {}).get('email_verified', False)}")
        
        # Now update the user to confirm email
        update_response = requests.put(
            f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            headers=get_headers(),
            json={"email_confirm": True},
            timeout=10
        )
        
        print(f"Update user response: {update_response.status_code}")
        print(f"Response: {update_response.text}")
        
        if update_response.status_code == 200:
            print(f"Email confirmed for {email}")
            return True
        else:
            print(f"Failed to confirm email")
            return False
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_sign_in(email: str, password: str):
    """Test sign in after confirming email"""
    print(f"\n📋 Testing sign in with {email}...")
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers=get_headers(),
            json={"email": email, "password": password},
            timeout=10
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Sign in successful!")
            print(f"   User ID: {data.get('user', {}).get('id')}")
            print(f"   Email: {data.get('user', {}).get('email')}")
            print(f"   Access Token: {data.get('access_token', '')[:50]}...")
            return True
        else:
            print(f"Sign in failed")
            return False
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("FIXING SUPABASE AUTH")
    print("=" * 60)
    
    # Confirm email
    confirm_email("test@rtrader.com")
    
    # Test sign in
    test_sign_in("test@rtrader.com", "TestPassword123!")
    
    print("\n" + "=" * 60)
    print("Auth fix complete!")
    print("=" * 60)
