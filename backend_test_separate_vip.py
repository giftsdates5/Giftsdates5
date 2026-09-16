#!/usr/bin/env python3
"""
Backend test for SEPARATE VIP PROFILE feature in GiftsDates app.
Tests the new "separate VIP profile" functionality where VIP users can post
an independent anonymous listing with its own photos/age/city/nickname.

Test scenarios:
1. SAVE: VIP user saves separate profile with independent fields + stable public_id
2. ANONYMIZED BROWSE: Premium viewer browses vip_only=true, sees anonymized cards
3. DETAIL: GET /api/profiles/{public_id} returns anonymized VIP listing
4. VIP DETAIL: GET /api/vip/profile/{public_id} with proper anonymization
5. SHOW/HIDE ON MAIN: Test show_on_main flag behavior
6. BOOKING: POST /api/vip/book with public_id resolves to owner
7. PUBLISH GATE: Non-VIP user cannot publish (forced off)
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

def get_vip_profile(token, user_id):
    """Get VIP profile by user ID or public_id"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/vip/profile/{user_id}", headers=headers)
    return response

def browse_profiles(token, vip_only=False):
    """Browse profiles"""
    headers = {"Authorization": f"Bearer {token}"}
    params = {}
    if vip_only:
        params['vip_only'] = 'true'
    response = requests.get(f"{BASE_URL}/profiles", headers=headers, params=params)
    return response

def get_profile_detail(token, profile_id):
    """Get profile detail by ID"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/profiles/{profile_id}", headers=headers)
    return response

def book_vip_date(token, target_id, coins):
    """Book a VIP date"""
    headers = {"Authorization": f"Bearer {token}"}
    tomorrow = (datetime.now() + timedelta(days=1)).isoformat()
    payload = {
        "target_id": target_id,
        "venue": "Luxury Hotel",
        "city": "Moscow",
        "scheduled_at": tomorrow,
        "coins": coins,
        "place": "own"
    }
    response = requests.post(f"{BASE_URL}/vip/book", json=payload, headers=headers)
    return response

def buy_premium_with_coins(token, tier="vip"):
    """Buy premium/VIP subscription with coins"""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"tier": tier}
    response = requests.post(f"{BASE_URL}/premium/buy-with-coins", json=payload, headers=headers)
    return response

# ============================================================================
# TEST EXECUTION
# ============================================================================

print("\n" + "="*80)
print("SEPARATE VIP PROFILE TESTING")
print("="*80)

try:
    # ========================================================================
    # SETUP: Create test users
    # ========================================================================
    print("\n[SETUP] Creating test users...")
    
    # VIP owner with real identity
    vip_owner = register_user("vipowner", "Elena Petrova", age=28, gender="female", city="Saint Petersburg", country="Russia")
    print(f"  VIP Owner ID: {vip_owner['user_id']}")
    print(f"  VIP Owner Name: Elena Petrova")
    
    # Premium viewer (non-VIP)
    premium_viewer = register_user("premiumviewer", "Dmitry Ivanov", age=32, gender="male", city="Moscow", country="Russia")
    print(f"  Premium Viewer ID: {premium_viewer['user_id']}")
    
    # Regular viewer (for booking tests)
    booker = register_user("booker", "Alexander Sokolov", age=35, gender="male", city="Moscow", country="Russia")
    print(f"  Booker ID: {booker['user_id']}")
    
    # Non-VIP user (for publish gate test)
    non_vip = register_user("nonvip", "Maria Volkova", age=26, gender="female", city="Moscow", country="Russia")
    print(f"  Non-VIP ID: {non_vip['user_id']}")
    
    # Grant VIP to owner
    set_user_vip(vip_owner['user_id'])
    
    # Grant Premium to viewer
    set_user_premium(premium_viewer['user_id'])
    
    # Top up coins for booker and owner (for self-booking test)
    top_up_coins(booker['user_id'], 5000)
    top_up_coins(vip_owner['user_id'], 2000)
    
    # ========================================================================
    # TEST 1: VIP user saves separate profile with independent fields
    # ========================================================================
    print("\n[TEST 1] VIP user saves separate profile with independent fields...")
    
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    vip_profile_data = {
        "post_mode": "separate",
        "published": True,
        "nickname": "Anastasia",
        "age": 25,  # Different from real age (28)
        "city": "Moscow",  # Different from real city (Saint Petersburg)
        "country": "Russia",
        "gender": "female",
        "bio": "Elegant companion for sophisticated gentlemen",
        "show_on_main": True,
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
    
    if response.status_code == 200:
        data = response.json()
        vip_data = data.get('vip', {})
        
        # Check public_id is created and starts with 'v'
        public_id = vip_data.get('public_id')
        log_test(
            "public_id is created and starts with 'v'",
            public_id and public_id.startswith('v'),
            f"public_id: {public_id}"
        )
        
        # Store public_id for later tests
        vip_owner['public_id'] = public_id
        
        # Check post_mode is 'separate'
        log_test(
            "post_mode is 'separate'",
            vip_data.get('post_mode') == 'separate',
            f"post_mode: {vip_data.get('post_mode')}"
        )
        
        # Check nickname is saved
        log_test(
            "nickname is saved correctly",
            vip_data.get('nickname') == 'Anastasia',
            f"nickname: {vip_data.get('nickname')}"
        )
        
        # Check independent age is saved
        log_test(
            "Independent age is saved (25, different from real age 28)",
            vip_data.get('age') == 25,
            f"vip.age: {vip_data.get('age')}"
        )
        
        # Check independent city is saved
        log_test(
            "Independent city is saved (Moscow, different from real city)",
            vip_data.get('city') == 'Moscow',
            f"vip.city: {vip_data.get('city')}"
        )
        
        # Check gender is saved
        log_test(
            "gender is saved correctly",
            vip_data.get('gender') == 'female',
            f"gender: {vip_data.get('gender')}"
        )
        
        # Check bio is saved
        log_test(
            "bio is saved correctly",
            vip_data.get('bio') == 'Elegant companion for sophisticated gentlemen',
            f"bio: {vip_data.get('bio')[:50]}..."
        )
        
        # Check show_on_main is saved
        log_test(
            "show_on_main is saved correctly",
            vip_data.get('show_on_main') == True,
            f"show_on_main: {vip_data.get('show_on_main')}"
        )
        
        # Check published is true (VIP can publish)
        log_test(
            "published is true (VIP can publish)",
            vip_data.get('published') == True,
            f"published: {vip_data.get('published')}"
        )
        
        # Check can_publish is true
        log_test(
            "can_publish is true for VIP user",
            data.get('can_publish') == True,
            f"can_publish: {data.get('can_publish')}"
        )
        
        # ====================================================================
        # TEST 1b: Re-save and verify public_id is STABLE
        # ====================================================================
        print("\n[TEST 1b] Re-save profile and verify public_id is stable...")
        
        # Modify some fields but keep the same profile
        vip_profile_data['bio'] = "Updated bio - still elegant"
        response2 = put_vip_profile(vip_owner['token'], vip_profile_data)
        
        log_test(
            "Re-save returns 200",
            response2.status_code == 200,
            f"Status: {response2.status_code}"
        )
        
        if response2.status_code == 200:
            data2 = response2.json()
            vip_data2 = data2.get('vip', {})
            public_id2 = vip_data2.get('public_id')
            
            log_test(
                "public_id is STABLE (unchanged after re-save)",
                public_id2 == public_id,
                f"Original: {public_id}, After re-save: {public_id2}"
            )
    
    # ========================================================================
    # TEST 2: Premium viewer browses vip_only=true, sees anonymized card
    # ========================================================================
    print("\n[TEST 2] Premium viewer browses vip_only=true...")
    
    response = browse_profiles(premium_viewer['token'], vip_only=True)
    
    log_test(
        "GET /api/profiles?vip_only=true returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        profiles = response.json()
        
        # Find the VIP owner's listing
        vip_listing = None
        for p in profiles:
            if p.get('id') == vip_owner.get('public_id'):
                vip_listing = p
                break
        
        log_test(
            "VIP listing appears in browse results",
            vip_listing is not None,
            f"Found listing with id={vip_owner.get('public_id')}"
        )
        
        if vip_listing:
            # Check id is public_id (not real user id)
            log_test(
                "Listing id is public_id (not real user id)",
                vip_listing.get('id') == vip_owner.get('public_id') and vip_listing.get('id') != vip_owner['user_id'],
                f"id: {vip_listing.get('id')}, real user_id: {vip_owner['user_id']}"
            )
            
            # Check name is nickname (not real name)
            log_test(
                "Listing name is nickname 'Anastasia' (not real name 'Elena Petrova')",
                vip_listing.get('name') == 'Anastasia',
                f"name: {vip_listing.get('name')}"
            )
            
            # Check vip_listing flag is true
            log_test(
                "vip_listing flag is true",
                vip_listing.get('vip_listing') == True,
                f"vip_listing: {vip_listing.get('vip_listing')}"
            )
            
            # Check age is VIP age (25, not real age 28)
            log_test(
                "Age is VIP age (25, not real age 28)",
                vip_listing.get('age') == 25,
                f"age: {vip_listing.get('age')}"
            )
            
            # Check city is VIP city (Moscow, not Saint Petersburg)
            log_test(
                "City is VIP city (Moscow, not Saint Petersburg)",
                vip_listing.get('city') == 'Moscow',
                f"city: {vip_listing.get('city')}"
            )
            
            # Check real name is NOT exposed
            log_test(
                "Real name is NOT exposed in listing",
                'Elena Petrova' not in str(vip_listing),
                f"Listing does not contain real name"
            )
    
    # ========================================================================
    # TEST 3: GET /api/profiles/{public_id} returns anonymized VIP listing
    # ========================================================================
    print("\n[TEST 3] GET /api/profiles/{public_id} returns anonymized VIP listing...")
    
    response = get_profile_detail(premium_viewer['token'], vip_owner['public_id'])
    
    log_test(
        "GET /api/profiles/{public_id} returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        profile = response.json()
        
        # Check vip_listing flag is true
        log_test(
            "vip_listing flag is true",
            profile.get('vip_listing') == True,
            f"vip_listing: {profile.get('vip_listing')}"
        )
        
        # Check name is nickname
        log_test(
            "name is nickname 'Anastasia'",
            profile.get('name') == 'Anastasia',
            f"name: {profile.get('name')}"
        )
        
        # Check age is VIP age
        log_test(
            "age is VIP age (25)",
            profile.get('age') == 25,
            f"age: {profile.get('age')}"
        )
        
        # Check city is VIP city
        log_test(
            "city is VIP city (Moscow)",
            profile.get('city') == 'Moscow',
            f"city: {profile.get('city')}"
        )
    
    # ========================================================================
    # TEST 4a: GET /api/vip/profile/{public_id} as premium viewer
    # ========================================================================
    print("\n[TEST 4a] GET /api/vip/profile/{public_id} as premium viewer...")
    
    response = get_vip_profile(premium_viewer['token'], vip_owner['public_id'])
    
    log_test(
        "GET /api/vip/profile/{public_id} returns 200 for premium viewer",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Check locked is false (premium can view)
        log_test(
            "locked is false (premium can view)",
            data.get('locked') == False,
            f"locked: {data.get('locked')}"
        )
        
        # Check name is nickname
        log_test(
            "name is nickname 'Anastasia'",
            data.get('name') == 'Anastasia',
            f"name: {data.get('name')}"
        )
        
        # Check real_name is null (hidden from non-owner)
        log_test(
            "real_name is null (hidden from non-owner)",
            data.get('real_name') is None,
            f"real_name: {data.get('real_name')}"
        )
        
        # Check is_owner is false
        log_test(
            "is_owner is false",
            data.get('is_owner') == False,
            f"is_owner: {data.get('is_owner')}"
        )
        
        # Check separate flag is true
        log_test(
            "separate flag is true",
            data.get('separate') == True,
            f"separate: {data.get('separate')}"
        )
    
    # ========================================================================
    # TEST 4b: GET /api/vip/profile/{public_id} as owner
    # ========================================================================
    print("\n[TEST 4b] GET /api/vip/profile/{public_id} as owner...")
    
    response = get_vip_profile(vip_owner['token'], vip_owner['public_id'])
    
    log_test(
        "GET /api/vip/profile/{public_id} returns 200 for owner",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Check is_owner is true
        log_test(
            "is_owner is true",
            data.get('is_owner') == True,
            f"is_owner: {data.get('is_owner')}"
        )
        
        # Check real_name is present for owner
        log_test(
            "real_name is present for owner",
            data.get('real_name') == 'Elena Petrova',
            f"real_name: {data.get('real_name')}"
        )
    
    # ========================================================================
    # TEST 5a: Set show_on_main=false and verify VIP hidden from main profile
    # ========================================================================
    print("\n[TEST 5a] Set show_on_main=false and verify VIP hidden from main profile...")
    
    vip_profile_data['show_on_main'] = False
    response = put_vip_profile(vip_owner['token'], vip_profile_data)
    
    log_test(
        "Update with show_on_main=false returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    # Now try to access VIP profile via real user ID (from main profile)
    response = get_vip_profile(premium_viewer['token'], vip_owner['user_id'])
    
    log_test(
        "GET /api/vip/profile/{real_user_id} returns 404 when show_on_main=false",
        response.status_code == 404,
        f"Status: {response.status_code}, Response: {response.text[:200]}"
    )
    
    # ========================================================================
    # TEST 5b: Set show_on_main=true and verify VIP visible on main profile
    # ========================================================================
    print("\n[TEST 5b] Set show_on_main=true and verify VIP visible on main profile...")
    
    vip_profile_data['show_on_main'] = True
    response = put_vip_profile(vip_owner['token'], vip_profile_data)
    
    log_test(
        "Update with show_on_main=true returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    # Now try to access VIP profile via real user ID (from main profile)
    response = get_vip_profile(premium_viewer['token'], vip_owner['user_id'])
    
    log_test(
        "GET /api/vip/profile/{real_user_id} returns 200 when show_on_main=true",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Should still show nickname (separate mode)
        log_test(
            "Still shows nickname when accessed via real user ID",
            data.get('name') == 'Anastasia',
            f"name: {data.get('name')}"
        )
    
    # ========================================================================
    # TEST 6a: Book VIP date using public_id
    # ========================================================================
    print("\n[TEST 6a] Book VIP date using public_id...")
    
    # Get booker's initial coins
    booker_before = db.users.find_one({"id": booker['user_id']}, {"coins": 1, "withdrawable": 1})
    booker_coins_before = booker_before.get('coins', 0) + booker_before.get('withdrawable', 0)
    
    # Get owner's initial escrow
    owner_before = db.users.find_one({"id": vip_owner['user_id']}, {"escrow": 1})
    owner_escrow_before = owner_before.get('escrow', 0)
    
    print(f"  Booker coins before: {booker_coins_before}")
    print(f"  Owner escrow before: {owner_escrow_before}")
    
    booking_coins = 2000
    response = book_vip_date(booker['token'], vip_owner['public_id'], booking_coins)
    
    log_test(
        "POST /api/vip/book with public_id returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}, Response: {response.text[:300]}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Check booking was created
        log_test(
            "Booking created with status 'escrow'",
            data.get('status') == 'escrow',
            f"status: {data.get('status')}"
        )
        
        # Verify booker was debited
        booker_after = db.users.find_one({"id": booker['user_id']}, {"coins": 1, "withdrawable": 1})
        booker_coins_after = booker_after.get('coins', 0) + booker_after.get('withdrawable', 0)
        
        log_test(
            f"Booker debited {booking_coins} coins",
            booker_coins_after == booker_coins_before - booking_coins,
            f"Before: {booker_coins_before}, After: {booker_coins_after}, Expected: {booker_coins_before - booking_coins}"
        )
        
        # Verify owner's escrow was credited
        owner_after = db.users.find_one({"id": vip_owner['user_id']}, {"escrow": 1})
        owner_escrow_after = owner_after.get('escrow', 0)
        
        log_test(
            f"Owner escrow credited {booking_coins} coins",
            owner_escrow_after == owner_escrow_before + booking_coins,
            f"Before: {owner_escrow_before}, After: {owner_escrow_after}, Expected: {owner_escrow_before + booking_coins}"
        )
        
        # Verify booking record points to real owner (not public_id)
        booking_id = data.get('booking_id')
        booking_record = db.date_bookings.find_one({"id": booking_id})
        
        log_test(
            "Booking record to_id is real owner user_id (not public_id)",
            booking_record and booking_record.get('to_id') == vip_owner['user_id'],
            f"to_id: {booking_record.get('to_id') if booking_record else 'N/A'}, expected: {vip_owner['user_id']}"
        )
    
    # ========================================================================
    # TEST 6b: Self-booking is rejected
    # ========================================================================
    print("\n[TEST 6b] Self-booking is rejected...")
    
    response = book_vip_date(vip_owner['token'], vip_owner['public_id'], 1000)
    
    log_test(
        "Self-booking (owner books own public_id) is rejected with 400",
        response.status_code == 400,
        f"Status: {response.status_code}, Response: {response.text[:200]}"
    )
    
    if response.status_code == 400:
        log_test(
            "Error message contains 'CANNOT_BOOK_SELF'",
            'CANNOT_BOOK_SELF' in response.text,
            f"Response: {response.text}"
        )
    
    # ========================================================================
    # TEST 7: Non-VIP user cannot publish (forced off)
    # ========================================================================
    print("\n[TEST 7] Non-VIP user cannot publish (forced off)...")
    
    non_vip_profile_data = {
        "post_mode": "separate",
        "published": True,  # Non-VIP tries to publish
        "nickname": "TestNonVIP",
        "age": 26,
        "city": "Moscow",
        "country": "Russia",
        "gender": "female",
        "bio": "Test non-VIP user",
        "show_on_main": True,
        "services": ["Минет в презервативе"],
        "price_hour": 1000,
        "price_2h": 1800,
        "price_3h": 2500,
        "price_night": 4000,
        "places": ["own"],
        "client_wants": "Test",
        "availability": []
    }
    
    response = put_vip_profile(non_vip['token'], non_vip_profile_data)
    
    log_test(
        "Non-VIP PUT /api/vip/profile returns 200 (not 403)",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Check can_publish is false
        log_test(
            "can_publish is false for non-VIP user",
            data.get('can_publish') == False,
            f"can_publish: {data.get('can_publish')}"
        )
        
        # Check published is forced to false
        vip_data = data.get('vip', {})
        log_test(
            "published is forced to false for non-VIP user",
            vip_data.get('published') == False,
            f"published: {vip_data.get('published')}"
        )
        
        # Verify listing does NOT appear in browse
        response = browse_profiles(premium_viewer['token'], vip_only=True)
        
        if response.status_code == 200:
            profiles = response.json()
            non_vip_public_id = vip_data.get('public_id')
            
            # Check non-VIP listing is NOT in results
            found = any(p.get('id') == non_vip_public_id for p in profiles)
            
            log_test(
                "Non-VIP unpublished listing does NOT appear in vip_only browse",
                not found,
                f"Listing with public_id {non_vip_public_id} should not be visible"
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
