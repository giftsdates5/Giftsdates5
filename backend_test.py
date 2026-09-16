#!/usr/bin/env python3
"""
Backend test for VIP profile behavior updates in GiftsDates app.
Tests that non-VIP users can now fill & save VIP profiles (but not publish),
upload VIP photos, and that unpublished profiles remain hidden from others.
"""
import requests
import json
import random
import io
from datetime import datetime, timedelta

# Load backend URL from frontend/.env
def get_backend_url():
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                return line.split('=', 1)[1].strip()
    raise Exception("REACT_APP_BACKEND_URL not found in /app/frontend/.env")

BASE_URL = get_backend_url() + "/api"
print(f"Testing against: {BASE_URL}")

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
    """Register a new non-VIP user"""
    timestamp = datetime.now().timestamp()
    email = f"{email_prefix}.{int(timestamp)}.{random.randint(10000, 99999)}@example.com"
    
    payload = {
        "email": email,
        "password": "TestPass123!",
        "name": f"Test User {email_prefix}",
        "age": 25,
        "gender": "female",
        "interested_in": "male",
        "orientation": "straight",
        "city": "Moscow",
        "country": "Russia",
        "bio": "Test user for VIP profile testing"
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

def get_vip_catalog(token):
    """Get VIP services catalog"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/vip/catalog", headers=headers)
    
    if response.status_code != 200:
        raise Exception(f"Failed to get VIP catalog: {response.status_code} - {response.text}")
    
    return response.json()

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

def upload_vip_photo(token):
    """Upload a VIP photo"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a minimal valid image file (1x1 PNG)
    png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    
    files = {'photo': ('test.png', io.BytesIO(png_data), 'image/png')}
    response = requests.post(f"{BASE_URL}/vip/photo", files=files, headers=headers)
    return response

# ============================================================================
# TEST EXECUTION
# ============================================================================

print("\n" + "="*80)
print("VIP PROFILE BEHAVIOR TESTING")
print("="*80)

try:
    # ========================================================================
    # TEST 1: Register a fresh NON-VIP user
    # ========================================================================
    print("\n[TEST 1] Registering first NON-VIP user...")
    user1 = register_user("viptest1")
    print(f"  User 1 ID: {user1['user_id']}")
    print(f"  User 1 Email: {user1['email']}")
    
    # Verify user is NOT VIP
    is_vip = user1['user'].get('vip_until') is not None
    log_test(
        "User 1 is NON-VIP",
        not is_vip,
        f"vip_until: {user1['user'].get('vip_until')}"
    )
    
    # ========================================================================
    # TEST 2: Get VIP catalog
    # ========================================================================
    print("\n[TEST 2] Getting VIP services catalog...")
    catalog = get_vip_catalog(user1['token'])
    services = catalog.get('services', {})
    places = catalog.get('places', [])
    
    log_test(
        "VIP catalog retrieved",
        len(services) > 0 and len(places) > 0,
        f"Services categories: {len(services)}, Places: {places}"
    )
    
    # Pick some valid services
    selected_services = []
    if 'basic' in services:
        selected_services.extend(services['basic'][:2])
    if 'extra' in services:
        selected_services.extend(services['extra'][:2])
    
    print(f"  Selected services: {selected_services}")
    
    # ========================================================================
    # TEST 3: Non-VIP user fills & saves VIP profile (NO price_night field)
    # ========================================================================
    print("\n[TEST 3] Non-VIP user saves VIP profile with published=true...")
    
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    vip_profile_data = {
        "services": selected_services,
        "price_hour": 1000,
        "price_2h": 1800,
        "price_3h": 2500,
        # NOTE: NO price_night field - testing that it defaults to 0
        "places": ["own", "your"],
        "client_wants": "Respectful and generous clients only",
        "availability": [
            {"date": tomorrow, "from": "14:00", "to": "22:00"}
        ],
        "published": True  # Non-VIP tries to publish
    }
    
    response = put_vip_profile(user1['token'], vip_profile_data)
    
    # Should return 200 (not 403)
    log_test(
        "PUT /api/vip/profile returns 200 (not 403 VIP_REQUIRED)",
        response.status_code == 200,
        f"Status: {response.status_code}, Response: {response.text[:200]}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Check can_publish is false
        log_test(
            "Response includes can_publish=false",
            data.get('can_publish') == False,
            f"can_publish: {data.get('can_publish')}"
        )
        
        # Check vip.published is false (forced off for non-VIP)
        vip_data = data.get('vip', {})
        log_test(
            "vip.published is false (forced off for non-VIP)",
            vip_data.get('published') == False,
            f"vip.published: {vip_data.get('published')}"
        )
        
        # Check prices.night defaults to 0
        prices = vip_data.get('prices', {})
        log_test(
            "vip.prices.night defaults to 0",
            prices.get('night') == 0,
            f"prices: {prices}"
        )
        
        # Check other prices are set correctly
        log_test(
            "vip.prices.hour is 1000",
            prices.get('hour') == 1000,
            f"prices.hour: {prices.get('hour')}"
        )
        
        log_test(
            "vip.prices.h2 is 1800",
            prices.get('h2') == 1800,
            f"prices.h2: {prices.get('h2')}"
        )
        
        log_test(
            "vip.prices.h3 is 2500",
            prices.get('h3') == 2500,
            f"prices.h3: {prices.get('h3')}"
        )
        
        # Check services are saved
        log_test(
            "Services are saved correctly",
            len(vip_data.get('services', [])) > 0,
            f"Services count: {len(vip_data.get('services', []))}"
        )
        
        # Check places are saved
        log_test(
            "Places are saved correctly",
            set(vip_data.get('places', [])) == {"own", "your"},
            f"Places: {vip_data.get('places', [])}"
        )
        
        # Check availability is saved
        log_test(
            "Availability is saved correctly",
            len(vip_data.get('availability', [])) > 0,
            f"Availability slots: {len(vip_data.get('availability', []))}"
        )
    
    # ========================================================================
    # TEST 4: Register a SECOND user
    # ========================================================================
    print("\n[TEST 4] Registering second user...")
    user2 = register_user("viptest2")
    print(f"  User 2 ID: {user2['user_id']}")
    print(f"  User 2 Email: {user2['email']}")
    
    # ========================================================================
    # TEST 5: Second user tries to view first user's unpublished VIP profile
    # ========================================================================
    print("\n[TEST 5] Second user tries to view first user's unpublished VIP profile...")
    response = get_vip_profile(user2['token'], user1['user_id'])
    
    log_test(
        "GET /api/vip/profile/{uid} returns 404 for unpublished profile (hidden from others)",
        response.status_code == 404,
        f"Status: {response.status_code}, Response: {response.text[:200]}"
    )
    
    if response.status_code == 404:
        log_test(
            "Error message is 'No VIP profile'",
            "No VIP profile" in response.text,
            f"Response: {response.text}"
        )
    
    # ========================================================================
    # TEST 6: Owner can view their own unpublished VIP profile
    # ========================================================================
    print("\n[TEST 6] Owner views their own unpublished VIP profile...")
    response = get_vip_profile(user1['token'], user1['user_id'])
    
    log_test(
        "Owner GET /api/vip/profile/{ownUserId} returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        log_test(
            "Response includes is_owner=true",
            data.get('is_owner') == True,
            f"is_owner: {data.get('is_owner')}"
        )
        
        log_test(
            "Response includes VIP data",
            data.get('vip') is not None,
            f"VIP data present: {data.get('vip') is not None}"
        )
        
        vip_data = data.get('vip', {})
        log_test(
            "VIP data shows published=false",
            vip_data.get('published') == False,
            f"published: {vip_data.get('published')}"
        )
    
    # ========================================================================
    # TEST 7: Non-VIP user uploads VIP photo
    # ========================================================================
    print("\n[TEST 7] Non-VIP user uploads VIP photo...")
    response = upload_vip_photo(user1['token'])
    
    # Should NOT return 403 VIP_REQUIRED
    # Any other response (200 success or validation error) is acceptable
    log_test(
        "POST /api/vip/photo does NOT return 403 VIP_REQUIRED",
        response.status_code != 403 or "VIP_REQUIRED" not in response.text,
        f"Status: {response.status_code}, Response: {response.text[:200]}"
    )
    
    if response.status_code == 200:
        data = response.json()
        log_test(
            "VIP photo uploaded successfully",
            'photos' in data and len(data['photos']) > 0,
            f"Photos count: {len(data.get('photos', []))}"
        )
    elif response.status_code == 400:
        # Validation error is acceptable (different from 403 VIP_REQUIRED)
        print(f"  Note: Got validation error (acceptable): {response.text}")
    
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
