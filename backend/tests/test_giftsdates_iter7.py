"""Iter7 backend tests: chat photo (MEDIA_LOCKED / success / non-image / file access), 
last_seen heartbeat + presence in /matches and /profiles/{id}."""
import os, io, uuid, secrets, string, asyncio, pytest, requests
from datetime import datetime, timezone, timedelta
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

def _rand(n=6): return "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(n))

def _register(suffix="a", gender="male", interested_in="female"):
    email = f"TEST_iter7_{_rand()}_{suffix}@t.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "TestPass123!", "name": f"U{suffix}{_rand(3)}",
        "age": 28, "gender": gender, "city": "Paris", "country": "France",
        "interested_in": interested_in, "orientation": "straight"
    }, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"token": d["token"], "id": d["user"]["id"], "email": email}

def _hdr(u): return {"Authorization": f"Bearer {u['token']}"}
def _jhdr(u): return {**_hdr(u), "Content-Type": "application/json"}

def _run(coro):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed(): raise RuntimeError
    except Exception:
        loop = asyncio.new_event_loop(); asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@pytest.fixture(scope="module")
def db():
    cli = AsyncIOMotorClient(MONGO_URL)
    yield cli[DB_NAME]
    cli.close()

@pytest.fixture(scope="module")
def matched_pair(db):
    """A and B are mutually liked -> match created. C is a stranger."""
    A = _register("A", "male", "female")
    B = _register("B", "female", "male")
    C = _register("C", "male", "female")
    # mutual likes -> match
    r1 = requests.post(f"{API}/likes", headers=_jhdr(A), json={"target_id": B["id"]})
    assert r1.status_code == 200
    r2 = requests.post(f"{API}/likes", headers=_jhdr(B), json={"target_id": A["id"]})
    assert r2.status_code == 200
    matches = requests.get(f"{API}/matches", headers=_hdr(A)).json()
    conv = next((m for m in matches if m["user"]["id"] == B["id"]), None)
    assert conv, "no match"
    return {"A": A, "B": B, "C": C, "cid": conv["conversation_id"]}


class TestChatPhotoLocked:
    def test_matches_can_share_media_false_without_date(self, matched_pair):
        A = matched_pair["A"]
        matches = requests.get(f"{API}/matches", headers=_hdr(A)).json()
        conv = next(m for m in matches if m["conversation_id"] == matched_pair["cid"])
        assert conv["can_share_media"] is False

    def test_upload_blocked_403_media_locked(self, matched_pair):
        A = matched_pair["A"]; cid = matched_pair["cid"]
        files = {"file": ("test.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(f"{API}/conversations/{cid}/photo", headers=_hdr(A), files=files)
        assert r.status_code == 403
        assert "MEDIA_LOCKED" in r.text


class TestChatPhotoUnlocked:
    def test_upload_after_confirmed_date(self, matched_pair, db):
        A = matched_pair["A"]; B = matched_pair["B"]; cid = matched_pair["cid"]
        now = datetime.now(timezone.utc).isoformat()
        # Insert a confirmed date_booking A->B
        _run(db.date_bookings.insert_one({
            "id": str(uuid.uuid4()), "from_id": A["id"], "to_id": B["id"],
            "status": "confirmed", "created_at": now, "confirmed_at": now,
            "scheduled_at": now, "cost": 100
        }))
        # can_share_media flips true
        matches = requests.get(f"{API}/matches", headers=_hdr(A)).json()
        conv = next(m for m in matches if m["conversation_id"] == cid)
        assert conv["can_share_media"] is True

        # Upload success
        files = {"file": ("test.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(f"{API}/conversations/{cid}/photo", headers=_hdr(A), files=files)
        assert r.status_code == 200, r.text
        msg = r.json()
        assert msg["type"] == "image"
        assert msg["image_path"]
        matched_pair["image_path"] = msg["image_path"]
        matched_pair["msg_id"] = msg["id"]

        # message appears in GET messages
        msgs = requests.get(f"{API}/conversations/{cid}/messages", headers=_hdr(B)).json()
        assert any(m.get("id") == msg["id"] and m.get("type") == "image" for m in msgs)

    def test_non_image_rejected_400(self, matched_pair):
        A = matched_pair["A"]; cid = matched_pair["cid"]
        files = {"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")}
        r = requests.post(f"{API}/conversations/{cid}/photo", headers=_hdr(A), files=files)
        assert r.status_code == 400

    def test_file_access_both_members_200(self, matched_pair):
        A = matched_pair["A"]; B = matched_pair["B"]
        path = matched_pair.get("image_path")
        assert path, "image_path not set - previous test must have run"
        for u in (A, B):
            r = requests.get(f"{API}/files/{path}", headers=_hdr(u))
            assert r.status_code == 200, f"member {u['id']} should access, got {r.status_code}"
            assert r.headers.get("content-type", "").startswith("image/")

    def test_file_access_stranger_403(self, matched_pair):
        C = matched_pair["C"]
        path = matched_pair["image_path"]
        r = requests.get(f"{API}/files/{path}", headers=_hdr(C))
        assert r.status_code == 403


class TestPresence:
    def test_last_seen_set_after_authed_request(self, db):
        U = _register("P", "male", "female")
        # any authed request; register already returns token; call /me
        r = requests.get(f"{API}/auth/me", headers=_hdr(U))
        assert r.status_code == 200
        u = _run(db.users.find_one({"id": U["id"]}))
        assert u.get("last_seen"), "last_seen not set"
        # parse
        ts = datetime.fromisoformat(u["last_seen"].replace("Z", "+00:00"))
        assert (datetime.now(timezone.utc) - ts).total_seconds() < 60

    def test_matches_includes_last_seen(self, matched_pair):
        A = matched_pair["A"]
        matches = requests.get(f"{API}/matches", headers=_hdr(A)).json()
        conv = next(m for m in matches if m["conversation_id"] == matched_pair["cid"])
        assert "last_seen" in conv["user"], f"user missing last_seen: keys={list(conv['user'].keys())}"

    def test_profiles_detail_includes_last_seen(self, matched_pair):
        A = matched_pair["A"]; B = matched_pair["B"]
        r = requests.get(f"{API}/profiles/{B['id']}", headers=_hdr(A))
        assert r.status_code == 200
        p = r.json()
        assert "last_seen" in p, f"profile detail missing last_seen: {list(p.keys())}"


class TestChatTextRegression:
    def test_text_send_still_works(self, matched_pair):
        A = matched_pair["A"]; cid = matched_pair["cid"]
        r = requests.post(f"{API}/conversations/messages", headers=_jhdr(A),
                          json={"conversation_id": cid, "text": "hello iter7"})
        assert r.status_code == 200
        msgs = requests.get(f"{API}/conversations/{cid}/messages", headers=_hdr(A)).json()
        assert any(m.get("text") == "hello iter7" for m in msgs)
