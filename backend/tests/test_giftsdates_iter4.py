"""GiftsDates iteration 4 backend tests: advanced profile filters, profile detail endpoint, admin pricing settings."""
import os, time, uuid, requests, pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://gifts-meet.preview.emergentagent.com").rstrip("/")
API = BASE_URL + "/api"

# ------- Shared state / fixtures -------
STATE = {}

def _register(suffix, **overrides):
    email = f"test_iter4_{suffix}_{uuid.uuid4().hex[:6]}@giftsdates.com"
    payload = {"email": email, "password": "TestPass123!", "name": f"User {suffix}",
               "age": 28, "gender": "female", "interested_in": "male", "city": "Paris", "country": "France"}
    payload.update(overrides)
    r = requests.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    return d["token"], d["user"]


@pytest.fixture(scope="module", autouse=True)
def setup_users():
    tok_a, ua = _register("A", gender="female", interested_in="male")
    tok_b, ub = _register("B", gender="male", interested_in="female", city="Paris")
    STATE["a"] = (tok_a, ua); STATE["b"] = (tok_b, ub)

    # PATCH user A with filter-friendly attributes
    r = requests.patch(f"{API}/auth/me",
        headers={"Authorization": f"Bearer {tok_a}"},
        json={"relationship_intent": "serious", "height": 170, "kids": "none",
              "smoking": "never", "religion": "christian"}, timeout=30)
    assert r.status_code == 200, r.text
    assert r.json()["height"] == 170
    yield


# ------- Advanced filters (list_profiles) -------
class TestAdvancedFilters:
    def test_matches_all_filters(self):
        tok_b = STATE["b"][0]
        r = requests.get(f"{API}/profiles",
            params={"intent":"serious","min_height":160,"max_height":180,
                    "kids":"none","smoking":"never","religion":"christian"},
            headers={"Authorization": f"Bearer {tok_b}"}, timeout=30)
        assert r.status_code == 200, r.text
        ids = [p["id"] for p in r.json()]
        assert STATE["a"][1]["id"] in ids

    def test_wrong_intent_excludes(self):
        tok_b = STATE["b"][0]
        r = requests.get(f"{API}/profiles", params={"intent":"marriage"},
            headers={"Authorization": f"Bearer {tok_b}"}, timeout=30)
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert STATE["a"][1]["id"] not in ids

    def test_invalid_height_returns_400(self):
        tok_a = STATE["a"][0]
        r = requests.patch(f"{API}/auth/me",
            headers={"Authorization": f"Bearer {tok_a}"},
            json={"height": 30}, timeout=30)
        assert r.status_code == 400


# ------- Profile detail -------
class TestProfileDetail:
    def test_detail_shape_and_liked_by_me(self):
        tok_b, ub = STATE["b"]
        tok_a, ua = STATE["a"]
        r = requests.get(f"{API}/profiles/{ua['id']}",
            headers={"Authorization": f"Bearer {tok_b}"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["is_premium"] is False
        assert d["liked_by_me"] is False
        for k in ("email","password","referral_code"):
            assert k not in d, f"forbidden key {k} leaked"
        assert d["conversation_id"] is None

        # POST a like from B to A -> liked_by_me should turn True
        r2 = requests.post(f"{API}/likes", json={"target_id": ua["id"]},
            headers={"Authorization": f"Bearer {tok_b}"}, timeout=30)
        assert r2.status_code == 200
        r3 = requests.get(f"{API}/profiles/{ua['id']}",
            headers={"Authorization": f"Bearer {tok_b}"}, timeout=30)
        assert r3.json()["liked_by_me"] is True

    def test_mutual_like_sets_conversation_id(self):
        tok_a, ua = STATE["a"]
        tok_b, ub = STATE["b"]
        # A likes B (B already liked A)
        r = requests.post(f"{API}/likes", json={"target_id": ub["id"]},
            headers={"Authorization": f"Bearer {tok_a}"}, timeout=30)
        assert r.status_code == 200
        d = requests.get(f"{API}/profiles/{ub['id']}",
            headers={"Authorization": f"Bearer {tok_a}"}, timeout=30).json()
        assert d["conversation_id"], "conversation_id should be set after mutual like"

    def test_unknown_id_404(self):
        tok_a = STATE["a"][0]
        r = requests.get(f"{API}/profiles/nonexistent-id-{uuid.uuid4()}",
            headers={"Authorization": f"Bearer {tok_a}"}, timeout=30)
        assert r.status_code == 404


# ------- Admin pricing settings -------
ADMIN_EMAIL = "admin@giftsdates.com"
ADMIN_PASS = "TestPass123!"

def _admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


class TestAdminSettings:
    def test_non_admin_forbidden(self):
        tok_a = STATE["a"][0]
        r = requests.get(f"{API}/admin/settings", headers={"Authorization": f"Bearer {tok_a}"}, timeout=30)
        assert r.status_code == 403

    def test_admin_get_defaults(self):
        tok = _admin_token()
        r = requests.get(f"{API}/admin/settings", headers={"Authorization": f"Bearer {tok}"}, timeout=30)
        assert r.status_code == 200
        s = r.json()
        assert s["premium_amount"] == 29.99
        assert s["referral_bonus"] == 100
        assert abs(s["commission"] - 0.3) < 1e-6
        assert len(s["gifts"]) == 6
        assert len(s["coin_packages"]) == 3
        STATE["defaults"] = s

    def test_put_updates_and_reflects_in_meta_and_wallet(self):
        tok = _admin_token()
        base = STATE["defaults"]
        new_gifts = []
        for g in base["gifts"]:
            g2 = dict(g)
            if g2["id"] == "rose": g2["cost"] = 77
            new_gifts.append(g2)
        payload = {
            "gifts": new_gifts,
            "coin_packages": base["coin_packages"],
            "premium_amount": 19.99,
            "video_rate": base["video_rate"],
            "date_min_coins": base["date_min_coins"],
            "referral_bonus": 150,
            "commission": 0.25,
        }
        r = requests.put(f"{API}/admin/settings", json=payload,
            headers={"Authorization": f"Bearer {tok}"}, timeout=30)
        assert r.status_code == 200, r.text
        s = r.json()
        assert s["premium_amount"] == 19.99
        assert s["referral_bonus"] == 150
        assert next(g for g in s["gifts"] if g["id"]=="rose")["cost"] == 77

        # meta reflects
        m = requests.get(f"{API}/meta", timeout=30).json()
        assert m["premium"]["amount"] == 19.99
        assert m["referral_bonus"] == 150
        assert next(g for g in m["gifts"] if g["id"]=="rose")["cost"] == 77

        # wallet withdraw_commission reflects
        tok_a = STATE["a"][0]
        w = requests.get(f"{API}/wallet", headers={"Authorization": f"Bearer {tok_a}"}, timeout=30).json()
        assert abs(w["withdraw_commission"] - 0.25) < 1e-6

    def test_gift_send_uses_new_cost(self):
        # A has 100 welcome coins; sending rose should deduct 77 -> 23 remaining
        tok_a, ua = STATE["a"]
        tok_b, ub = STATE["b"]
        pre = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok_a}"}, timeout=30).json()
        coins_before = pre["coins"]
        r = requests.post(f"{API}/gifts/send", json={"target_id": ub["id"], "gift_id": "rose"},
            headers={"Authorization": f"Bearer {tok_a}"}, timeout=30)
        assert r.status_code == 200, r.text
        post = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok_a}"}, timeout=30).json()
        assert coins_before - post["coins"] == 77

    def test_invalid_commission_400(self):
        tok = _admin_token()
        base = STATE["defaults"]
        payload = {
            "gifts": base["gifts"], "coin_packages": base["coin_packages"],
            "premium_amount": base["premium_amount"], "video_rate": base["video_rate"],
            "date_min_coins": base["date_min_coins"], "referral_bonus": base["referral_bonus"],
            "commission": 1.5,
        }
        r = requests.put(f"{API}/admin/settings", json=payload,
            headers={"Authorization": f"Bearer {tok}"}, timeout=30)
        assert r.status_code == 400

    def test_restore_defaults(self):
        tok = _admin_token()
        base = STATE["defaults"]
        # Ensure rose=50, premium=29.99, bonus=100, commission=0.3
        gifts = []
        for g in base["gifts"]:
            g2 = dict(g)
            if g2["id"] == "rose": g2["cost"] = 50
            gifts.append(g2)
        payload = {
            "gifts": gifts, "coin_packages": base["coin_packages"],
            "premium_amount": 29.99, "video_rate": base["video_rate"],
            "date_min_coins": base["date_min_coins"], "referral_bonus": 100,
            "commission": 0.3,
        }
        r = requests.put(f"{API}/admin/settings", json=payload,
            headers={"Authorization": f"Bearer {tok}"}, timeout=30)
        assert r.status_code == 200
        s = r.json()
        assert s["premium_amount"] == 29.99
        assert s["referral_bonus"] == 100
        assert abs(s["commission"] - 0.3) < 1e-6
        assert next(g for g in s["gifts"] if g["id"]=="rose")["cost"] == 50
