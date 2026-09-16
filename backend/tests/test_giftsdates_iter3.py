"""GiftsDates iteration 3 backend tests:
photos, notifications, referrals, premium boost, payout accounts, admin, withdrawals."""
import os, io, uuid, time, pytest, requests
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gifts-meet.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

_mongo = MongoClient(MONGO_URL)[DB_NAME]

ADMIN_EMAIL = "admin@giftsdates.com"
ADMIN_PWD = "TestPass123!"

# ---- shared state across tests
STATE = {}


def _register(suffix, referral_code=None):
    email = f"TEST_it3_{suffix}_{uuid.uuid4().hex[:6]}@giftsdates.com"
    payload = {"email": email, "password": "TestPass123!", "name": f"T{suffix}",
               "age": 28, "gender": "female", "interested_in": "male",
               "city": "Paris", "country": "France", "bio": "hi"}
    if referral_code: payload["referral_code"] = referral_code
    r = requests.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, r.text
    j = r.json()
    return j["token"], j["user"], email


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---- Referral tests
class TestReferrals:
    def test_a_register_no_referral(self):
        tok, u, email = _register("A")
        assert len(u["referral_code"]) == 8
        assert u.get("referred_by") is None
        STATE["A"] = {"token": tok, "user": u, "email": email}

    def test_b_register_with_referral(self):
        code = STATE["A"]["user"]["referral_code"]
        tok, u, email = _register("B", referral_code=code)
        assert u["referred_by"] == STATE["A"]["user"]["id"]
        STATE["B"] = {"token": tok, "user": u, "email": email}

    def test_c_register_invalid_referral(self):
        tok, u, _ = _register("C", referral_code="ZZZZZZZZ")
        assert u.get("referred_by") is None
        STATE["C"] = {"token": tok, "user": u}

    def test_d_referrals_endpoint(self):
        r = requests.get(f"{API}/referrals", headers=_auth(STATE["A"]["token"]))
        assert r.status_code == 200
        j = r.json()
        assert j["code"] == STATE["A"]["user"]["referral_code"]
        assert j["bonus"] == 100
        assert any(inv.get("name") == STATE["B"]["user"]["name"] for inv in j["invited"])
        assert j["earned"] == 0


# ---- Photo tests
def _make_png_bytes():
    # minimal PNG (1x1)
    import base64
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    )


class TestPhotos:
    def test_a_upload_photo(self):
        tok = STATE["A"]["token"]
        files = {"file": ("p.png", _make_png_bytes(), "image/png")}
        r = requests.post(f"{API}/profile/photos", headers=_auth(tok), files=files)
        assert r.status_code == 200, r.text
        assert len(r.json()["photos"]) == 1
        STATE["A"]["photo1"] = r.json()["photos"][0]

    def test_b_upload_non_image_rejected(self):
        tok = STATE["A"]["token"]
        files = {"file": ("x.txt", b"hello", "text/plain")}
        r = requests.post(f"{API}/profile/photos", headers=_auth(tok), files=files)
        assert r.status_code == 400

    def test_c_upload_second_photo(self):
        tok = STATE["A"]["token"]
        files = {"file": ("p2.png", _make_png_bytes(), "image/png")}
        r = requests.post(f"{API}/profile/photos", headers=_auth(tok), files=files)
        assert r.status_code == 200
        assert len(r.json()["photos"]) == 2
        STATE["A"]["photo2"] = r.json()["photos"][1]

    def test_d_set_primary(self):
        tok = STATE["A"]["token"]
        p2 = STATE["A"]["photo2"]
        r = requests.post(f"{API}/profile/photos/primary", headers=_auth(tok), json={"path": p2})
        assert r.status_code == 200
        assert r.json()["photos"][0] == p2

    def test_e_download_photo(self):
        tok = STATE["A"]["token"]
        p2 = STATE["A"]["photo2"]
        r = requests.get(f"{API}/files/{p2}", headers=_auth(tok))
        assert r.status_code == 200
        assert len(r.content) > 0

    def test_f_delete_photo(self):
        tok = STATE["A"]["token"]
        p1 = STATE["A"]["photo1"]
        r = requests.delete(f"{API}/profile/photos", headers=_auth(tok), json={"path": p1})
        assert r.status_code == 200
        assert p1 not in r.json()["photos"]

    def test_g_max_photos(self):
        tok = STATE["A"]["token"]
        # currently 1 photo remaining (p2). Add up to 6.
        for _ in range(5):
            files = {"file": ("p.png", _make_png_bytes(), "image/png")}
            r = requests.post(f"{API}/profile/photos", headers=_auth(tok), files=files)
            assert r.status_code == 200
        # 7th should fail
        files = {"file": ("p.png", _make_png_bytes(), "image/png")}
        r = requests.post(f"{API}/profile/photos", headers=_auth(tok), files=files)
        assert r.status_code == 400


# ---- Match + Notifications
class TestNotifications:
    def test_a_mutual_like_creates_match_notifications(self):
        A_id, B_id = STATE["A"]["user"]["id"], STATE["B"]["user"]["id"]
        r1 = requests.post(f"{API}/likes", headers=_auth(STATE["A"]["token"]), json={"target_id": B_id})
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/likes", headers=_auth(STATE["B"]["token"]), json={"target_id": A_id})
        assert r2.status_code == 200
        assert r2.json()["matched"] is True

    def test_b_notifications_returned(self):
        for who in ("A", "B"):
            r = requests.get(f"{API}/notifications", headers=_auth(STATE[who]["token"]))
            assert r.status_code == 200
            j = r.json()
            assert j["unread"] >= 1
            match_items = [i for i in j["items"] if i["type"] == "match"]
            assert len(match_items) >= 1
            assert match_items[0]["data"].get("conversation_id")

    def test_c_mark_read(self):
        r = requests.post(f"{API}/notifications/read", headers=_auth(STATE["A"]["token"]))
        assert r.status_code == 200
        r = requests.get(f"{API}/notifications", headers=_auth(STATE["A"]["token"]))
        assert r.json()["unread"] == 0

    def test_d_email_outbox(self):
        # both match notifications had email=True
        count = _mongo.email_outbox.count_documents({"to": STATE["A"]["email"]})
        assert count >= 1


# ---- Boosted premium search
class TestBoostedSearch:
    def test_a_set_premium_and_verify_order(self):
        # Make user C premium
        future = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        _mongo.users.update_one({"id": STATE["C"]["user"]["id"]}, {"$set": {"premium_until": future, "city": "Paris"}})
        # Query from A perspective; expect C (premium) among results and be first among Paris users
        r = requests.get(f"{API}/profiles?city=Paris&limit=40", headers=_auth(STATE["A"]["token"]))
        assert r.status_code == 200
        profiles = r.json()
        assert len(profiles) >= 1
        # first premium user must appear before any non-premium
        c_index = next((i for i, p in enumerate(profiles) if p["id"] == STATE["C"]["user"]["id"]), -1)
        assert c_index >= 0, "premium user missing"
        assert profiles[c_index]["is_premium"] is True
        # No non-premium before c_index
        for p in profiles[:c_index]:
            assert p["is_premium"] is True

    def test_b_filters_still_work(self):
        r = requests.get(f"{API}/profiles?gender=female&min_age=18&max_age=99", headers=_auth(STATE["A"]["token"]))
        assert r.status_code == 200
        for p in r.json():
            assert p["gender"] == "female"


# ---- Payout account + withdraw
class TestPayoutAndAdmin:
    def test_a_withdraw_before_verify_blocked(self):
        # give A some withdrawable via gift from B
        A_id = STATE["A"]["user"]["id"]
        # B needs coins already (100 welcome). Send a rose (50).
        r = requests.post(f"{API}/gifts/send", headers=_auth(STATE["B"]["token"]),
                          json={"target_id": A_id, "gift_id": "rose", "message": "hi"})
        assert r.status_code == 200, r.text
        # A now has withdrawable 50
        r = requests.post(f"{API}/wallet/withdraw", headers=_auth(STATE["A"]["token"]), json={"amount": 10})
        assert r.status_code == 400
        assert "not verified" in r.text.lower()

    def test_b_submit_payout_account(self):
        r = requests.post(f"{API}/wallet/payout-account", headers=_auth(STATE["A"]["token"]),
                          json={"holder_name": "Alice", "bank_name": "BNP", "iban": "FR7630001007941234567890185",
                                "country": "FR", "swift": "BNPAFRPP"})
        assert r.status_code == 200
        assert r.json()["status"] == "pending"

    def test_c_wallet_includes_payout(self):
        r = requests.get(f"{API}/wallet", headers=_auth(STATE["A"]["token"]))
        assert r.status_code == 200
        j = r.json()
        assert j["payout_account"]["status"] == "pending"
        assert j["withdraw_commission"] == 0.3
        assert j["is_admin"] is False

    def test_d_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PWD})
        assert r.status_code == 200, r.text
        STATE["ADMIN"] = r.json()

    def test_e_non_admin_forbidden(self):
        r = requests.get(f"{API}/admin/payout-accounts", headers=_auth(STATE["A"]["token"]))
        assert r.status_code == 403

    def test_f_admin_lists_pending(self):
        r = requests.get(f"{API}/admin/payout-accounts", headers=_auth(STATE["ADMIN"]["token"]))
        assert r.status_code == 200
        assert any(a["user_id"] == STATE["A"]["user"]["id"] for a in r.json())

    def test_g_admin_verify_approve(self):
        r = requests.post(f"{API}/admin/payout-accounts/{STATE['A']['user']['id']}/verify",
                          headers=_auth(STATE["ADMIN"]["token"]), json={"approve": True})
        assert r.status_code == 200
        assert r.json()["status"] == "verified"

    def test_h_withdraw_after_verified(self):
        tok = STATE["A"]["token"]
        # A's withdrawable: 50 (from gift). Withdraw 10.
        before = requests.get(f"{API}/wallet", headers=_auth(tok)).json()
        w_before = before["withdrawable"]
        r = requests.post(f"{API}/wallet/withdraw", headers=_auth(tok), json={"amount": 10})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["fee"] == 3.0  # 10 * 0.3
        assert j["net"] == 7.0
        assert j["usd"] == 0.07
        after = requests.get(f"{API}/wallet", headers=_auth(tok)).json()
        assert round(after["withdrawable"], 2) == round(w_before - 10, 2)
        STATE["WITHDRAWAL_ID"] = j["id"]

    def test_i_admin_reject_refunds(self):
        # create another withdrawal to reject
        tok = STATE["A"]["token"]
        r = requests.post(f"{API}/wallet/withdraw", headers=_auth(tok), json={"amount": 5})
        assert r.status_code == 200
        wid = r.json()["id"]
        before = requests.get(f"{API}/wallet", headers=_auth(tok)).json()["withdrawable"]
        r = requests.post(f"{API}/admin/withdrawals/{wid}/rejected", headers=_auth(STATE["ADMIN"]["token"]))
        assert r.status_code == 200
        after = requests.get(f"{API}/wallet", headers=_auth(tok)).json()["withdrawable"]
        assert round(after - before, 2) == 5.0

    def test_j_admin_mark_paid(self):
        r = requests.post(f"{API}/admin/withdrawals/{STATE['WITHDRAWAL_ID']}/paid",
                          headers=_auth(STATE["ADMIN"]["token"]))
        assert r.status_code == 200
        assert r.json()["status"] == "paid"


# cleanup
@pytest.fixture(scope="session", autouse=True)
def cleanup():
    yield
    for who in ("A", "B", "C"):
        if who in STATE:
            uid = STATE[who]["user"]["id"]
            _mongo.users.delete_many({"id": uid})
            _mongo.notifications.delete_many({"user_id": uid})
            _mongo.email_outbox.delete_many({"to": STATE[who].get("email", "")})
            _mongo.payout_accounts.delete_many({"user_id": uid})
            _mongo.withdrawals.delete_many({"user_id": uid})
            _mongo.transactions.delete_many({"$or": [{"from_id": uid}, {"to_id": uid}]})
            _mongo.likes.delete_many({"$or": [{"from_id": uid}, {"to_id": uid}]})
            _mongo.matches.delete_many({"users": uid})
            _mongo.conversations.delete_many({"users": uid})
            _mongo.files.delete_many({"user_id": uid})
