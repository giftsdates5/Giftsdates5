"""Iter12 backend tests: Idea Photos, Slot Calendar, Date Chat."""
import os, time, uuid, pathlib
import pytest
import requests

def _load_frontend_env():
    p = pathlib.Path("/app/frontend/.env")
    if p.exists():
        for line in p.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip()
    return None

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or _load_frontend_env()).rstrip("/") + "/api"

INV = ("premv3@example.com", "TestPass123!")
REC = ("lockv3@example.com", "TestPass123!")


def _login(email, pw):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pw}, timeout=20)
    assert r.status_code == 200, f"Login {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def _hdr(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def tokens():
    inv = _login(*INV)
    rec = _login(*REC)
    return {"inv": inv, "rec": rec}


@pytest.fixture(scope="module")
def me(tokens):
    ri = requests.get(f"{BASE}/auth/me", headers=_hdr(tokens["inv"]), timeout=15).json()
    rr = requests.get(f"{BASE}/auth/me", headers=_hdr(tokens["rec"]), timeout=15).json()
    return {"inv": ri, "rec": rr}


# --- Feature 3: Idea Photos ---
class TestIdeaPhotos:
    def test_date_ideas_has_category_image(self, tokens):
        r = requests.get(f"{BASE}/date-ideas", headers=_hdr(tokens["inv"]), timeout=20)
        assert r.status_code == 200
        items = r.json().get("items") or r.json()
        assert isinstance(items, list) and len(items) >= 100
        # every item must have category_image
        missing = [i for i in items if not i.get("category_image")]
        assert not missing, f"{len(missing)} items missing category_image, e.g. {missing[:2]}"
        # sample validation: URL
        assert items[0]["category_image"].startswith("http"), items[0]["category_image"]


def _create_invite(token, recipient_id):
    ideas = requests.get(f"{BASE}/date-ideas", headers=_hdr(token), timeout=15).json()
    items = ideas.get("items") or ideas
    ids = [i["id"] for i in items[:3]]
    r = requests.post(f"{BASE}/invites", headers=_hdr(token),
                      json={"recipient_id": recipient_id, "idea_ids": ids, "coins": 200, "safety_ack": True}, timeout=20)
    assert r.status_code == 200, f"create invite: {r.status_code} {r.text}"
    data = r.json()
    did = data.get("id") or data.get("date_id") or data.get("invite_id")
    if "options" not in data:
        data["options"] = [{"idea_id": i} for i in ids]
    data["id"] = did
    return data


def _drive_to_confirmed(tokens, me, day_iso, start_hour=10):
    """Create invite, choose, propose location, confirm. Returns date id."""
    inv_id = me["inv"]["id"]
    rec_id = me["rec"]["id"]
    inv = _create_invite(tokens["inv"], rec_id)
    did = inv["id"]
    # recipient chooses first option
    opts = inv["options"]
    r = requests.post(f"{BASE}/invites/{did}/choose", headers=_hdr(tokens["rec"]),
                     json={"idea_id": opts[0]["idea_id"]}, timeout=15)
    assert r.status_code == 200, r.text
    # inviter proposes location using slot
    start_iso = f"{day_iso}T{start_hour:02d}:00:00.000Z"
    r = requests.post(f"{BASE}/invites/{did}/location", headers=_hdr(tokens["inv"]),
                     json={"venue": "Cafe Test", "address": "1 Test St", "city": "Testville",
                           "country": "US", "scheduled_start": start_iso}, timeout=15)
    assert r.status_code == 200, r.text
    # recipient confirms location
    r = requests.post(f"{BASE}/invites/{did}/location/confirm", headers=_hdr(tokens["rec"]), timeout=15)
    assert r.status_code == 200, r.text
    # status should be DATE_CONFIRMED
    r = requests.get(f"{BASE}/invites", headers=_hdr(tokens["inv"]), timeout=15).json()
    doc = next(x for x in r["outgoing"] if x["id"] == did)
    assert doc["status"] == "DATE_CONFIRMED", doc["status"]
    return did


def _future_day(offset_days):
    from datetime import datetime, timedelta, timezone
    return (datetime.now(timezone.utc) + timedelta(days=offset_days)).strftime("%Y-%m-%d")


# --- Feature 1: Slot Calendar ---
class TestSlotCalendar:
    def test_slots_shape_and_inviter_only(self, tokens, me):
        # create fresh invite in ACTIVITY_SELECTED
        inv = _create_invite(tokens["inv"], me["rec"]["id"])
        did = inv["id"]
        r = requests.post(f"{BASE}/invites/{did}/choose", headers=_hdr(tokens["rec"]),
                          json={"idea_id": inv["options"][0]["idea_id"]}, timeout=15)
        assert r.status_code == 200
        day = _future_day(30)
        # inviter can fetch
        r = requests.get(f"{BASE}/invites/{did}/slots", headers=_hdr(tokens["inv"]),
                         params={"day": day}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data["slots"]) == 10
        times = [s["time"] for s in data["slots"]]
        assert times == [f"{h:02d}:00" for h in range(10, 20)]
        assert all("start" in s and "available" in s for s in data["slots"])
        assert "busy" in data
        # recipient forbidden
        r = requests.get(f"{BASE}/invites/{did}/slots", headers=_hdr(tokens["rec"]),
                         params={"day": day}, timeout=15)
        assert r.status_code == 403, f"expected 403 for recipient, got {r.status_code}"
        # cleanup
        requests.post(f"{BASE}/invites/{did}/cancel", headers=_hdr(tokens["inv"]), timeout=15)

    def test_slots_busy_after_confirm(self, tokens, me):
        day = _future_day(45)
        # 1) create+confirm a date at 10:00
        did1 = _drive_to_confirmed(tokens, me, day, start_hour=10)
        # 2) fresh invite, check slots at same day
        inv2 = _create_invite(tokens["inv"], me["rec"]["id"])
        did2 = inv2["id"]
        r = requests.post(f"{BASE}/invites/{did2}/choose", headers=_hdr(tokens["rec"]),
                          json={"idea_id": inv2["options"][0]["idea_id"]}, timeout=15)
        assert r.status_code == 200
        r = requests.get(f"{BASE}/invites/{did2}/slots", headers=_hdr(tokens["inv"]),
                         params={"day": day}, timeout=15).json()
        by_time = {s["time"]: s["available"] for s in r["slots"]}
        # 10-12 windows overlap with a 10:00-13:00 confirmed date
        assert by_time["10:00"] is False, by_time
        assert by_time["11:00"] is False, by_time
        assert by_time["12:00"] is False, by_time
        assert by_time["13:00"] is True, by_time
        assert by_time["19:00"] is True, by_time
        # cleanup did2
        requests.post(f"{BASE}/invites/{did2}/cancel", headers=_hdr(tokens["inv"]), timeout=15)
        # keep did1 for chat test
        pytest._confirmed_did = did1


# --- Feature 2: Date Chat ---
class TestDateChat:
    def test_chat_disabled_before_confirmed(self, tokens, me):
        inv = _create_invite(tokens["inv"], me["rec"]["id"])
        did = inv["id"]
        # messages GET returns chat_enabled=false
        r = requests.get(f"{BASE}/invites/{did}/messages", headers=_hdr(tokens["inv"]), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["chat_enabled"] is False
        assert d["messages"] == []
        # POST rejected 400
        r = requests.post(f"{BASE}/invites/{did}/messages", headers=_hdr(tokens["inv"]),
                          json={"text": "hi"}, timeout=15)
        assert r.status_code == 400
        assert "CHAT_NOT_AVAILABLE" in r.text
        # cleanup
        requests.post(f"{BASE}/invites/{did}/cancel", headers=_hdr(tokens["inv"]), timeout=15)

    def test_chat_enabled_after_confirmed(self, tokens, me):
        did = getattr(pytest, "_confirmed_did", None)
        if not did:
            did = _drive_to_confirmed(tokens, me, _future_day(60), start_hour=14)
            pytest._confirmed_did = did
        # inviter sends
        text_a = f"iter12-a-{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{BASE}/invites/{did}/messages", headers=_hdr(tokens["inv"]),
                          json={"text": text_a}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["message"]["text"] == text_a
        # recipient sends
        text_b = f"iter12-b-{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{BASE}/invites/{did}/messages", headers=_hdr(tokens["rec"]),
                          json={"text": text_b}, timeout=15)
        assert r.status_code == 200, r.text
        # both see both
        for who in ("inv", "rec"):
            r = requests.get(f"{BASE}/invites/{did}/messages", headers=_hdr(tokens[who]), timeout=15).json()
            assert r["chat_enabled"] is True
            texts = [m["text"] for m in r["messages"]]
            assert text_a in texts and text_b in texts, f"{who} sees {texts}"
        # empty text rejected
        r = requests.post(f"{BASE}/invites/{did}/messages", headers=_hdr(tokens["inv"]),
                          json={"text": "   "}, timeout=15)
        assert r.status_code == 400

    def test_recipient_gets_notification(self, tokens, me):
        did = getattr(pytest, "_confirmed_did", None)
        assert did
        txt = f"ping-{uuid.uuid4().hex[:6]}"
        requests.post(f"{BASE}/invites/{did}/messages", headers=_hdr(tokens["inv"]),
                      json={"text": txt}, timeout=15)
        # poll notifications on recipient
        found = False
        for _ in range(5):
            n = requests.get(f"{BASE}/notifications", headers=_hdr(tokens["rec"]), timeout=15)
            if n.status_code == 200:
                items = n.json().get("items") or n.json()
                if any(txt[:20] in str(x) for x in items):
                    found = True
                    break
            time.sleep(0.5)
        assert found, "recipient did not receive date_message notification"


# --- Cleanup ---
def test_zz_cleanup(tokens):
    """Cancel any remaining outgoing dates for premv3 to keep state clean."""
    r = requests.get(f"{BASE}/invites", headers=_hdr(tokens["inv"]), timeout=15).json()
    for d in r.get("outgoing", []):
        if d["status"] not in ("COMPLETED", "COMPLETED_AUTO", "CANCELLED",
                                "CANCELLED_TRANSPORTATION", "REFUNDED"):
            requests.post(f"{BASE}/invites/{d['id']}/cancel", headers=_hdr(tokens["inv"]), timeout=15)
