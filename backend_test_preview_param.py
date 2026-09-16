#!/usr/bin/env python3
"""
Backend test for PREVIEW PARAMETER feature in GiftsDates VIP profiles.
Tests the new "preview=nonvip" query parameter on GET /api/vip/profile/{uid}
that allows the owner to preview what non-VIP/non-premium visitors see.

Test scenarios:
1. Owner views own profile WITHOUT preview -> unlocked owner view (locked=false, is_owner=true)
2. Owner views own profile WITH ?preview=nonvip -> locked teaser view (locked=true, no is_owner)
3. Regression: Premium viewer (non-owner) still gets unlocked view (locked=false)
4. Regression: Non-premium viewer (non-owner) still gets locked teaser (locked=true)
5. Separate mode + show_on_main=false: ?preview=nonvip as owner -> 404 (like a guest)
6. Separate mode + show_on_main=true: ?preview=nonvip as owner -> locked teaser
"""
import requests
import json
import random
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
import os

# Load backend URL from frontend/.env
def get_backend_url():
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                return line.split('=', 1)[1].strip()
    raise Exception("REACT_APP_BACKEND_URL not found in /app/frontend/.env")

# Load MongoDB connection from backend/.env
def get_mongo_config():
    config = {}
    with open('/app/backend/.env', 'r') as f:
        for line in f:
            if line.startswith('MONGO_URL='):
                config['url'] = line.split('=', 1)[1].strip().strip('"')
            elif line.startswith('DB_NAME='):
                config['db_name'] = line.split('=', 1)[1].strip().strip('"')
    return config

BASE_URL = get_backend_url() + "/api"
MONGO_CONFIG = get_mongo_config()
print(f"Testing against: {BASE_URL}")
print(f"MongoDB: {MONGO_CONFIG['url']}, DB: {MONGO_CONFIG['db_name']}")

# MongoDB client
mongo_client = MongoClient(MONGO_CONFIG['url'])
db = mongo_client[MONGO_CONFIG['db_name']]

# Test results tracking
test_results = []

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append({"name": name, "passed": passed, "details": details})
    print(f"\n{status}: {name}")
    if details:
        print(f"  Details: {details}")

def register_user(email_prefix, name, age=25, gender="female", city="Moscow", country="Russia"):
    """Register a new user"""
    timestamp = datetime.now().timestamp()
    email = f"{email_prefix}.{int(timestamp)}.{random.randint(10000, 99999)}@example.com"
    
    payload = {
        "email": email,
        "password": "TestPass123!",
        "name": name,
        "age": age,
        "gender": gender,
        "interested_in": "male",
        "orientation": "straight",
        "city": city,
        "country": country,
        "bio": f"Test user {name}"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=payload)
    
    if response.status_code != 200:
        raise Exception(f"Registration failed: {response.status_code} - {response.text}")
    
    data = response.json()
    return {
        "email": email,
        "token": data["token"],
        "user_id": data["user"]["id"],
        "user": data["user"]
    }

def set_user_vip(user_id):
    """Set user as VIP by updating vip_until in MongoDB"""
    far_future = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
    db.users.update_one({"id": user_id}, {"$set": {"vip_until": far_future}})
    print(f"  Set user {user_id} as VIP (vip_until={far_future})")

def set_user_premium(user_id):
    """Set user as Premium by updating premium_until in MongoDB"""
    far_future = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
    db.users.update_one({"id": user_id}, {"$set": {"premium_until": far_future}})
    print(f"  Set user {user_id} as Premium (premium_until={far_future})")

def top_up_coins(user_id, amount):
    """Top up user coins directly in MongoDB"""
    db.users.update_one({"id": user_id}, {"$inc": {"coins": amount}})
    print(f"  Topped up {amount} coins for user {user_id}")

def put_vip_profile(token, profile_data):
    """Update VIP profile"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.put(f"{BASE_URL}/vip/profile", json=profile_data, headers=headers)
    return response

def get_vip_profile(token, user_id, preview=None):
    """Get VIP profile by user ID or public_id, optionally with preview parameter"""
    headers = {"Authorization": f"Bearer {token}"}
    params = {}
    if preview:
        params['preview'] = preview
    response = requests.get(f"{BASE_URL}/vip/profile/{user_id}", headers=headers, params=params)
    return response

# ============================================================================
# TEST EXECUTION
# ============================================================================

print("\n" + "="*80)
print("PREVIEW PARAMETER TESTING")
print("="*80)

try:
    # ========================================================================
    # SETUP: Create test users
    # ========================================================================
    print("\n[SETUP] Creating test users...")
    
    # VIP owner
    vip_owner = register_user("vipowner_preview", "Natasha Romanova", age=27, gender="female", city="Moscow", country="Russia")
    print(f"  VIP Owner ID: {vip_owner['user_id']}")
    print(f"  VIP Owner Name: Natasha Romanova")
    
    # Premium viewer (non-owner)
    premium_viewer = register_user("premiumviewer_preview", "Ivan Petrov", age=30, gender="male", city="Moscow", country="Russia")
    print(f"  Premium Viewer ID: {premium_viewer['user_id']}")
    
    # Non-premium viewer (non-owner)
    regular_viewer = register_user("regularviewer_preview", "Sergei Volkov", age=28, gender="male", city="Moscow", country="Russia")
    print(f"  Regular Viewer ID: {regular_viewer['user_id']}")
    
    # Grant VIP to owner
    set_user_vip(vip_owner['user_id'])
    
    # Grant Premium to premium viewer
    set_user_premium(premium_viewer['user_id'])
    
    # ========================================================================
    # TEST 1: Owner sets up VIP profile with post_mode="together" (default)
    # ========================================================================
    print("\n[TEST 1] Owner sets up VIP profile with post_mode='together'...")
    
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    vip_profile_data = {
        "post_mode": "together",
        "published": True,
        "services": ["Минет в презервативе", "Секс вагинальный", "Массаж эротический"],
        "price_hour": 2000,
        "price_2h": 3500,
        "price_3h": 5000,
        "price_night": 8000,
        "places": ["own", "your"],
        "client_wants": "Respectful and generous clients",
        "availability": [
            {"date": tomorrow, "from": "18:00", "to": "23:00"}
        ]
    }
    
    response = put_vip_profile(vip_owner['token'], vip_profile_data)
    
    log_test(
        "PUT /api/vip/profile returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}, Response: {response.text[:300]}"
    )
    
    # ========================================================================
    # TEST 2: Owner views own profile WITHOUT preview -> unlocked owner view
    # ========================================================================
    print("\n[TEST 2] Owner views own profile WITHOUT preview parameter...")
    
    response = get_vip_profile(vip_owner['token'], vip_owner['user_id'])
    
    log_test(
        "GET /api/vip/profile/{OWNER_ID} returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Check locked is false (owner sees unlocked view)
        log_test(
            "locked=false (owner sees unlocked view)",
            data.get('locked') == False,
            f"locked: {data.get('locked')}"
        )
        
        # Check is_owner is true
        log_test(
            "is_owner=true (owner viewing own profile)",
            data.get('is_owner') == True,
            f"is_owner: {data.get('is_owner')}"
        )
        
        # Check full vip object is present
        log_test(
            "Full vip object is present",
            data.get('vip') is not None and isinstance(data.get('vip'), dict),
            f"vip object present: {data.get('vip') is not None}"
        )
    
    # ========================================================================
    # TEST 3: Owner views own profile WITH ?preview=nonvip -> locked teaser
    # ========================================================================
    print("\n[TEST 3] Owner views own profile WITH ?preview=nonvip parameter...")
    
    response = get_vip_profile(vip_owner['token'], vip_owner['user_id'], preview='nonvip')
    
    log_test(
        "GET /api/vip/profile/{OWNER_ID}?preview=nonvip returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Check locked is true (teaser view)
        log_test(
            "locked=true (owner sees locked teaser view)",
            data.get('locked') == True,
            f"locked: {data.get('locked')}"
        )
        
        # Check is_owner is NOT true (or not present)
        log_test(
            "is_owner is NOT true (preview mode hides ownership)",
            data.get('is_owner') != True,
            f"is_owner: {data.get('is_owner')}"
        )
        
        # Check full vip object is NOT present (teaser only)
        log_test(
            "Full vip object is NOT present (teaser only)",
            data.get('vip') is None,
            f"vip object present: {data.get('vip') is not None}"
        )
        
        # Check teaser fields are present
        log_test(
            "Teaser fields present (services_count)",
            'services_count' in data,
            f"services_count: {data.get('services_count')}"
        )
    
    # ========================================================================
    # TEST 4: Premium viewer (non-owner) gets unlocked view
    # ========================================================================
    print("\n[TEST 4] Premium viewer (non-owner) views VIP profile...")
    
    response = get_vip_profile(premium_viewer['token'], vip_owner['user_id'])
    
    log_test(
        "GET /api/vip/profile/{OWNER_ID} as premium viewer returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Check locked is false (premium can view)
        log_test(
            "locked=false (premium viewer sees unlocked view)",
            data.get('locked') == False,
            f"locked: {data.get('locked')}"
        )
        
        # Check is_owner is false
        log_test(
            "is_owner=false (not the owner)",
            data.get('is_owner') == False,
            f"is_owner: {data.get('is_owner')}"
        )
        
        # Check full vip object is present
        log_test(
            "Full vip object is present for premium viewer",
            data.get('vip') is not None and isinstance(data.get('vip'), dict),
            f"vip object present: {data.get('vip') is not None}"
        )
    
    # ========================================================================
    # TEST 5: Non-premium viewer (non-owner) gets locked teaser
    # ========================================================================
    print("\n[TEST 5] Non-premium viewer (non-owner) views VIP profile...")
    
    response = get_vip_profile(regular_viewer['token'], vip_owner['user_id'])
    
    log_test(
        "GET /api/vip/profile/{OWNER_ID} as non-premium viewer returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Check locked is true (non-premium sees teaser)
        log_test(
            "locked=true (non-premium viewer sees locked teaser)",
            data.get('locked') == True,
            f"locked: {data.get('locked')}"
        )
        
        # Check full vip object is NOT present
        log_test(
            "Full vip object is NOT present for non-premium viewer",
            data.get('vip') is None,
            f"vip object present: {data.get('vip') is not None}"
        )
    
    # ========================================================================
    # TEST 6: Separate mode with show_on_main=false + preview=nonvip -> 404
    # ========================================================================
    print("\n[TEST 6] Separate mode with show_on_main=false + preview=nonvip...")
    
    # Update profile to separate mode with show_on_main=false
    vip_profile_data_separate = {
        "post_mode": "separate",
        "published": True,
        "nickname": "Katya",
        "age": 24,
        "city": "Moscow",
        "country": "Russia",
        "gender": "female",
        "bio": "Elegant companion",
        "show_on_main": False,  # Hidden from main profile
        "services": ["Минет в презервативе", "Секс вагинальный"],
        "price_hour": 2000,
        "price_2h": 3500,
        "price_3h": 5000,
        "price_night": 8000,
        "places": ["own"],
        "client_wants": "Respectful clients",
        "availability": [
            {"date": tomorrow, "from": "18:00", "to": "23:00"}
        ]
    }
    
    response = put_vip_profile(vip_owner['token'], vip_profile_data_separate)
    
    log_test(
        "Update to separate mode with show_on_main=false returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        public_id = data.get('vip', {}).get('public_id')
        print(f"  Public ID: {public_id}")
        
        # Owner tries to access via real user_id with preview=nonvip
        # Should get 404 (like a guest would)
        response = get_vip_profile(vip_owner['token'], vip_owner['user_id'], preview='nonvip')
        
        log_test(
            "GET /api/vip/profile/{real_user_id}?preview=nonvip returns 404 (show_on_main=false)",
            response.status_code == 404,
            f"Status: {response.status_code}, Response: {response.text[:200]}"
        )
    
    # ========================================================================
    # TEST 7: Separate mode with show_on_main=true + preview=nonvip -> locked teaser
    # ========================================================================
    print("\n[TEST 7] Separate mode with show_on_main=true + preview=nonvip...")
    
    # Update profile to show_on_main=true
    vip_profile_data_separate['show_on_main'] = True
    
    response = put_vip_profile(vip_owner['token'], vip_profile_data_separate)
    
    log_test(
        "Update to show_on_main=true returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    # Owner tries to access via real user_id with preview=nonvip
    # Should get locked teaser (like a non-premium guest would)
    response = get_vip_profile(vip_owner['token'], vip_owner['user_id'], preview='nonvip')
    
    log_test(
        "GET /api/vip/profile/{real_user_id}?preview=nonvip returns 200 (show_on_main=true)",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Check locked is true (teaser view)
        log_test(
            "locked=true (owner sees locked teaser with preview=nonvip)",
            data.get('locked') == True,
            f"locked: {data.get('locked')}"
        )
        
        # Check is_owner is NOT true
        log_test(
            "is_owner is NOT true (preview mode)",
            data.get('is_owner') != True,
            f"is_owner: {data.get('is_owner')}"
        )

except Exception as e:
    print(f"\n❌ EXCEPTION: {str(e)}")
    import traceback
    traceback.print_exc()
    log_test("Test execution", False, str(e))

# ============================================================================
# SUMMARY
# ============================================================================

print("\n" + "="*80)
print("TEST SUMMARY")
print("="*80)

passed = sum(1 for t in test_results if t['passed'])
total = len(test_results)

print(f"\nTotal Tests: {total}")
print(f"Passed: {passed}")
print(f"Failed: {total - passed}")

print("\nDetailed Results:")
for i, test in enumerate(test_results, 1):
    status = "✅" if test['passed'] else "❌"
    print(f"{i}. {status} {test['name']}")
    if not test['passed'] and test['details']:
        print(f"   {test['details']}")

if passed == total:
    print("\n🎉 ALL TESTS PASSED!")
    exit(0)
else:
    print(f"\n⚠️  {total - passed} TEST(S) FAILED")
    exit(1)
