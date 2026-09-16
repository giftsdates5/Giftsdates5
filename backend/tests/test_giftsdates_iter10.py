"""Iteration 10 regression: Invite-on-a-Date v2 + Spin + Admin dates + Cron."""
import os
import uuid
import io
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta

def _load_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v: return v.rstrip("/")
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE_URL = _load_url()
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@giftsdates.com"
ADMIN_PASS = "TestPass123!"
INVITER_EMAIL = "premv3@example.com"
INVITER_PASS = "TestPass123!"
WEBHOOK_CRON_SECRET = "gd_cron_9f3b1c7a4e6d48b2a1c05e7f2d9b83a6f4e1c2d7"


# ---------- helpers ----------
def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    j = r.json()
    return j["token"], j["user"]


def _register(email=None, name="Rec"):
    email = email or f"TEST_iter10_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "TestPass123!", "name": name, "age": 25,
        "gender": "female", "interested_in": "male", "city": "Paris", "country": "FR",
    }, timeout=20)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    j = r.json()
    return j["token"], j["user"]


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def _set_date_price(tok, price):
    r = requests.patch(f"{API}/auth/me", headers=_hdr(tok), json={"date_price": price}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


def _pick_ideas(tok, n=2):
    r = requests.get(f"{API}/date-ideas", headers=_hdr(tok), timeout=30)
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= n
    return [it["id"] for it in items[:n]]


_SLOT_COUNTER = [100]  # start far out

def _future_iso(days=None, hours=None):
    _SLOT_COUNTER[0] += 1
    # spread each call ~5 days apart (way beyond 3h window) to avoid conflicts
    delta = timedelta(days=_SLOT_COUNTER[0] * 5)
    return (datetime.now(timezone.utc) + delta).isoformat()


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def inviter():
    tok, u = _login(INVITER_EMAIL, INVITER_PASS)
    return {"tok": tok, "id": u["id"], "user": u}


@pytest.fixture(scope="module")
def admin():
    tok, u = _login(ADMIN_EMAIL, ADMIN_PASS)
    return {"tok": tok, "id": u["id"], "user": u}


@pytest.fixture()
def fresh_recipient():
    tok, u = _register()
    _set_date_price(tok, 300)
    return {"tok": tok, "id": u["id"], "user": u}


# ---------- date ideas catalog ----------
def test_date_ideas_catalog(inviter):
    r = requests.get(f"{API}/date-ideas", headers=_hdr(inviter["tok"]), timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert "items" in j and "categories" in j
    # Should have at least 261 ideas per problem statement
    assert j["total"] >= 261, f"expected >=261 ideas, got {j['total']}"
    assert len(j["categories"]) >= 3
    # search filter
    r2 = requests.get(f"{API}/date-ideas", headers=_hdr(inviter["tok"]),
                      params={"search": "coffee"}, timeout=20)
    assert r2.status_code == 200
    items = r2.json()["items"]
    assert all("coffee" in it["name"].lower() for it in items) or len(items) == 0
    # free flag
    r3 = requests.get(f"{API}/date-ideas", headers=_hdr(inviter["tok"]),
                      params={"free": True}, timeout=20)
    assert r3.status_code == 200
    for it in r3.json()["items"][:10]:
        assert it.get("free") is True


def test_date_ideas_category_and_romantic_combo(inviter):
    r = requests.get(f"{API}/date-ideas", headers=_hdr(inviter["tok"]),
                     params={"romantic": True, "budget": "low"}, timeout=20)
    assert r.status_code == 200
    for it in r.json()["items"][:20]:
        assert it.get("romantic") is True
        assert it.get("budget_level") == "low"


# ---------- registration grants 0 coins ----------
def test_register_zero_coins():
    email = f"TEST_iter10_zero_{uuid.uuid4().hex[:8]}@example.com"
    _, u = _register(email=email, name="Zero")
    assert u["coins"] == 0, f"expected 0 coins on register, got {u.get('coins')}"


# ---------- invite validations ----------
def test_invite_self_forbidden(inviter):
    ideas = _pick_ideas(inviter["tok"], 1)
    r = requests.post(f"{API}/invites", headers=_hdr(inviter["tok"]), json={
        "recipient_id": inviter["id"], "idea_ids": ideas, "coins": 150, "safety_ack": True
    }, timeout=20)
    assert r.status_code == 400
    assert "yourself" in r.text.lower()


def test_invite_safety_ack_required(inviter, fresh_recipient):
    ideas = _pick_ideas(inviter["tok"], 1)
    r = requests.post(f"{API}/invites", headers=_hdr(inviter["tok"]), json={
        "recipient_id": fresh_recipient["id"], "idea_ids": ideas, "coins": 150, "safety_ack": False
    }, timeout=20)
    assert r.status_code == 400
    assert "SAFETY_ACK_REQUIRED" in r.text


def test_invite_idea_count_bounds(inviter, fresh_recipient):
    r = requests.post(f"{API}/invites", headers=_hdr(inviter["tok"]), json={
        "recipient_id": fresh_recipient["id"], "idea_ids": [], "coins": 150, "safety_ack": True
    }, timeout=20)
    assert r.status_code == 400
    ideas4 = _pick_ideas(inviter["tok"], 4)
    r2 = requests.post(f"{API}/invites", headers=_hdr(inviter["tok"]), json={
        "recipient_id": fresh_recipient["id"], "idea_ids": ideas4, "coins": 150, "safety_ack": True
    }, timeout=20)
    assert r2.status_code == 400


def test_invite_min_coins_floor(inviter, fresh_recipient):
    # set recipient price high
    _set_date_price(fresh_recipient["tok"], 500)
    ideas = _pick_ideas(inviter["tok"], 1)
    r = requests.post(f"{API}/invites", headers=_hdr(inviter["tok"]), json={
        "recipient_id": fresh_recipient["id"], "idea_ids": ideas, "coins": 300, "safety_ack": True
    }, timeout=20)
    assert r.status_code == 400
    assert "MIN_COINS:500" in r.text, r.text


# ---------- full invite -> DATE_CONFIRMED (location confirm path) ----------
def _create_invite(inviter, recipient, coins=300, n_ideas=2):
    ideas = _pick_ideas(inviter["tok"], n_ideas)
    r = requests.post(f"{API}/invites", headers=_hdr(inviter["tok"]), json={
        "recipient_id": recipient["id"], "idea_ids": ideas, "coins": coins, "safety_ack": True
    }, timeout=20)
    assert r.status_code == 200, r.text
    did = r.json()["id"]
    return did, ideas


def _choose(recipient, did, idea_id):
    r = requests.post(f"{API}/invites/{did}/choose", headers=_hdr(recipient["tok"]),
                     json={"idea_id": idea_id}, timeout=20)
    assert r.status_code == 200, r.text


def _propose_location(inviter, did, start_iso=None):
    r = requests.post(f"{API}/invites/{did}/location", headers=_hdr(inviter["tok"]), json={
        "venue": "Cafe Test", "address": "10 rue", "city": "Paris", "country": "FR",
        "scheduled_start": start_iso or _future_iso(5)
    }, timeout=20)
    assert r.status_code == 200, r.text


def test_full_flow_location_confirm(inviter, fresh_recipient):
    did, ideas = _create_invite(inviter, fresh_recipient)
    r = requests.get(f"{API}/invites/{did}", headers=_hdr(inviter["tok"]))
    assert r.json()["status"] == "INVITATION_SENT"
    _choose(fresh_recipient, did, ideas[0])
    _propose_location(inviter, did)
    r2 = requests.post(f"{API}/invites/{did}/location/confirm",
                       headers=_hdr(fresh_recipient["tok"]), timeout=20)
    assert r2.status_code == 200
    assert r2.json()["status"] == "DATE_CONFIRMED"
    g = requests.get(f"{API}/invites/{did}", headers=_hdr(inviter["tok"])).json()
    assert g["status"] == "DATE_CONFIRMED"
    assert g["windows"].get("lock_at") and g["windows"].get("report_open")


# ---------- taxi flow ----------
def test_taxi_flow(inviter, fresh_recipient):
    did, ideas = _create_invite(inviter, fresh_recipient)
    _choose(fresh_recipient, did, ideas[0])
    _propose_location(inviter, did)
    # coins before taxi
    me_before = requests.get(f"{API}/auth/me", headers=_hdr(inviter["tok"])).json()
    coins_before = me_before["coins"]
    r = requests.post(f"{API}/invites/{did}/taxi/request", headers=_hdr(fresh_recipient["tok"]),
                     json={"amount": 40}, timeout=20)
    assert r.status_code == 200 and r.json()["status"] == "TAXI_REQUESTED"
    r2 = requests.post(f"{API}/invites/{did}/taxi/confirm", headers=_hdr(inviter["tok"]), timeout=20)
    assert r2.status_code == 200 and r2.json()["status"] == "DATE_CONFIRMED"
    me_after = requests.get(f"{API}/auth/me", headers=_hdr(inviter["tok"])).json()
    assert me_after["coins"] == coins_before - 40, f"{coins_before} -> {me_after['coins']}"
    inv = requests.get(f"{API}/invites/{did}", headers=_hdr(inviter["tok"])).json()
    assert inv["total_hold"] == 300 + 40


# ---------- pickup flow ----------
def test_pickup_flow(inviter, fresh_recipient):
    did, ideas = _create_invite(inviter, fresh_recipient)
    _choose(fresh_recipient, did, ideas[0])
    _propose_location(inviter, did)
    r = requests.post(f"{API}/invites/{did}/taxi/request", headers=_hdr(fresh_recipient["tok"]),
                     json={"amount": 30})
    assert r.status_code == 200
    r2 = requests.post(f"{API}/invites/{did}/pickup/offer", headers=_hdr(inviter["tok"]))
    assert r2.status_code == 200 and r2.json()["status"] == "PICKUP_ADDRESS_PENDING"
    r3 = requests.post(f"{API}/invites/{did}/pickup/address",
                       headers=_hdr(fresh_recipient["tok"]),
                       json={"pickup_address": "12 rue de la Paix, Paris"})
    assert r3.status_code == 200 and r3.json()["status"] == "PICKUP_ADDRESS_SELECTED"
    r4 = requests.post(f"{API}/invites/{did}/pickup/confirm", headers=_hdr(inviter["tok"]))
    assert r4.status_code == 200 and r4.json()["status"] == "DATE_CONFIRMED"


# ---------- transport refuse (50/25/25) ----------
def test_transport_refuse_split(inviter, fresh_recipient):
    did, ideas = _create_invite(inviter, fresh_recipient, coins=400)
    _choose(fresh_recipient, did, ideas[0])
    _propose_location(inviter, did)
    r = requests.post(f"{API}/invites/{did}/taxi/request", headers=_hdr(fresh_recipient["tok"]),
                     json={"amount": 40})
    assert r.status_code == 200
    r2 = requests.post(f"{API}/invites/{did}/transport/refuse", headers=_hdr(inviter["tok"]))
    assert r2.status_code == 200 and r2.json()["status"] == "CANCELLED_TRANSPORTATION"
    inv_ledger = requests.get(f"{API}/coins/ledger", headers=_hdr(inviter["tok"])).json()["transactions"]
    rec_ledger = requests.get(f"{API}/coins/ledger", headers=_hdr(fresh_recipient["tok"])).json()["transactions"]
    inv_refunds = [t for t in inv_ledger if t.get("date_id") == did and t.get("type") == "DATE_REFUND"]
    rec_comp = [t for t in rec_ledger if t.get("date_id") == did and t.get("type") == "RECIPIENT_COMPENSATION"]
    assert inv_refunds and inv_refunds[0]["amount"] == 200, inv_refunds
    assert rec_comp and rec_comp[0]["amount"] == 100, rec_comp


# ---------- recipient cancel -> 100% refund ----------
def test_recipient_cancel_full_refund(inviter, fresh_recipient):
    did, ideas = _create_invite(inviter, fresh_recipient, coins=320)
    _choose(fresh_recipient, did, ideas[0])
    r = requests.post(f"{API}/invites/{did}/cancel", headers=_hdr(fresh_recipient["tok"]))
    assert r.status_code == 200
    inv_ledger = requests.get(f"{API}/coins/ledger", headers=_hdr(inviter["tok"])).json()["transactions"]
    refunds = [t for t in inv_ledger if t.get("date_id") == did and t.get("type") == "DATE_REFUND"]
    assert refunds and refunds[0]["amount"] == 320, refunds


# ---------- inviter cancel -> 50/25/25 ----------
def test_inviter_cancel_split(inviter, fresh_recipient):
    did, ideas = _create_invite(inviter, fresh_recipient, coins=400)
    _choose(fresh_recipient, did, ideas[0])
    r = requests.post(f"{API}/invites/{did}/cancel", headers=_hdr(inviter["tok"]))
    assert r.status_code == 200
    inv_ledger = requests.get(f"{API}/coins/ledger", headers=_hdr(inviter["tok"])).json()["transactions"]
    rec_ledger = requests.get(f"{API}/coins/ledger", headers=_hdr(fresh_recipient["tok"])).json()["transactions"]
    inv_refunds = [t for t in inv_ledger if t.get("date_id") == did and t.get("type") == "DATE_REFUND"]
    rec_comp = [t for t in rec_ledger if t.get("date_id") == did and t.get("type") == "RECIPIENT_COMPENSATION"]
    assert inv_refunds and inv_refunds[0]["amount"] == 200, inv_refunds
    assert rec_comp and rec_comp[0]["amount"] == 100, rec_comp


# ---------- coin ledger persists balance_before/after ----------
def test_coin_ledger_has_balance_fields(inviter, fresh_recipient):
    did, _ = _create_invite(inviter, fresh_recipient)
    ledger = requests.get(f"{API}/coins/ledger", headers=_hdr(inviter["tok"])).json()["transactions"]
    entry = next((t for t in ledger if t.get("type") == "DATE_PAYMENT"), None)
    assert entry is not None
    assert "balance_before" in entry and "balance_after" in entry, entry
    # cleanup
    requests.post(f"{API}/invites/{did}/cancel", headers=_hdr(fresh_recipient["tok"]))


# ---------- report window closed (before scheduled start) ----------
def test_report_window_closed_before_start(inviter, fresh_recipient):
    did, ideas = _create_invite(inviter, fresh_recipient)
    _choose(fresh_recipient, did, ideas[0])
    _propose_location(inviter, did, start_iso=_future_iso(3))
    r = requests.post(f"{API}/invites/{did}/report", headers=_hdr(inviter["tok"]),
                     json={"reasons": ["safety"], "details": "This is a valid long description over ten chars"})
    assert r.status_code == 400
    assert "REPORT_WINDOW_CLOSED" in r.text
    # details too short
    # schedule to now would need db manipulation - skip


# ---------- verify not yet ----------
def test_verify_not_yet(inviter, fresh_recipient):
    did, ideas = _create_invite(inviter, fresh_recipient)
    _choose(fresh_recipient, did, ideas[0])
    _propose_location(inviter, did, start_iso=_future_iso(3))
    files = {"file": ("test.jpg", io.BytesIO(b"\xff\xd8\xff\xd9"), "image/jpeg")}
    data = {"confirm": "true"}
    r = requests.post(f"{API}/invites/{did}/verify",
                     headers={"Authorization": f"Bearer {inviter['tok']}"},
                     files=files, data=data, timeout=20)
    assert r.status_code == 400
    assert "VERIFY_NOT_YET" in r.text


# ---------- Monthly Spin ----------
def test_spin_status_and_claim_once():
    tok, u = _register(name="Spin")
    r = requests.get(f"{API}/spin/status", headers=_hdr(tok)).json()
    assert r["eligible"] is True
    r2 = requests.post(f"{API}/spin/claim", headers=_hdr(tok), timeout=20)
    assert r2.status_code == 200
    r3 = requests.post(f"{API}/spin/claim", headers=_hdr(tok), timeout=20)
    assert r3.status_code == 400
    assert "Already spun" in r3.text
    # ledger has SPIN_WIN if a coin prize was drawn
    st = requests.get(f"{API}/spin/status", headers=_hdr(tok)).json()
    assert st["eligible"] is False


# ---------- Admin dates ----------
def test_admin_dates_gating(inviter, admin):
    r = requests.get(f"{API}/admin/dates", headers=_hdr(inviter["tok"]))
    assert r.status_code == 403
    r2 = requests.get(f"{API}/admin/dates", headers=_hdr(admin["tok"]), timeout=20)
    assert r2.status_code == 200
    assert "dates" in r2.json()


# ---------- Cron auth ----------
def test_cron_tick_auth():
    r = requests.post(f"{API}/cron/tick", timeout=20)
    assert r.status_code == 401
    r2 = requests.post(f"{API}/cron/tick",
                       headers={"Authorization": f"Bearer {WEBHOOK_CRON_SECRET}"}, timeout=20)
    assert r2.status_code == 200 and r2.json().get("accepted") is True


def test_cron_spin_auth():
    r = requests.post(f"{API}/cron/spin",
                      headers={"Authorization": "Bearer wrongtoken"}, timeout=20)
    assert r.status_code == 401
    r2 = requests.post(f"{API}/cron/spin",
                       headers={"Authorization": f"Bearer {WEBHOOK_CRON_SECRET}"}, timeout=20)
    assert r2.status_code == 200
