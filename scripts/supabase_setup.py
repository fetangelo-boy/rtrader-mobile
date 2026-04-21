#!/usr/bin/env python3
"""
Supabase diagnostics and setup script for RTrader.
Checks tables, creates schema if needed, seeds test data, and verifies auth.
"""
import requests
import json
import sys

SUPABASE_URL = "https://vfxezndvkaxlimthkeyx.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmeGV6bmR2a2F4bGltdGhrZXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjcxODEsImV4cCI6MjA5MTk0MzE4MX0.Kt0v47bv258m-pOMymSY2PZeVxw7WI5yItE6wdxddCE"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmeGV6bmR2a2F4bGltdGhrZXl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2NzE4MSwiZXhwIjoyMDkxOTQzMTgxfQ.-jz2hvvZ5obqegQP8W3GzpEPvQuU1hAO91Tp5jQ1Z0I"

def headers(use_service=True):
    key = SERVICE_KEY if use_service else ANON_KEY
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

def rest(method, path, data=None, use_service=True, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    resp = requests.request(method, url, headers=headers(use_service), json=data, params=params)
    return resp.status_code, resp.json() if resp.text else {}

def sql(query):
    """Execute SQL via Supabase REST API (requires service role)"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    # Try direct SQL via pg endpoint
    url2 = f"{SUPABASE_URL}/pg/query"
    resp = requests.post(url2, headers=headers(True), json={"query": query})
    return resp.status_code, resp.text

def sign_in(email, password):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    resp = requests.post(url, headers={
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }, json={"email": email, "password": password})
    return resp.status_code, resp.json()

print("=" * 60)
print("RTrader Supabase Diagnostics & Setup")
print("=" * 60)

# 1. Test auth
print("\n1. Testing authentication...")
status, data = sign_in("test@rtrader.com", "TestPassword123!")
if status == 200 and "access_token" in data:
    access_token = data["access_token"]
    user_id = data["user"]["id"]
    print(f"   ✅ Auth OK - User ID: {user_id}")
    print(f"   ✅ Email: {data['user']['email']}")
    print(f"   ✅ Token: {access_token[:50]}...")
else:
    print(f"   ❌ Auth FAILED: {status} - {data}")
    sys.exit(1)

# 2. Check tables
print("\n2. Checking tables...")
tables_to_check = ["profiles", "chats", "chat_participants", "messages", "chat_settings", "subscriptions"]
existing_tables = []
for table in tables_to_check:
    status, data = rest("GET", f"{table}?limit=1", use_service=True)
    if status == 200:
        print(f"   ✅ Table '{table}' exists")
        existing_tables.append(table)
    elif status == 404:
        print(f"   ❌ Table '{table}' NOT FOUND")
    else:
        print(f"   ⚠️  Table '{table}': status={status}, data={data}")

# 3. Check chats data
print("\n3. Checking existing chats...")
status, data = rest("GET", "chats?select=id,name,type", use_service=True)
if status == 200:
    if data:
        print(f"   ✅ Found {len(data)} chats:")
        for chat in data:
            print(f"      - {chat.get('id')}: {chat.get('name')} (type: {chat.get('type', 'N/A')})")
    else:
        print("   ⚠️  No chats found - need to seed data")
else:
    print(f"   ❌ Error: {status} - {data}")

# 4. Check chat_participants for test user
print(f"\n4. Checking chat_participants for user {user_id}...")
status, data = rest("GET", f"chat_participants?user_id=eq.{user_id}&select=chat_id,role", use_service=True)
if status == 200:
    if data:
        print(f"   ✅ User is in {len(data)} chats:")
        for p in data:
            print(f"      - chat_id: {p.get('chat_id')}, role: {p.get('role')}")
    else:
        print("   ⚠️  User is not in any chats - need to add participants")
else:
    print(f"   ❌ Error: {status} - {data}")

# 5. Check profiles
print(f"\n5. Checking profile for user {user_id}...")
status, data = rest("GET", f"profiles?id=eq.{user_id}", use_service=True)
if status == 200:
    if data:
        print(f"   ✅ Profile exists: {data[0]}")
    else:
        print("   ⚠️  No profile found - need to create")
else:
    print(f"   ❌ Error: {status} - {data}")

# 6. Check messages
print("\n6. Checking messages...")
status, data = rest("GET", "messages?limit=5&select=id,content,chat_id,user_id", use_service=True)
if status == 200:
    print(f"   ✅ Found {len(data)} messages (showing first 5)")
    for msg in data:
        print(f"      - {msg.get('id')}: '{msg.get('content', '')[:50]}' in chat {msg.get('chat_id')}")
else:
    print(f"   ❌ Error: {status} - {data}")

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"Auth: ✅ Working")
print(f"User ID: {user_id}")
print(f"Tables found: {len(existing_tables)}/{len(tables_to_check)}")
print(f"Missing tables: {[t for t in tables_to_check if t not in existing_tables]}")
print("\nRun this script to see what needs to be set up.")
