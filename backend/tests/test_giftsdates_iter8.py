"""Iter8 backend tests:
- File upload/download happy path (storage init_storage() fail-fast; happy path still works, no 503).
- Chat photo end-to-end regression (MEDIA_LOCKED before confirmed date, success after).
- Taxi gift endpoints: request/send/decline auth, duplicate pending, coin flow, commission tx.
"""
import os, io, uuid, secrets, string, asyncio, pytest, requests
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
BASE = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE:
    for ln in open("/app/frontend/.env"):
        if ln.startswith("REACT_APP_BACKEND_URL="):
            BASE = ln.split("=", 1)[1].strip()
BASE = BASE.rstrip("/")
API = f"{BASE}/api"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

# 1x1 valid PNG
PNG_BYTES = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
             b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf"
             b"\xc0\x00\x00\x00\x03\x00\x01\xdb\x87\xc4\xc9\x00\x00\x00\x00IEND\xaeB`\x82")


def _rand(n=6):
    return "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(n))


def _register(suffix="a", gender="male", interested_in="female"):
    email = f"TEST_iter8_{_rand()}_{suffix}@t.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "TestPass123!", "name": f"U{suffix}{_rand(3)}",
        "age": 28, "gender": gender, "city": "Paris", "country": "France",
        "interested_in": interested_in, "orientation": "straight"
    }, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"token": d["token"], "id": d["user"]["id"], "email": email}


def _hdr(u):
    return {"Authorization": f"Bearer {u['token']}"}


def _jhdr(u):
    return {**_hdr(u), "Content-Type": "application/json"}


def _run(coro):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError
    except Exception:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@pytest.fixture(scope="module")
def db():
    cli = AsyncIOMotorClient(MONGO_URL)
    yield cli[DB_NAME]
    cli.close()


@pytest.fixture(scope="module")
def matched_pair(db):
    """A and B are mutually liked -> match. C is stranger. Also seed a confirmed date for taxi tests."""
    A = _register("A", "male", "female")
    B = _register("B", "female", "male")
    C = _register("C", "male", "female")
    r1 = requests.post(f"{API}/likes", headers=_jhdr(A), json={"target_id": B["id"]})
    assert r1.status_code == 200
    r2 = requests.post(f"{API}/likes", headers=_jhdr(B), json={"target_id": A["id"]})
    assert r2.status_code == 200
    matches = requests.get(f"{API}/matches", headers=_hdr(A)).json()
    conv = next((m for m in matches if m["user"]["id"] == B["id"]), None)
    assert conv, "no match"
    return {"A": A, "B": B, "C": C, "cid": conv["conversation_id"]}


# ---------- Storage fail-fast: happy-path upload/download ----------
class TestUploadHappyPath:
    def test_upload_returns_path_no_503(self, matched_pair):
        A = matched_pair["A"]
        files = {"file": ("t.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(f"{API}/upload", headers=_hdr(A), files=files)
        assert r.status_code == 200, f"upload should succeed (no 503), got {r.status_code} {r.text}"
        d = r.json()
        assert d.get("path"), f"no path in response: {d}"
        assert d.get("url", "").startswith("/api/files/")
        matched_pair["upload_path"] = d["path"]

    def test_download_returns_bytes(self, matched_pair):
        A = matched_pair["A"]
        path = matched_pair.get("upload_path")
        assert path, "upload path missing"
        r = requests.get(f"{API}/files/{path}", headers=_hdr(A))
        assert r.status_code == 200, f"download failed: {r.status_code} {r.text}"
        assert r.content == PNG_BYTES or r.content.startswith(b"\x89PNG"), "bytes mismatch"

    def test_profile_photo_upload_and_download(self, matched_pair):
        A = matched_pair["A"]
        files = {"file": ("p.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(f"{API}/profile/photos", headers=_hdr(A), files=files)
        assert r.status_code == 200, r.text
        photos = r.json().get("photos") or []
        assert photos, "no photos returned"
        p = photos[-1]
        # public (non-private) file: any authed user, or even anon, should read
        r2 = requests.get(f"{API}/files/{p}", headers=_hdr(A))
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("image/")


# ---------- Chat photo regression (MEDIA_LOCKED then success) ----------
class TestChatPhotoRegression:
    def test_locked_before_confirmed_date(self, matched_pair):
        A = matched_pair["A"]; cid = matched_pair["cid"]
        files = {"file": ("c.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(f"{API}/conversations/{cid}/photo", headers=_hdr(A), files=files)
        assert r.status_code == 403
        assert "MEDIA_LOCKED" in r.text

    def test_success_after_confirmed_date(self, matched_pair, db):
        A = matched_pair["A"]; B = matched_pair["B"]; cid = matched_pair["cid"]
        now = datetime.now(timezone.utc).isoformat()
        bid = str(uuid.uuid4())
        _run(db.date_bookings.insert_one({
            "id": bid, "from_id": A["id"], "to_id": B["id"],
            "status": "confirmed", "created_at": now, "confirmed_at": now,
            "scheduled_at": now, "coins": 300, "venue": "Cafe", "cost": 300,
        }))
        matched_pair["bid"] = bid
        files = {"file": ("c.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(f"{API}/conversations/{cid}/photo", headers=_hdr(A), files=files)
        assert r.status_code == 200, r.text
        msg = r.json()
        assert msg["type"] == "image"
        # B should be able to download the image
        r2 = requests.get(f"{API}/files/{msg['image_path']}", headers=_hdr(B))
        assert r2.status_code == 200


# ---------- Taxi gift ----------
class TestTaxi:
    @pytest.fixture(scope="class")
    def taxi_setup(self, db):
        """Independent pair X (booker) and Y (recipient) with a confirmed booking and coin balances."""
        X = _register("X", "male", "female")  # booker
        Y = _register("Y", "female", "male")  # recipient (invited)
        Z = _register("Z", "male", "female")  # third-party stranger
        now = datetime.now(timezone.utc).isoformat()
        bid = str(uuid.uuid4())
        _run(db.date_bookings.insert_one({
            "id": bid, "from_id": X["id"], "to_id": Y["id"],
            "status": "confirmed", "created_at": now, "confirmed_at": now,
            "scheduled_at": now, "coins": 300, "venue": "Bistro", "cost": 300,
        }))
        # Boost booker coins so they can afford the taxi
        _run(db.users.update_one({"id": X["id"]}, {"$set": {"coins": 1000}}))
        return {"X": X, "Y": Y, "Z": Z, "bid": bid}

    def test_booker_cannot_request(self, taxi_setup):
        r = requests.post(f"{API}/dates/taxi/request/{taxi_setup['bid']}",
                          headers=_jhdr(taxi_setup["X"]), json={"coins": 50})
        assert r.status_code == 403

    def test_recipient_request_creates_pending(self, taxi_setup):
        r = requests.post(f"{API}/dates/taxi/request/{taxi_setup['bid']}",
                          headers=_jhdr(taxi_setup["Y"]), json={"coins": 100})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["taxi"]["status"] == "pending"
        assert j["taxi"]["coins"] == 100

    def test_duplicate_request_returns_taxi_pending(self, taxi_setup):
        r = requests.post(f"{API}/dates/taxi/request/{taxi_setup['bid']}",
                          headers=_jhdr(taxi_setup["Y"]), json={"coins": 100})
        assert r.status_code == 400
        assert "TAXI_PENDING" in r.text

    def test_recipient_cannot_send(self, taxi_setup):
        r = requests.post(f"{API}/dates/taxi/send/{taxi_setup['bid']}",
                          headers=_hdr(taxi_setup["Y"]))
        assert r.status_code == 403

    def test_booker_send_deducts_and_credits(self, taxi_setup, db):
        X = taxi_setup["X"]; Y = taxi_setup["Y"]; bid = taxi_setup["bid"]
        x_before = _run(db.users.find_one({"id": X["id"]}))
        y_before = _run(db.users.find_one({"id": Y["id"]}))
        r = requests.post(f"{API}/dates/taxi/send/{bid}", headers=_hdr(X))
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["coins"] == 100
        x_after = _run(db.users.find_one({"id": X["id"]}))
        y_after = _run(db.users.find_one({"id": Y["id"]}))
        assert x_after["coins"] == x_before["coins"] - 100
        assert (y_after.get("withdrawable", 0) - y_before.get("withdrawable", 0)) == 100
        # booking taxi.status now sent
        b = _run(db.date_bookings.find_one({"id": bid}))
        assert b["taxi"]["status"] == "sent"
        # tx recorded with gift_id=taxi
        tx = _run(db.transactions.find_one({"from_id": X["id"], "to_id": Y["id"], "gift_id": "taxi"}))
        assert tx is not None, "taxi tx not recorded"
        # commission ~30% (per settings; default was CANCEL... commission from settings)
        # We only assert a commission field is present and non-zero (rate is env-configurable).
        assert "commission" in tx and tx["commission"] > 0

    def test_second_send_returns_400(self, taxi_setup):
        r = requests.post(f"{API}/dates/taxi/send/{taxi_setup['bid']}",
                          headers=_hdr(taxi_setup["X"]))
        assert r.status_code == 400

    def test_decline_then_recipient_may_rerequest(self, db):
        # Fresh pair for decline flow
        X = _register("Xd", "male", "female")
        Y = _register("Yd", "female", "male")
        now = datetime.now(timezone.utc).isoformat()
        bid = str(uuid.uuid4())
        _run(db.date_bookings.insert_one({
            "id": bid, "from_id": X["id"], "to_id": Y["id"],
            "status": "confirmed", "created_at": now, "confirmed_at": now,
            "scheduled_at": now, "coins": 300, "venue": "Diner", "cost": 300,
        }))
        # Y requests
        r = requests.post(f"{API}/dates/taxi/request/{bid}", headers=_jhdr(Y), json={"coins": 40})
        assert r.status_code == 200, r.text
        # Y cannot decline
        rY = requests.post(f"{API}/dates/taxi/decline/{bid}", headers=_hdr(Y))
        assert rY.status_code == 403
        # X declines
        rX = requests.post(f"{API}/dates/taxi/decline/{bid}", headers=_hdr(X))
        assert rX.status_code == 200
        b = _run(db.date_bookings.find_one({"id": bid}))
        assert b["taxi"]["status"] == "declined"
        # Y can re-request
        r2 = requests.post(f"{API}/dates/taxi/request/{bid}", headers=_jhdr(Y), json={"coins": 60})
        assert r2.status_code == 200, r2.text
        assert r2.json()["taxi"]["status"] == "pending"

    def test_taxi_visible_in_get_dates(self, taxi_setup):
        # booker sees taxi info on outgoing booking
        r = requests.get(f"{API}/dates", headers=_hdr(taxi_setup["X"]))
        assert r.status_code == 200
        d = r.json()
        out = next((b for b in d.get("outgoing", []) if b["id"] == taxi_setup["bid"]), None)
        assert out is not None, "booking not in outgoing"
        assert out.get("taxi", {}).get("status") == "sent"
