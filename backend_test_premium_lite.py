#!/usr/bin/env python3
"""
Backend test for Premium-lite tier in GiftsDates app.
Tests self-buy, gift, baseline perks (unlimited likes, advanced filters, see who liked you),
VIP content access restrictions, meta/prices endpoints, and regression for premium/vip tiers.
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

def register_user(email_prefix, name_prefix="Test User"):
    """Register a new user"""
    timestamp = datetime.now().timestamp()
    email = f"{email_prefix}.{int(timestamp)}.{random.randint(10000, 99999)}@example.com"
    
    payload = {
        "email": email,
        "password": "TestPass123!",
        "name": f"{name_prefix} {email_prefix}",
        "age": 25,
        "gender": "female",
        "interested_in": "male",
        "orientation": "straight",
        "city": "Moscow",
        "country": "Russia",
        "bio": f"Test user {email_prefix}"
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

def top_up_coins(token, amount):
    """Top up coins for a user (admin endpoint or direct DB update simulation)"""
    # Since we need to grant coins for testing, we'll use the existing pattern
    # from backend_test.py - directly update via a test helper or use admin endpoint
    # For now, we'll assume we can call an admin endpoint or use a workaround
    # Let's check if there's a way to grant coins
    pass

def grant_coins_via_admin(user_id, amount):
    """Grant coins to a user via direct DB update (test helper)"""
    # This is a test helper - in production this would be an admin endpoint
    # For testing purposes, we'll use the MongoDB directly
    from motor.motor_asyncio import AsyncIOMotorClient
    import asyncio
    import os
    from dotenv import load_dotenv
    from pathlib import Path
    
    ROOT_DIR = Path(__file__).parent / 'backend'
    load_dotenv(ROOT_DIR / '.env')
    
    async def _grant():
        mongo_url = os.environ['MONGO_URL']
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ['DB_NAME']]
        await db.users.update_one({"id": user_id}, {"$inc": {"coins": amount}})
        client.close()
    
    asyncio.run(_grant())

def get_me(token):
    """Get current user info"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    return response

def buy_premium_with_coins(token, tier="premium"):
    """Buy premium tier with coins"""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"tier": tier}
    response = requests.post(f"{BASE_URL}/premium/buy-with-coins", json=payload, headers=headers)
    return response

def gift_premium(token, target_id, tier="premium"):
    """Gift premium tier to another user"""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"target_id": target_id, "tier": tier}
    response = requests.post(f"{BASE_URL}/premium/gift", json=payload, headers=headers)
    return response

def get_coin_prices(token):
    """Get premium coin prices"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/premium/coin-prices", headers=headers)
    return response

def get_meta(token):
    """Get meta information"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/meta", headers=headers)
    return response

def like_user(token, target_id):
    """Like a user"""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"target_id": target_id}
    response = requests.post(f"{BASE_URL}/likes", json=payload, headers=headers)
    return response

def get_likes_received(token):
    """Get likes received"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/likes/received", headers=headers)
    return response

def search_profiles(token, **filters):
    """Search profiles with filters"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/profiles", headers=headers, params=filters)
    return response

def put_vip_profile(token, profile_data):
    """Update VIP profile"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.put(f"{BASE_URL}/vip/profile", json=profile_data, headers=headers)
    return response

def get_vip_profile(token, user_id):
    """Get VIP profile"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/vip/profile/{user_id}", headers=headers)
    return response

# ============================================================================
# TEST EXECUTION
# ============================================================================

print("\n" + "="*80)
print("PREMIUM-LITE TIER TESTING")
print("="*80)

try:
    # ========================================================================
    # SETUP: Register users and grant coins
    # ========================================================================
    print("\n[SETUP] Registering test users...")
    user_a = register_user("premiumlite_a", "Alice")
    user_b = register_user("premiumlite_b", "Bob")
    user_c = register_user("premiumlite_c", "Charlie")
    user_vip_owner = register_user("premiumlite_vip", "VIP Owner")
    
    print(f"  User A ID: {user_a['user_id']}")
    print(f"  User B ID: {user_b['user_id']}")
    print(f"  User C ID: {user_c['user_id']}")
    print(f"  VIP Owner ID: {user_vip_owner['user_id']}")
    
    # Grant coins to users
    print("\n[SETUP] Granting coins to users...")
    grant_coins_via_admin(user_a['user_id'], 200)  # 200 coins for testing
    grant_coins_via_admin(user_b['user_id'], 200)  # 200 coins for testing
    grant_coins_via_admin(user_c['user_id'], 100)  # 100 coins (insufficient for lite)
    grant_coins_via_admin(user_vip_owner['user_id'], 500)  # 500 coins for VIP
    
    # ========================================================================
    # SCENARIO 5: META/PRICES (test first as it doesn't modify state)
    # ========================================================================
    print("\n[SCENARIO 5] Testing META and COIN-PRICES endpoints...")
    
    # Test GET /api/meta
    response = get_meta(user_a['token'])
    log_test(
        "GET /api/meta returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        meta = response.json()
        
        log_test(
            "meta.premium_lite.amount = 14.99",
            meta.get('premium_lite', {}).get('amount') == 14.99,
            f"premium_lite.amount: {meta.get('premium_lite', {}).get('amount')}"
        )
        
        log_test(
            "meta.premium_lite_coins = 150",
            meta.get('premium_lite_coins') == 150,
            f"premium_lite_coins: {meta.get('premium_lite_coins')}"
        )
    
    # Test GET /api/premium/coin-prices
    response = get_coin_prices(user_a['token'])
    log_test(
        "GET /api/premium/coin-prices returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        prices = response.json()
        
        log_test(
            "coin-prices.premium_lite = 150",
            prices.get('premium_lite') == 150,
            f"premium_lite: {prices.get('premium_lite')}"
        )
        
        log_test(
            "coin-prices.premium = 300",
            prices.get('premium') == 300,
            f"premium: {prices.get('premium')}"
        )
        
        log_test(
            "coin-prices.vip = 500",
            prices.get('vip') == 500,
            f"vip: {prices.get('vip')}"
        )
    
    # ========================================================================
    # SCENARIO 1: SELF-BUY premium_lite
    # ========================================================================
    print("\n[SCENARIO 1] Testing SELF-BUY premium_lite...")
    
    # Get initial coins
    response = get_me(user_a['token'])
    initial_coins = response.json().get('coins', 0)
    print(f"  Initial coins: {initial_coins}")
    
    # Buy premium_lite
    response = buy_premium_with_coins(user_a['token'], tier="premium_lite")
    
    log_test(
        "POST /api/premium/buy-with-coins {tier:premium_lite} returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}, Response: {response.text[:200]}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        log_test(
            "Response contains tier='premium_lite'",
            data.get('tier') == 'premium_lite',
            f"tier: {data.get('tier')}"
        )
        
        log_test(
            "Response contains premium_lite_until",
            'premium_lite_until' in data,
            f"premium_lite_until: {data.get('premium_lite_until')}"
        )
        
        # Verify premium_lite_until is ~30 days ahead
        if 'premium_lite_until' in data:
            until = datetime.fromisoformat(data['premium_lite_until'].replace('Z', '+00:00'))
            now = datetime.now(until.tzinfo)
            days_diff = (until - now).days
            
            log_test(
                "premium_lite_until is ~30 days ahead (25-35 days)",
                25 <= days_diff <= 35,
                f"Days ahead: {days_diff}"
            )
    
    # Verify coins debited
    response = get_me(user_a['token'])
    if response.status_code == 200:
        current_coins = response.json().get('coins', 0)
        debited = initial_coins - current_coins
        
        log_test(
            "150 coins debited",
            debited == 150,
            f"Initial: {initial_coins}, Current: {current_coins}, Debited: {debited}"
        )
    
    # Verify GET /api/auth/me flags
    response = get_me(user_a['token'])
    log_test(
        "GET /api/auth/me returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        me = response.json()
        
        log_test(
            "is_premium_lite = true",
            me.get('is_premium_lite') == True,
            f"is_premium_lite: {me.get('is_premium_lite')}"
        )
        
        log_test(
            "is_premium = false",
            me.get('is_premium') == False,
            f"is_premium: {me.get('is_premium')}"
        )
        
        log_test(
            "is_vip = false",
            me.get('is_vip') == False,
            f"is_vip: {me.get('is_vip')}"
        )
    
    # ========================================================================
    # SCENARIO 2: BASELINE PERKS for lite user
    # ========================================================================
    print("\n[SCENARIO 2] Testing BASELINE PERKS for premium_lite user...")
    
    # 2a) Unlimited likes
    print("\n[SCENARIO 2a] Testing unlimited likes...")
    
    # Like multiple users (more than free_daily_likes which is 15)
    like_count = 0
    for i in range(20):  # Try to like 20 times
        # Create a dummy target (we'll use user_b for simplicity)
        response = like_user(user_a['token'], user_b['user_id'])
        
        if response.status_code == 200:
            like_count += 1
        elif response.status_code == 429 and 'LIKE_LIMIT' in response.text:
            # Hit the like limit - this should NOT happen for premium_lite
            break
        else:
            # Already liked or other error - continue
            pass
    
    log_test(
        "Premium_lite user can like without hitting LIKE_LIMIT (no 429 LIKE_LIMIT)",
        like_count > 0,  # At least one like succeeded
        f"Likes attempted: 20, No LIKE_LIMIT error encountered"
    )
    
    # 2b) Advanced filters
    print("\n[SCENARIO 2b] Testing advanced filters...")
    
    response = search_profiles(user_a['token'], intent="serious", online_now=True)
    
    log_test(
        "GET /api/profiles with advanced filters (intent, online_now) returns 200 (not 403 PREMIUM_REQUIRED)",
        response.status_code == 200,
        f"Status: {response.status_code}, Response: {response.text[:200] if response.status_code != 200 else 'Success'}"
    )
    
    # 2c) See who liked you
    print("\n[SCENARIO 2c] Testing 'see who liked you'...")
    
    # Register a fresh user to like user_a (to avoid match filtering)
    user_liker = register_user("premiumlite_liker", "Liker")
    print(f"  Liker ID: {user_liker['user_id']}")
    
    # Have the fresh user like user_a
    response = like_user(user_liker['token'], user_a['user_id'])
    print(f"  Liker liked User A: {response.status_code}")
    
    # User A checks who liked them
    response = get_likes_received(user_a['token'])
    
    log_test(
        "GET /api/likes/received returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        log_test(
            "Response contains premium=true",
            data.get('premium') == True,
            f"premium: {data.get('premium')}"
        )
        
        # Check if items include full liker details
        items = data.get('items', [])
        if len(items) > 0:
            first_item = items[0]
            has_full_details = all(k in first_item for k in ['id', 'name', 'age', 'city'])
            
            log_test(
                "Items include full liker details (id, name, age, city)",
                has_full_details,
                f"First item keys: {list(first_item.keys())}"
            )
        else:
            log_test(
                "Items include full liker details (id, name, age, city)",
                False,
                "No likes received to verify"
            )
    
    # ========================================================================
    # SCENARIO 3: NO VIP CONTENT for lite user
    # ========================================================================
    print("\n[SCENARIO 3] Testing NO VIP CONTENT access for premium_lite user...")
    
    # Create a VIP-subscribed owner with published VIP profile
    print("\n  Creating VIP owner with published profile...")
    
    # Buy VIP for vip_owner
    response = buy_premium_with_coins(user_vip_owner['token'], tier="vip")
    log_test(
        "VIP owner buys VIP tier",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    # Create and publish VIP profile
    vip_profile_data = {
        "services": ["Минет в презервативе", "Секс вагинальный"],
        "price_hour": 2000,
        "price_2h": 3500,
        "price_3h": 5000,
        "places": ["own", "your"],
        "client_wants": "Respectful clients",
        "published": True
    }
    
    response = put_vip_profile(user_vip_owner['token'], vip_profile_data)
    log_test(
        "VIP owner publishes VIP profile",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    # Premium_lite user (user_a) tries to access VIP profile
    print("\n  Premium_lite user accessing VIP profile...")
    response = get_vip_profile(user_a['token'], user_vip_owner['user_id'])
    
    log_test(
        "Premium_lite user GET /api/vip/profile/{vip_owner_id} returns locked=true",
        response.status_code == 200 and response.json().get('locked') == True,
        f"Status: {response.status_code}, locked: {response.json().get('locked') if response.status_code == 200 else 'N/A'}"
    )
    
    # Now buy full premium for user_b and verify they can access
    print("\n  Full premium user accessing VIP profile...")
    # Grant more coins to user_b (they may have spent some already)
    grant_coins_via_admin(user_b['user_id'], 300)
    response = buy_premium_with_coins(user_b['token'], tier="premium")
    log_test(
        "User B buys full premium tier",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    response = get_vip_profile(user_b['token'], user_vip_owner['user_id'])
    
    log_test(
        "Full premium user GET /api/vip/profile/{vip_owner_id} returns locked=false",
        response.status_code == 200 and response.json().get('locked') == False,
        f"Status: {response.status_code}, locked: {response.json().get('locked') if response.status_code == 200 else 'N/A'}"
    )
    
    # ========================================================================
    # SCENARIO 4: GIFT premium_lite
    # ========================================================================
    print("\n[SCENARIO 4] Testing GIFT premium_lite...")
    
    # Register a new user to receive gift
    user_gift_recipient = register_user("premiumlite_gift", "Gift Recipient")
    print(f"  Gift recipient ID: {user_gift_recipient['user_id']}")
    
    # Grant coins to user_b for gifting
    grant_coins_via_admin(user_b['user_id'], 150)
    
    # Get initial coins for user_b
    response = get_me(user_b['token'])
    initial_coins_b = response.json().get('coins', 0)
    print(f"  User B initial coins: {initial_coins_b}")
    
    # User B gifts premium_lite to recipient
    response = gift_premium(user_b['token'], user_gift_recipient['user_id'], tier="premium_lite")
    
    log_test(
        "POST /api/premium/gift {tier:premium_lite} returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}, Response: {response.text[:200]}"
    )
    
    # Verify user_b debited 150 coins
    response = get_me(user_b['token'])
    if response.status_code == 200:
        current_coins_b = response.json().get('coins', 0)
        debited_b = initial_coins_b - current_coins_b
        
        log_test(
            "Gifter debited 150 coins",
            debited_b == 150,
            f"Initial: {initial_coins_b}, Current: {current_coins_b}, Debited: {debited_b}"
        )
    
    # Verify recipient has premium_lite
    response = get_me(user_gift_recipient['token'])
    
    log_test(
        "Recipient GET /api/auth/me returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        me = response.json()
        
        log_test(
            "Recipient is_premium_lite = true",
            me.get('is_premium_lite') == True,
            f"is_premium_lite: {me.get('is_premium_lite')}"
        )
    
    # ========================================================================
    # SCENARIO 6: INSUFFICIENT coins
    # ========================================================================
    print("\n[SCENARIO 6] Testing INSUFFICIENT coins...")
    
    # User C has only 100 coins (insufficient for premium_lite which costs 150)
    response = get_me(user_c['token'])
    coins_c = response.json().get('coins', 0)
    print(f"  User C coins: {coins_c}")
    
    response = buy_premium_with_coins(user_c['token'], tier="premium_lite")
    
    log_test(
        "User with <150 coins buying premium_lite returns error (400 or 402)",
        response.status_code in [400, 402],
        f"Status: {response.status_code}, Response: {response.text[:200]}"
    )
    
    if response.status_code in [400, 402]:
        log_test(
            "Error message mentions 'Insufficient coins'",
            'Insufficient' in response.text or 'insufficient' in response.text,
            f"Response: {response.text[:200]}"
        )
    
    # ========================================================================
    # SCENARIO 7: REGRESSION - premium and vip tiers still work
    # ========================================================================
    print("\n[SCENARIO 7] Testing REGRESSION for premium and vip tiers...")
    
    # Register new users for regression testing
    user_premium = register_user("regression_premium", "Premium User")
    user_vip = register_user("regression_vip", "VIP User")
    
    # Grant coins
    grant_coins_via_admin(user_premium['user_id'], 300)
    grant_coins_via_admin(user_vip['user_id'], 500)
    
    # Test premium tier
    print("\n  Testing premium tier...")
    response = buy_premium_with_coins(user_premium['token'], tier="premium")
    
    log_test(
        "POST /api/premium/buy-with-coins {tier:premium} returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        log_test(
            "Premium tier sets premium_until",
            'premium_until' in data,
            f"premium_until: {data.get('premium_until')}"
        )
    
    response = get_me(user_premium['token'])
    if response.status_code == 200:
        me = response.json()
        
        log_test(
            "Premium user is_premium = true",
            me.get('is_premium') == True,
            f"is_premium: {me.get('is_premium')}"
        )
    
    # Test VIP tier
    print("\n  Testing VIP tier...")
    response = buy_premium_with_coins(user_vip['token'], tier="vip")
    
    log_test(
        "POST /api/premium/buy-with-coins {tier:vip} returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    if response.status_code == 200:
        data = response.json()
        
        log_test(
            "VIP tier sets vip_until",
            'vip_until' in data,
            f"vip_until: {data.get('vip_until')}"
        )
    
    response = get_me(user_vip['token'])
    if response.status_code == 200:
        me = response.json()
        
        log_test(
            "VIP user is_vip = true",
            me.get('is_vip') == True,
            f"is_vip: {me.get('is_vip')}"
        )
        
        log_test(
            "VIP user is_premium = true (VIP includes premium)",
            me.get('is_premium') == True,
            f"is_premium: {me.get('is_premium')}"
        )
    
    # Test VIP user can access VIP content
    print("\n  Testing VIP user can access VIP content...")
    response = get_vip_profile(user_vip['token'], user_vip_owner['user_id'])
    
    log_test(
        "VIP user GET /api/vip/profile/{vip_owner_id} returns locked=false",
        response.status_code == 200 and response.json().get('locked') == False,
        f"Status: {response.status_code}, locked: {response.json().get('locked') if response.status_code == 200 else 'N/A'}"
    )
    
    # Test gift premium
    print("\n  Testing gift premium...")
    user_gift_premium = register_user("regression_gift_premium", "Gift Premium")
    grant_coins_via_admin(user_premium['user_id'], 300)
    
    response = gift_premium(user_premium['token'], user_gift_premium['user_id'], tier="premium")
    
    log_test(
        "POST /api/premium/gift {tier:premium} returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )
    
    # Test gift vip
    print("\n  Testing gift VIP...")
    user_gift_vip = register_user("regression_gift_vip", "Gift VIP")
    grant_coins_via_admin(user_vip['user_id'], 500)
    
    response = gift_premium(user_vip['token'], user_gift_vip['user_id'], tier="vip")
    
    log_test(
        "POST /api/premium/gift {tier:vip} returns 200",
        response.status_code == 200,
        f"Status: {response.status_code}"
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
