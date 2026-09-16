"""Iteration 6 backend tests: likes/received (free vs premium), like-back match creation,
top_givers on /profiles/{id}, and light regression on chat message + gift."""
import os, uuid, secrets, string, pytest, requests
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE:
    # fallback to frontend env for local test invocation
    with open("/app/frontend/.env") as f:
        for ln in f:
            if ln.startswith("REACT_APP_BACKEND_URL"):
                BASE = ln.split("=", 1)[1].strip().strip('"').rstrip("/")
API = f"{BASE}/api"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

def _rand(n=6): return "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(n))

def _register(suffix="a"):
    email = f"TEST_iter6_{_rand()}_{suffix}@t.com"
    payload = {"email": email, "password": "TestPass123!", "name": f"U{suffix}{_rand(3)}",
               "age": 28, "gender": "male", "city": "Paris", "country": "France",
               "interested_in": "female", "orientation": "straight"}
    r = requests.post(f"{API}/auth/register", json=payload, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"token": d["token"], "id": d["user"]["id"], "email": email, "name": d["user"]["name"]}

def _hdr(u): return {"Authorization": f"Bearer {u['token']}", "Content-Type": "application/json"}

@pytest.fixture(scope="module")
def mongo():
    import asyncio
    cli = AsyncIOMotorClient(MONGO_URL)
    yield cli[DB_NAME]
    cli.close()

@pytest.fixture(scope="module")
def users():
    # A liker, B liker, C target (receiver of likes)
    a = _register("A"); b = _register("B"); c = _register("C"); d = _register("D")
    return {"A": a, "B": b, "C": c, "D": d}

async def _set_premium(db, uid, days=7):
    fut = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    await db.users.update_one({"id": uid}, {"$set": {"premium_until": fut}})

async def _clear_premium(db, uid):
    await db.users.update_one({"id": uid}, {"$unset": {"premium_until": ""}})


class TestLikesReceived:
    def test_free_hides_name(self, users, mongo):
        import asyncio
        A, B, C = users["A"], users["B"], users["C"]
        # A likes C, B likes C
        for u in (A, B):
            r = requests.post(f"{API}/likes", headers=_hdr(u), json={"target_id": C["id"]})
            assert r.status_code == 200, r.text
        # C is free by default
        r = requests.get(f"{API}/likes/received", headers=_hdr(C))
        assert r.status_code == 200
        data = r.json()
        assert data["premium"] is False
        assert data["count"] >= 2
        for it in data["items"]:
            assert "name" not in it and "age" not in it, f"free must not expose name/age: {it}"
            assert "id" in it and "liked_at" in it
            assert "photos" in it

    def test_premium_shows_name(self, users, mongo):
        import asyncio
        C = users["C"]
        asyncio.get_event_loop().run_until_complete(_set_premium(mongo, C["id"]))
        r = requests.get(f"{API}/likes/received", headers=_hdr(C))
        assert r.status_code == 200
        data = r.json()
        assert data["premium"] is True
        assert data["count"] >= 2
        for it in data["items"]:
            assert "name" in it
        asyncio.get_event_loop().run_until_complete(_clear_premium(mongo, C["id"]))

    def test_like_back_creates_match_and_removes_from_strip(self, users, mongo):
        import asyncio
        A, C = users["A"], users["C"]
        # ensure C premium so full items returned (irrelevant for like-back logic though)
        asyncio.get_event_loop().run_until_complete(_set_premium(mongo, C["id"]))
        before = requests.get(f"{API}/likes/received", headers=_hdr(C)).json()
        before_count = before["count"]
        assert any(it["id"] == A["id"] for it in before["items"])
        # C likes A back
        r = requests.post(f"{API}/likes", headers=_hdr(C), json={"target_id": A["id"]})
        assert r.status_code == 200
        assert r.json().get("matched") is True
        # strip should not include A anymore
        after = requests.get(f"{API}/likes/received", headers=_hdr(C)).json()
        assert after["count"] == before_count - 1
        assert not any(it["id"] == A["id"] for it in after["items"])
        # match visible in /matches for C
        matches = requests.get(f"{API}/matches", headers=_hdr(C)).json()
        assert any(m["user"]["id"] == A["id"] for m in matches)
        asyncio.get_event_loop().run_until_complete(_clear_premium(mongo, C["id"]))


class TestTopGivers:
    def test_no_gifts_no_top_givers(self, users):
        D = users["D"]; A = users["A"]
        r = requests.get(f"{API}/profiles/{D['id']}", headers=_hdr(A))
        assert r.status_code == 200
        p = r.json()
        assert p["gifts_count"] == 0
        assert p["gifts_total"] == 0
        assert p["top_givers"] == []

    def test_top_givers_after_gifts(self, users, mongo):
        import asyncio
        A, B, D = users["A"], users["B"], users["D"]
        # top up coins for A and B directly in Mongo
        async def topup():
            await mongo.users.update_one({"id": A["id"]}, {"$inc": {"coins": 1000}})
            await mongo.users.update_one({"id": B["id"]}, {"$inc": {"coins": 1000}})
        asyncio.get_event_loop().run_until_complete(topup())
        # A sends 2 gifts (rose x2 at some cost), B sends 1 gift.
        # Use catalog: fetch /meta for gifts.
        meta = requests.get(f"{API}/meta").json()
        gifts = meta.get("gift_catalog") or meta.get("gifts") or []
        assert gifts, "gift catalog missing"
        cheap = sorted(gifts, key=lambda g: g["cost"])[0]
        # Ensure A/B don't accidentally form a match with D — send gift w/o triggering auto match:
        # Cheapest gift is well under auto-match threshold (100). Fine.
        for _ in range(2):
            r = requests.post(f"{API}/gifts/send", headers=_hdr(A), json={"target_id": D["id"], "gift_id": cheap["id"]})
            assert r.status_code == 200, r.text
        r = requests.post(f"{API}/gifts/send", headers=_hdr(B), json={"target_id": D["id"], "gift_id": cheap["id"]})
        assert r.status_code == 200, r.text
        # fetch profile as some viewer
        r = requests.get(f"{API}/profiles/{D['id']}", headers=_hdr(users['C']))
        assert r.status_code == 200
        p = r.json()
        assert p["gifts_count"] == 3
        assert p["gifts_total"] == 3 * cheap["cost"]
        assert len(p["top_givers"]) == 2
        # sorted by total desc → A first (2 gifts) then B
        assert p["top_givers"][0]["id"] == A["id"]
        assert p["top_givers"][0]["total"] == 2 * cheap["cost"]
        assert p["top_givers"][1]["id"] == B["id"]
        assert p["top_givers"][1]["total"] == cheap["cost"]
        for g in p["top_givers"]:
            assert "name" in g and "id" in g and "total" in g


class TestChatRegression:
    def test_send_text_and_gift(self, users, mongo):
        import asyncio
        # Create own matched pair for chat regression (loadscope may run this in a separate worker)
        A, C = users["A"], users["C"]
        requests.post(f"{API}/likes", headers=_hdr(A), json={"target_id": C["id"]})
        r = requests.post(f"{API}/likes", headers=_hdr(C), json={"target_id": A["id"]})
        assert r.status_code == 200
        matches = requests.get(f"{API}/matches", headers=_hdr(A)).json()
        conv = next((m for m in matches if m["user"]["id"] == C["id"]), None)
        assert conv, "expected A-C match"
        cid = conv["conversation_id"]
        # send text
        r = requests.post(f"{API}/conversations/messages", headers=_hdr(A),
                          json={"conversation_id": cid, "text": "Hi from iter6"})
        assert r.status_code == 200, r.text
        # top up coins for A and send gift
        async def topup():
            await mongo.users.update_one({"id": A["id"]}, {"$inc": {"coins": 500}})
        asyncio.get_event_loop().run_until_complete(topup())
        meta = requests.get(f"{API}/meta").json()
        gifts = meta.get("gift_catalog") or meta.get("gifts") or []
        cheap = sorted(gifts, key=lambda g: g["cost"])[0]
        r = requests.post(f"{API}/gifts/send", headers=_hdr(A),
                          json={"target_id": C["id"], "gift_id": cheap["id"], "conversation_id": cid})
        assert r.status_code == 200, r.text
        msgs = requests.get(f"{API}/conversations/{cid}/messages", headers=_hdr(A)).json()
        assert any(m.get("type") == "gift" for m in msgs), "no gift message in conversation"
        assert any(m.get("text") == "Hi from iter6" for m in msgs)
