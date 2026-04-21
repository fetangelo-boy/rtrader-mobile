#!/usr/bin/env python3
"""
Test tRPC API endpoints with Supabase JWT token.
Verifies that the server correctly authenticates Supabase users.
"""
import requests
import json

SUPABASE_URL = "https://vfxezndvkaxlimthkeyx.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmeGV6bmR2a2F4bGltdGhrZXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjcxODEsImV4cCI6MjA5MTk0MzE4MX0.Kt0v47bv258m-pOMymSY2PZeVxw7WI5yItE6wdxddCE"
API_URL = "http://127.0.0.1:3000"

def sign_in(email, password):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    resp = requests.post(url, headers={
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }, json={"email": email, "password": password})
    return resp.status_code, resp.json()

def call_trpc(procedure, token, input_data=None):
    """Call a tRPC procedure with Supabase JWT token"""
    url = f"{API_URL}/api/trpc/{procedure}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    if input_data is not None:
        # POST mutation or query with input
        import json as j
        params = {"input": j.dumps({"json": input_data})}
        resp = requests.get(url, headers=headers, params=params)
    else:
        # GET query without input
        resp = requests.get(url, headers=headers)
    
    return resp.status_code, resp.json() if resp.text else {}

print("=" * 60)
print("RTrader tRPC API Test")
print("=" * 60)

# 1. Get Supabase token
print("\n1. Getting Supabase token...")
status, data = sign_in("test@rtrader.com", "TestPassword123!")
if status != 200 or "access_token" not in data:
    print(f"   ❌ Auth failed: {status} - {data}")
    exit(1)

token = data["access_token"]
user_id = data["user"]["id"]
print(f"   ✅ Got token for user: {data['user']['email']}")
print(f"   Token starts with: {token[:50]}...")

# 2. Test health endpoint
print("\n2. Testing health endpoint...")
resp = requests.get(f"{API_URL}/api/health")
print(f"   Status: {resp.status_code} - {resp.json()}")

# 3. Test chat.list
print("\n3. Testing chat.list...")
status, data = call_trpc("chat.list", token)
print(f"   Status: {status}")
if status == 200:
    result = data.get("result", {}).get("data", {})
    json_data = result.get("json", []) if isinstance(result, dict) else result
    if isinstance(json_data, list):
        print(f"   ✅ Got {len(json_data)} chats!")
        for chat in json_data[:3]:
            print(f"      - {chat.get('id')}: {chat.get('name', chat.get('title', 'N/A'))}")
    else:
        print(f"   Response: {json.dumps(data, indent=2)[:500]}")
else:
    print(f"   ❌ Error: {json.dumps(data, indent=2)[:500]}")

# 4. Test chat.getMessages for chat-1
print("\n4. Testing chat.getMessages for chat-1...")
status, data = call_trpc("chat.getMessages", token, {"chatId": "chat-1", "limit": 5, "offset": 0})
print(f"   Status: {status}")
if status == 200:
    result = data.get("result", {}).get("data", {})
    json_data = result.get("json", []) if isinstance(result, dict) else result
    if isinstance(json_data, list):
        print(f"   ✅ Got {len(json_data)} messages!")
        for msg in json_data[:3]:
            print(f"      - {msg.get('id')}: '{str(msg.get('content', ''))[:50]}'")
    else:
        print(f"   Response: {json.dumps(data, indent=2)[:500]}")
else:
    print(f"   ❌ Error: {json.dumps(data, indent=2)[:500]}")

# 5. Test account.getSubscription
print("\n5. Testing account.getSubscription...")
status, data = call_trpc("account.getSubscription", token)
print(f"   Status: {status}")
if status == 200:
    result = data.get("result", {}).get("data", {})
    json_data = result.get("json", {}) if isinstance(result, dict) else result
    print(f"   ✅ Subscription: plan={json_data.get('plan')}, status={json_data.get('status')}")
else:
    print(f"   ❌ Error: {json.dumps(data, indent=2)[:500]}")

print("\n" + "=" * 60)
print("Test complete!")
