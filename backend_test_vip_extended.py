#!/usr/bin/env python3
"""
Backend test for NEWLY EXTENDED VIP profile fields in GiftsDates app.
Tests:
1. NICKNAME + POST_MODE persistence (separate vs together, invalid fallback)
2. PRIVATE PHOTOS functionality (private=true/false, separate arrays)
3. VISIBILITY of private photos to premium unlockers
"""
import requests
import json
import random
import io
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

def register_user(email_prefix):
    """Register a new user"""
    timestamp = datetime.now().timestamp()
    email = f"{email_prefix}.{int(timestamp)}.{random.randint(10000, 99999)}@example.com"
    
    payload = {
        "email": email,
        "password": "TestPass123!",
        "name": f"RealName_{email_prefix}",
        "age": 25,
        "gender": "female",
        "interested_in": "male",
        "orientation": "straight",
        "city": "Moscow",
        "country": "Russia",
        "bio": "Test user for VIP extended features"
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

def put_vip_profile(token, profile_data):
    """Update VIP profile"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.put(f"{BASE_URL}/vip/profile", json=profile_data, headers=headers)
    return response

def get_vip_profile(token, user_id):
    """Get VIP profile by user ID"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/vip/profile/{user_id}", headers=headers)
    return response

def upload_vip_photo(token, private=False):
    """Upload a VIP photo"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a minimal valid image file (1x1 PNG)
    png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    
    files = {'photo': ('test.png', io.BytesIO(png_data), 'image/png')}
    params = {'private': 'true' if private else 'false'}
    response = requests.post(f"{BASE_URL}/vip/photo", files=files, headers=headers, params=params)
    return response

def delete_vip_photo(token, path, private=False):
    """Delete a VIP photo"""
    headers = {"Authorization": f"Bearer {token}"}
    params = {'path': path, 'private': 'true' if private else 'false'}
    response = requests.delete(f"{BASE_URL}/vip/photo", headers=headers, params=params)
    return response

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

def login_user(email, password):
    """Login user and get new token"""
    payload = {"email": email, "password": password}
    response = requests.post(f"{BASE_URL}/auth/login", json=payload)
    if response.status_code != 200:
        raise Exception(f"Login failed: {response.status_code} - {response.text}")
    data = response.json()
    return data["token"]

# ============================================================================
# TEST EXECUTION
# ============================================================================

print("\n" + "="*80)
print("VIP PROFILE EXTENDED FEATURES TESTING")
print("="*80)

try:
    # ========================================================================
    # FEATURE 1: NICKNAME + POST_MODE PERSISTENCE
    # ========================================================================
    print("\n" + "="*80)
    print("FEATURE 1: NICKNAME + POST_MODE PERSISTENCE")
    print("="*80)
    
    # ========================================================================
    # TEST 1.1: Register fresh NON-VIP user
    # ========================================================================
    print("\n[TEST 1.1] Registering fresh NON-VIP user...")
    user1 = register_user("mila")
    print(f"  User ID: {user1['user_id']}")
    print(f"  Real Name: {user1['user']['name']}")
    
    # ========================================================================
    # TEST 1.2: PUT with nickname="Mila", post_mode="separate"
    # ========================================================================
    print("\n[TEST 1.2] PUT VIP profile with nickname='Mila', post_mode='separate'...")
    
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    vip_profile_data = {
        "services": ["Dinner", "Theater"],
        "price_hour": 1000,
        "price_2h": 1800,
        "price_3h": 2500,
        "places": ["own", "your"],
        "client_wants": "Respectful clients",
        "availability": [{"date": tomorrow, "from": "14:00", "to": "22:00"}],
        "published": True,
        "nickname": "Mila",
        "post_mode": "separate"
    }
    
    response = put_vip_profile(user1['token'], vip_profile_data)
    
    log_test(
        "PUT /api/vip/profile returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Non-VIP user: can_publish should be false, published forced false
        log_test(
            "can_publish=false for non-VIP user",
            data.get('can_publish') == False,
            f"can_publish: {data.get('can_publish')}"
        )
        
        log_test(
            "published forced to false for non-VIP",
            data.get('vip', {}).get('published') == False,
            f"published: {data.get('vip', {}).get('published')}"
        )
    
    # ========================================================================
    # TEST 1.3: GET as owner - verify nickname and post_mode in response
    # ========================================================================
    print("\n[TEST 1.3] GET /api/vip/profile/{ownUserId} as owner...")
    response = get_vip_profile(user1['token'], user1['user_id'])
    
    log_test(
        "GET returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        vip = data.get('vip', {})
        
        # Check vip.nickname
        log_test(
            "vip.nickname == 'Mila'",
            vip.get('nickname') == "Mila",
            f"vip.nickname: {vip.get('nickname')}"
        )
        
        # Check vip.post_mode
        log_test(
            "vip.post_mode == 'separate'",
            vip.get('post_mode') == "separate",
            f"vip.post_mode: {vip.get('post_mode')}"
        )
        
        # Check top-level nickname
        log_test(
            "Top-level nickname == 'Mila'",
            data.get('nickname') == "Mila",
            f"nickname: {data.get('nickname')}"
        )
        
        # Check top-level post_mode
        log_test(
            "Top-level post_mode == 'separate'",
            data.get('post_mode') == "separate",
            f"post_mode: {data.get('post_mode')}"
        )
        
        # When post_mode="separate", name should equal nickname (identity hidden)
        log_test(
            "name == 'Mila' (nickname) when post_mode='separate'",
            data.get('name') == "Mila",
            f"name: {data.get('name')}"
        )
        
        # real_name should be the actual account name
        log_test(
            "real_name == actual account name",
            data.get('real_name') == user1['user']['name'],
            f"real_name: {data.get('real_name')}, expected: {user1['user']['name']}"
        )
    
    # ========================================================================
    # TEST 1.4: Test post_mode="together"
    # ========================================================================
    print("\n[TEST 1.4] PUT with post_mode='together'...")
    
    vip_profile_data['post_mode'] = "together"
    vip_profile_data['nickname'] = "Mila"  # Keep nickname
    
    response = put_vip_profile(user1['token'], vip_profile_data)
    
    log_test(
        "PUT with post_mode='together' returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    # GET and verify
    response = get_vip_profile(user1['token'], user1['user_id'])
    
    if response.status_code == 200:
        data = response.json()
        
        log_test(
            "post_mode == 'together'",
            data.get('post_mode') == "together",
            f"post_mode: {data.get('post_mode')}"
        )
        
        # When post_mode="together", name should equal real account name (not nickname)
        log_test(
            "name == real account name when post_mode='together'",
            data.get('name') == user1['user']['name'],
            f"name: {data.get('name')}, expected: {user1['user']['name']}"
        )
    
    # ========================================================================
    # TEST 1.5: Test invalid post_mode="foo" (should default to "together")
    # ========================================================================
    print("\n[TEST 1.5] PUT with invalid post_mode='foo'...")
    
    vip_profile_data['post_mode'] = "foo"
    
    response = put_vip_profile(user1['token'], vip_profile_data)
    
    log_test(
        "PUT with invalid post_mode returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Invalid post_mode should be stored as "together" (default fallback)
        log_test(
            "Invalid post_mode='foo' defaults to 'together'",
            data.get('vip', {}).get('post_mode') == "together",
            f"post_mode: {data.get('vip', {}).get('post_mode')}"
        )
    
    # ========================================================================
    # FEATURE 2: PRIVATE PHOTOS
    # ========================================================================
    print("\n" + "="*80)
    print("FEATURE 2: PRIVATE PHOTOS")
    print("="*80)
    
    # ========================================================================
    # TEST 2.1: POST /api/vip/photo?private=true
    # ========================================================================
    print("\n[TEST 2.1] Upload PRIVATE photo (private=true)...")
    
    response = upload_vip_photo(user1['token'], private=True)
    
    log_test(
        "POST /api/vip/photo?private=true returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}, Response: {response.text[:200]}"
    )
    
    private_photo_path = None
    if response.status_code == 200:
        data = response.json()
        
        # Response should contain BOTH photos and private_photos arrays
        log_test(
            "Response contains 'photos' array",
            'photos' in data,
            f"Keys: {list(data.keys())}"
        )
        
        log_test(
            "Response contains 'private_photos' array",
            'private_photos' in data,
            f"Keys: {list(data.keys())}"
        )
        
        # The uploaded photo should appear in private_photos (not photos)
        log_test(
            "Uploaded photo appears in 'private_photos' array",
            len(data.get('private_photos', [])) > 0,
            f"private_photos count: {len(data.get('private_photos', []))}"
        )
        
        log_test(
            "Uploaded photo does NOT appear in 'photos' array",
            len(data.get('photos', [])) == 0,
            f"photos count: {len(data.get('photos', []))}"
        )
        
        if data.get('private_photos'):
            private_photo_path = data['private_photos'][0]
            print(f"  Private photo path: {private_photo_path}")
    
    # ========================================================================
    # TEST 2.2: POST /api/vip/photo?private=false (public)
    # ========================================================================
    print("\n[TEST 2.2] Upload PUBLIC photo (private=false)...")
    
    response = upload_vip_photo(user1['token'], private=False)
    
    log_test(
        "POST /api/vip/photo?private=false returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}, Response: {response.text[:200]}"
    )
    
    public_photo_path = None
    if response.status_code == 200:
        data = response.json()
        
        # The uploaded photo should appear in photos (not private_photos)
        log_test(
            "Uploaded photo appears in 'photos' array",
            len(data.get('photos', [])) > 0,
            f"photos count: {len(data.get('photos', []))}"
        )
        
        # private_photos should still have 1 photo from previous upload
        log_test(
            "private_photos still contains 1 photo",
            len(data.get('private_photos', [])) == 1,
            f"private_photos count: {len(data.get('private_photos', []))}"
        )
        
        if data.get('photos'):
            public_photo_path = data['photos'][0]
            print(f"  Public photo path: {public_photo_path}")
    
    # ========================================================================
    # TEST 2.3: GET /api/vip/profile/{ownUserId} - verify both arrays
    # ========================================================================
    print("\n[TEST 2.3] GET VIP profile - verify photos and private_photos...")
    
    response = get_vip_profile(user1['token'], user1['user_id'])
    
    if response.status_code == 200:
        data = response.json()
        vip = data.get('vip', {})
        
        log_test(
            "vip.private_photos contains 1 photo",
            len(vip.get('private_photos', [])) == 1,
            f"private_photos: {vip.get('private_photos', [])}"
        )
        
        log_test(
            "vip.photos contains 1 photo",
            len(vip.get('photos', [])) == 1,
            f"photos: {vip.get('photos', [])}"
        )
        
        # Verify the paths match what we uploaded
        if private_photo_path:
            log_test(
                "private_photos contains correct path",
                private_photo_path in vip.get('private_photos', []),
                f"Expected: {private_photo_path}, Got: {vip.get('private_photos', [])}"
            )
        
        if public_photo_path:
            log_test(
                "photos contains correct path",
                public_photo_path in vip.get('photos', []),
                f"Expected: {public_photo_path}, Got: {vip.get('photos', [])}"
            )
    
    # ========================================================================
    # TEST 2.4: DELETE private photo
    # ========================================================================
    print("\n[TEST 2.4] DELETE private photo (private=true)...")
    
    if private_photo_path:
        response = delete_vip_photo(user1['token'], private_photo_path, private=True)
        
        log_test(
            "DELETE /api/vip/photo?private=true returns 200",
            response.status_code == 200,
            f"Status: {response.status_code}"
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # private_photos should now be empty
            log_test(
                "private_photos is now empty",
                len(data.get('private_photos', [])) == 0,
                f"private_photos count: {len(data.get('private_photos', []))}"
            )
            
            # photos should still have 1 photo
            log_test(
                "photos still contains 1 photo",
                len(data.get('photos', [])) == 1,
                f"photos count: {len(data.get('photos', []))}"
            )
    
    # ========================================================================
    # TEST 2.5: DELETE public photo
    # ========================================================================
    print("\n[TEST 2.5] DELETE public photo (private=false)...")
    
    if public_photo_path:
        response = delete_vip_photo(user1['token'], public_photo_path, private=False)
        
        log_test(
            "DELETE /api/vip/photo?private=false returns 200",
            response.status_code == 200,
            f"Status: {response.status_code}"
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # photos should now be empty
            log_test(
                "photos is now empty",
                len(data.get('photos', [])) == 0,
                f"photos count: {len(data.get('photos', []))}"
            )
    
    # ========================================================================
    # FEATURE 3: VISIBILITY OF PRIVATE PHOTOS TO PREMIUM UNLOCKERS
    # ========================================================================
    print("\n" + "="*80)
    print("FEATURE 3: VISIBILITY OF PRIVATE PHOTOS TO PREMIUM UNLOCKERS")
    print("="*80)
    
    # ========================================================================
    # TEST 3.1: Set first user as VIP (so they can publish)
    # ========================================================================
    print("\n[TEST 3.1] Set first user as VIP via MongoDB and re-login...")
    set_user_vip(user1['user_id'])
    
    # Verify vip_until is set in MongoDB
    user_in_db = db.users.find_one({"id": user1['user_id']}, {"_id": 0, "vip_until": 1})
    print(f"  User in DB vip_until: {user_in_db.get('vip_until')}")
    
    # Re-login to get new JWT token with updated vip_until
    user1['token'] = login_user(user1['email'], "TestPass123!")
    print(f"  User 1 re-logged in with new token")
    
    # Check what the backend thinks about this user
    headers = {"Authorization": f"Bearer {user1['token']}"}
    me_response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    if me_response.status_code == 200:
        me_data = me_response.json()
        print(f"  GET /api/auth/me vip_until: {me_data.get('vip_until')}")
        print(f"  GET /api/auth/me premium_until: {me_data.get('premium_until')}")
    
    # ========================================================================
    # TEST 3.2: Upload new private and public photos
    # ========================================================================
    print("\n[TEST 3.2] Upload new private and public photos...")
    
    # Upload private photo
    response = upload_vip_photo(user1['token'], private=True)
    if response.status_code == 200:
        data = response.json()
        new_private_photo = data.get('private_photos', [])[-1] if data.get('private_photos') else None
        print(f"  Uploaded private photo: {new_private_photo}")
    
    # Upload public photo
    response = upload_vip_photo(user1['token'], private=False)
    if response.status_code == 200:
        data = response.json()
        new_public_photo = data.get('photos', [])[-1] if data.get('photos') else None
        print(f"  Uploaded public photo: {new_public_photo}")
    
    # ========================================================================
    # TEST 3.3: Publish VIP profile (now that user is VIP)
    # ========================================================================
    print("\n[TEST 3.3] Publish VIP profile (user is now VIP)...")
    
    vip_profile_data['published'] = True
    vip_profile_data['post_mode'] = "separate"
    vip_profile_data['nickname'] = "Mila"
    
    response = put_vip_profile(user1['token'], vip_profile_data)
    
    log_test(
        "PUT with published=true returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        log_test(
            "can_publish=true for VIP user",
            data.get('can_publish') == True,
            f"can_publish: {data.get('can_publish')}"
        )
        
        log_test(
            "published=true for VIP user",
            data.get('vip', {}).get('published') == True,
            f"published: {data.get('vip', {}).get('published')}"
        )
    
    # ========================================================================
    # TEST 3.4: Register second user and set as Premium
    # ========================================================================
    print("\n[TEST 3.4] Register second user and set as Premium...")
    user2 = register_user("premium_user")
    print(f"  User 2 ID: {user2['user_id']}")
    
    set_user_premium(user2['user_id'])
    
    # ========================================================================
    # TEST 3.5: Premium user GET first user's VIP profile
    # ========================================================================
    print("\n[TEST 3.5] Premium user GET first user's published VIP profile...")
    
    response = get_vip_profile(user2['token'], user1['user_id'])
    
    log_test(
        "Premium user GET returns 200 (profile is published)",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        log_test(
            "locked=false for Premium user",
            data.get('locked') == False,
            f"locked: {data.get('locked')}"
        )
        
        vip = data.get('vip', {})
        
        # Premium user should see private_photos
        log_test(
            "vip.private_photos is present in response",
            'private_photos' in vip,
            f"VIP keys: {list(vip.keys())}"
        )
        
        log_test(
            "vip.private_photos contains photos",
            len(vip.get('private_photos', [])) > 0,
            f"private_photos count: {len(vip.get('private_photos', []))}"
        )
        
        # Premium user should also see public photos
        log_test(
            "vip.photos is present in response",
            'photos' in vip,
            f"VIP keys: {list(vip.keys())}"
        )
        
        log_test(
            "vip.photos contains photos",
            len(vip.get('photos', [])) > 0,
            f"photos count: {len(vip.get('photos', []))}"
        )
    
    # ========================================================================
    # TEST 3.6: Register third user (non-Premium) and verify they see locked profile
    # ========================================================================
    print("\n[TEST 3.6] Register third user (non-Premium) and verify locked profile...")
    user3 = register_user("regular_user")
    print(f"  User 3 ID: {user3['user_id']}")
    
    response = get_vip_profile(user3['token'], user1['user_id'])
    
    log_test(
        "Non-Premium user GET returns 200 (profile is published)",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        log_test(
            "locked=true for non-Premium user",
            data.get('locked') == True,
            f"locked: {data.get('locked')}"
        )
        
        # Non-Premium user should NOT see full VIP data
        log_test(
            "vip key is NOT present for non-Premium user",
            'vip' not in data,
            f"Response keys: {list(data.keys())}"
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
