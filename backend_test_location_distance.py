#!/usr/bin/env python3
"""
Backend test for global location + distance feature in GiftsDates app.
Tests that:
1. Register accepts and stores lat/lng coordinates
2. Browse /profiles returns distance_km for profiles
3. Detail /profiles/{id} returns distance_km
4. Raw lat/lng are never exposed in responses (privacy)
5. Graceful handling when coords are missing (no crash)
6. Regression: register without coords still works
"""
import requests
import json
import random
from datetime import datetime

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

def register_user_with_coords(name, email_prefix, gender, interested_in, city, country, lat, lng):
    """Register a new user with coordinates"""
    timestamp = datetime.now().timestamp()
    email = f"{email_prefix}.{int(timestamp)}.{random.randint(10000, 99999)}@example.com"
    
    payload = {
        "email": email,
        "password": "SecurePass2024!",
        "name": name,
        "age": 28,
        "gender": gender,
        "interested_in": interested_in,
        "orientation": "straight",
        "city": city,
        "country": country,
        "bio": f"Test user from {city}",
        "lat": lat,
        "lng": lng
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=payload)
    
    if response.status_code != 200:
        raise Exception(f"Registration failed: {response.status_code} - {response.text}")
    
    data = response.json()
    return {
        "email": email,
        "token": data["token"],
        "user_id": data["user"]["id"],
        "user": data["user"],
        "name": name
    }

def register_user_without_coords(name, email_prefix, gender, interested_in, city, country):
    """Register a new user WITHOUT coordinates"""
    timestamp = datetime.now().timestamp()
    email = f"{email_prefix}.{int(timestamp)}.{random.randint(10000, 99999)}@example.com"
    
    payload = {
        "email": email,
        "password": "SecurePass2024!",
        "name": name,
        "age": 30,
        "gender": gender,
        "interested_in": interested_in,
        "orientation": "straight",
        "city": city,
        "country": country,
        "bio": f"Test user from {city}"
        # NO lat/lng
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=payload)
    
    if response.status_code != 200:
        raise Exception(f"Registration failed: {response.status_code} - {response.text}")
    
    data = response.json()
    return {
        "email": email,
        "token": data["token"],
        "user_id": data["user"]["id"],
        "user": data["user"],
        "name": name
    }

def browse_profiles(token, gender_filter=None):
    """Browse profiles with optional gender filter"""
    headers = {"Authorization": f"Bearer {token}"}
    params = {}
    if gender_filter:
        params["gender"] = gender_filter
    
    response = requests.get(f"{BASE_URL}/profiles", headers=headers, params=params)
    return response

def get_profile_detail(token, profile_id):
    """Get profile detail by ID"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/profiles/{profile_id}", headers=headers)
    return response

# ============================================================================
# TEST EXECUTION
# ============================================================================

print("\n" + "="*80)
print("LOCATION + DISTANCE FEATURE TESTS")
print("="*80)

try:
    # ========================================================================
    # SCENARIO 1: Register users WITH coordinates
    # ========================================================================
    print("\n--- SCENARIO 1: Register users WITH coordinates ---")
    
    # Register Alice in Paris (female, interested in male)
    alice = register_user_with_coords(
        name="Alice",
        email_prefix="alice_paris",
        gender="female",
        interested_in="male",
        city="Paris",
        country="France",
        lat=48.8566,
        lng=2.3522
    )
    log_test(
        "Register Alice with Paris coordinates",
        True,
        f"User ID: {alice['user_id']}, City: Paris, Coords: (48.8566, 2.3522)"
    )
    
    # Verify Alice's registration response includes token and user
    assert alice["token"], "Alice should have a token"
    assert alice["user"]["id"] == alice["user_id"], "User ID should match"
    log_test(
        "Alice registration returns token and user",
        True,
        "Token and user object present in response"
    )
    
    # Register Bob in London (male, interested in female)
    bob = register_user_with_coords(
        name="Bob",
        email_prefix="bob_london",
        gender="male",
        interested_in="female",
        city="London",
        country="United Kingdom",
        lat=51.5074,
        lng=-0.1278
    )
    log_test(
        "Register Bob with London coordinates",
        True,
        f"User ID: {bob['user_id']}, City: London, Coords: (51.5074, -0.1278)"
    )
    
    # ========================================================================
    # SCENARIO 2: Browse profiles - distance_km appears, lat/lng stripped
    # ========================================================================
    print("\n--- SCENARIO 2: Browse profiles with distance calculation ---")
    
    # Bob browses for females (should see Alice)
    browse_resp = browse_profiles(bob["token"], gender_filter="female")
    
    if browse_resp.status_code != 200:
        log_test(
            "Bob browses profiles (gender=female)",
            False,
            f"Expected 200, got {browse_resp.status_code}: {browse_resp.text}"
        )
    else:
        log_test(
            "Bob browses profiles (gender=female)",
            True,
            f"Status: {browse_resp.status_code}"
        )
        
        profiles = browse_resp.json()
        
        # Find Alice in the results
        alice_profile = None
        for p in profiles:
            if p.get("name") == "Alice":
                alice_profile = p
                break
        
        if not alice_profile:
            log_test(
                "Alice appears in Bob's browse results",
                False,
                "Alice not found in browse results"
            )
        else:
            log_test(
                "Alice appears in Bob's browse results",
                True,
                f"Found Alice (ID: {alice_profile.get('id')})"
            )
            
            # Check distance_km is present and reasonable (Paris-London ~343 km)
            distance_km = alice_profile.get("distance_km")
            if distance_km is None:
                log_test(
                    "distance_km field present in Alice's profile",
                    False,
                    "distance_km field is missing"
                )
            else:
                log_test(
                    "distance_km field present in Alice's profile",
                    True,
                    f"distance_km = {distance_km} km"
                )
                
                # Verify distance is approximately correct (340-345 km for Paris-London)
                if 340 <= distance_km <= 345:
                    log_test(
                        "distance_km is approximately correct (~343 km)",
                        True,
                        f"distance_km = {distance_km} km (expected ~343 km)"
                    )
                else:
                    log_test(
                        "distance_km is approximately correct (~343 km)",
                        False,
                        f"distance_km = {distance_km} km (expected 340-345 km)"
                    )
            
            # CRITICAL: Verify raw lat/lng are NOT in the response
            has_lat = "lat" in alice_profile
            has_lng = "lng" in alice_profile
            
            if has_lat or has_lng:
                log_test(
                    "Raw lat/lng NOT exposed in browse results (PRIVACY)",
                    False,
                    f"PRIVACY VIOLATION: lat={has_lat}, lng={has_lng} found in response"
                )
            else:
                log_test(
                    "Raw lat/lng NOT exposed in browse results (PRIVACY)",
                    True,
                    "No raw coordinates in response (privacy protected)"
                )
    
    # ========================================================================
    # SCENARIO 3: Profile detail - distance_km appears, lat/lng stripped
    # ========================================================================
    print("\n--- SCENARIO 3: Profile detail with distance calculation ---")
    
    # Bob views Alice's profile detail
    detail_resp = get_profile_detail(bob["token"], alice["user_id"])
    
    if detail_resp.status_code != 200:
        log_test(
            "Bob views Alice's profile detail",
            False,
            f"Expected 200, got {detail_resp.status_code}: {detail_resp.text}"
        )
    else:
        log_test(
            "Bob views Alice's profile detail",
            True,
            f"Status: {detail_resp.status_code}"
        )
        
        alice_detail = detail_resp.json()
        
        # Check distance_km is present
        distance_km = alice_detail.get("distance_km")
        if distance_km is None:
            log_test(
                "distance_km field present in detail view",
                False,
                "distance_km field is missing"
            )
        else:
            log_test(
                "distance_km field present in detail view",
                True,
                f"distance_km = {distance_km} km"
            )
            
            # Verify distance is approximately correct
            if 340 <= distance_km <= 345:
                log_test(
                    "distance_km in detail view is correct (~343 km)",
                    True,
                    f"distance_km = {distance_km} km"
                )
            else:
                log_test(
                    "distance_km in detail view is correct (~343 km)",
                    False,
                    f"distance_km = {distance_km} km (expected 340-345 km)"
                )
        
        # CRITICAL: Verify raw lat/lng are NOT in the response
        has_lat = "lat" in alice_detail
        has_lng = "lng" in alice_detail
        
        if has_lat or has_lng:
            log_test(
                "Raw lat/lng NOT exposed in detail view (PRIVACY)",
                False,
                f"PRIVACY VIOLATION: lat={has_lat}, lng={has_lng} found in response"
            )
        else:
            log_test(
                "Raw lat/lng NOT exposed in detail view (PRIVACY)",
                True,
                "No raw coordinates in response (privacy protected)"
            )
    
    # ========================================================================
    # SCENARIO 4: Register user WITHOUT coordinates (graceful handling)
    # ========================================================================
    print("\n--- SCENARIO 4: Register user WITHOUT coordinates ---")
    
    # Register Charlie without coordinates
    charlie = register_user_without_coords(
        name="Charlie",
        email_prefix="charlie_berlin",
        gender="female",
        interested_in="male",
        city="Berlin",
        country="Germany"
    )
    log_test(
        "Register Charlie WITHOUT coordinates",
        True,
        f"User ID: {charlie['user_id']}, City: Berlin, NO coordinates"
    )
    
    # ========================================================================
    # SCENARIO 5: Browse as user WITHOUT coords (no crash)
    # ========================================================================
    print("\n--- SCENARIO 5: Browse as user WITHOUT coordinates ---")
    
    # Charlie (no coords) browses for males
    charlie_browse_resp = browse_profiles(charlie["token"], gender_filter="male")
    
    if charlie_browse_resp.status_code != 200:
        log_test(
            "Charlie (no coords) browses profiles",
            False,
            f"Expected 200, got {charlie_browse_resp.status_code}: {charlie_browse_resp.text}"
        )
    else:
        log_test(
            "Charlie (no coords) browses profiles",
            True,
            "Browse works even when viewer has no coordinates"
        )
        
        charlie_profiles = charlie_browse_resp.json()
        
        # Find Bob in the results
        bob_profile = None
        for p in charlie_profiles:
            if p.get("name") == "Bob":
                bob_profile = p
                break
        
        if bob_profile:
            # Bob has coords, but Charlie doesn't, so distance_km should be absent
            distance_km = bob_profile.get("distance_km")
            if distance_km is None:
                log_test(
                    "No distance_km when viewer has no coords",
                    True,
                    "distance_km correctly absent (viewer has no coords)"
                )
            else:
                log_test(
                    "No distance_km when viewer has no coords",
                    False,
                    f"distance_km = {distance_km} (should be absent)"
                )
    
    # ========================================================================
    # SCENARIO 6: Browse as user WITH coords viewing user WITHOUT coords
    # ========================================================================
    print("\n--- SCENARIO 6: Browse as user WITH coords viewing user WITHOUT coords ---")
    
    # Bob (has coords) browses for females (should see Charlie who has no coords)
    bob_browse_resp = browse_profiles(bob["token"], gender_filter="female")
    
    if bob_browse_resp.status_code == 200:
        bob_profiles = bob_browse_resp.json()
        
        # Find Charlie in the results
        charlie_profile = None
        for p in bob_profiles:
            if p.get("name") == "Charlie":
                charlie_profile = p
                break
        
        if charlie_profile:
            log_test(
                "Charlie (no coords) appears in Bob's browse results",
                True,
                "User without coords still appears in browse"
            )
            
            # Charlie has no coords, so distance_km should be absent
            distance_km = charlie_profile.get("distance_km")
            if distance_km is None:
                log_test(
                    "No distance_km when target has no coords",
                    True,
                    "distance_km correctly absent (target has no coords)"
                )
            else:
                log_test(
                    "No distance_km when target has no coords",
                    False,
                    f"distance_km = {distance_km} (should be absent)"
                )
    
    # ========================================================================
    # SCENARIO 7: Regression - existing filters still work
    # ========================================================================
    print("\n--- SCENARIO 7: Regression - existing filters still work ---")
    
    # Test gender filter
    gender_filter_resp = browse_profiles(bob["token"], gender_filter="female")
    if gender_filter_resp.status_code == 200:
        log_test(
            "Gender filter still works",
            True,
            f"Status: {gender_filter_resp.status_code}"
        )
    else:
        log_test(
            "Gender filter still works",
            False,
            f"Expected 200, got {gender_filter_resp.status_code}"
        )
    
    # Test age filter (min_age, max_age)
    age_filter_resp = requests.get(
        f"{BASE_URL}/profiles",
        headers={"Authorization": f"Bearer {bob['token']}"},
        params={"min_age": 25, "max_age": 35}
    )
    if age_filter_resp.status_code == 200:
        log_test(
            "Age filter still works",
            True,
            f"Status: {age_filter_resp.status_code}"
        )
    else:
        log_test(
            "Age filter still works",
            False,
            f"Expected 200, got {age_filter_resp.status_code}"
        )

except Exception as e:
    print(f"\n❌ TEST SUITE FAILED WITH EXCEPTION: {e}")
    import traceback
    traceback.print_exc()

# ============================================================================
# SUMMARY
# ============================================================================

print("\n" + "="*80)
print("TEST SUMMARY")
print("="*80)

passed = sum(1 for t in test_results if t["passed"])
failed = sum(1 for t in test_results if not t["passed"])
total = len(test_results)

print(f"\nTotal Tests: {total}")
print(f"✅ Passed: {passed}")
print(f"❌ Failed: {failed}")

if failed > 0:
    print("\n❌ FAILED TESTS:")
    for t in test_results:
        if not t["passed"]:
            print(f"  - {t['name']}")
            if t["details"]:
                print(f"    {t['details']}")

print("\n" + "="*80)

if failed == 0:
    print("✅ ALL TESTS PASSED!")
else:
    print(f"❌ {failed} TEST(S) FAILED")
    exit(1)
