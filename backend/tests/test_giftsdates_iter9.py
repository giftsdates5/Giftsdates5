"""Iteration 9 tests: report flow, support chatbot (incl. multilingual), support tickets, admin support config."""
import os
import uuid
import time
import requests
import pytest

def _load_frontend_env():
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        for line in open(env_path):
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("REACT_APP_BACKEND_URL not found")

BASE = os.environ.get("REACT_APP_BACKEND_URL", _load_frontend_env()).rstrip("/")
API = f"{BASE}/api"
ADMIN_EMAIL = "admin@giftsdates.com"
ADMIN_PASS = "TestPass123!"


def _reg(prefix="iter9"):
    email = f"TEST_{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    body = {"email": email, "password": "TestPass123!", "name": f"T{prefix}",
            "age": 28, "gender": "female", "interested_in": "male",
            "city": "Paris", "country": "France"}
    r = requests.post(f"{API}/auth/register", json=body, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASS)


@pytest.fixture(scope="module")
def user_a():
    t, u = _reg("A")
    return t, u


@pytest.fixture(scope="module")
def user_b():
    t, u = _reg("B")
    return t, u


# ---------- Reports ----------
class TestReports:
    def test_unauth_reject(self):
        r = requests.post(f"{API}/reports", json={"target_id": "x", "reason": "spam"}, timeout=10)
        assert r.status_code in (401, 403)

    def test_invalid_reason(self, user_a, user_b):
        ta, _ = user_a
        _, ub = user_b
        r = requests.post(f"{API}/reports", headers={"Authorization": f"Bearer {ta}"},
                          json={"target_id": ub["id"], "reason": "not_a_reason"}, timeout=10)
        assert r.status_code == 400

    def test_cannot_report_self(self, user_a):
        ta, ua = user_a
        r = requests.post(f"{API}/reports", headers={"Authorization": f"Bearer {ta}"},
                          json={"target_id": ua["id"], "reason": "spam"}, timeout=10)
        assert r.status_code == 400

    def test_report_target_not_found(self, user_a):
        ta, _ = user_a
        r = requests.post(f"{API}/reports", headers={"Authorization": f"Bearer {ta}"},
                          json={"target_id": "nonexistent-id", "reason": "spam"}, timeout=10)
        assert r.status_code == 404

    def test_report_success_and_duplicate(self, user_a, user_b):
        ta, _ = user_a
        _, ub = user_b
        r = requests.post(f"{API}/reports", headers={"Authorization": f"Bearer {ta}"},
                          json={"target_id": ub["id"], "reason": "spam", "details": "Test spam"}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("reported") is True
        # duplicate open report
        r2 = requests.post(f"{API}/reports", headers={"Authorization": f"Bearer {ta}"},
                           json={"target_id": ub["id"], "reason": "spam"}, timeout=15)
        assert r2.status_code == 409

    def test_admin_lists_and_resolves(self, admin_token, user_b):
        _, ub = user_b
        r = requests.get(f"{API}/admin/reports?status=open",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        assert r.status_code == 200
        reports = r.json()
        assert isinstance(reports, list)
        mine = [x for x in reports if x["target_id"] == ub["id"]]
        assert mine, "Expected our submitted report to be listed"
        rid = mine[0]["id"]
        rr = requests.post(f"{API}/admin/reports/{rid}/resolve",
                           headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        assert rr.status_code == 200
        assert rr.json().get("status") == "resolved"

    def test_admin_block_from_report(self, admin_token, user_a, user_b):
        # create a fresh report so we can test block action
        ta, _ = user_a
        _, ub = user_b
        r = requests.post(f"{API}/reports", headers={"Authorization": f"Bearer {ta}"},
                          json={"target_id": ub["id"], "reason": "harassment"}, timeout=15)
        assert r.status_code == 200
        reports = requests.get(f"{API}/admin/reports?status=open",
                               headers={"Authorization": f"Bearer {admin_token}"}, timeout=15).json()
        rid = [x for x in reports if x["target_id"] == ub["id"]][0]["id"]
        br = requests.post(f"{API}/admin/reports/{rid}/block",
                          headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        assert br.status_code == 200, br.text
        assert br.json().get("action") == "blocked"

    def test_admin_reports_requires_admin(self, user_a):
        ta, _ = user_a
        r = requests.get(f"{API}/admin/reports", headers={"Authorization": f"Bearer {ta}"}, timeout=10)
        assert r.status_code == 403


# ---------- Support config & chatbot ----------
class TestSupport:
    def test_support_config_public(self):
        r = requests.get(f"{API}/support/config", timeout=10)
        assert r.status_code == 200
        data = r.json()
        for k in ("welcome_message", "offline_message", "hours", "is_open"):
            assert k in data
        assert isinstance(data["hours"], list) and len(data["hours"]) == 7

    def test_support_chat_streams_english(self):
        sid = f"TEST_sess_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API}/support/chat", stream=True, timeout=90,
                          json={"session_id": sid, "message": "How do I buy coins on GiftsDates?", "lang": "en"})
        assert r.status_code == 200
        content = b""
        for chunk in r.iter_content(chunk_size=64):
            if chunk:
                content += chunk
            if len(content) > 20:
                break
        text = content.decode("utf-8", errors="ignore")
        assert len(text) > 5, f"Expected streamed text, got {text!r}"
        # Should NOT be the generic error fallback
        assert "trouble answering" not in text.lower()

    def test_support_chat_russian(self):
        sid = f"TEST_sess_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API}/support/chat", stream=True, timeout=90,
                          json={"session_id": sid, "message": "How do I buy coins?", "lang": "ru"})
        assert r.status_code == 200
        # collect a bit of the stream
        buf = b""
        start = time.time()
        for chunk in r.iter_content(chunk_size=64):
            if chunk:
                buf += chunk
            if len(buf) > 200 or time.time() - start > 60:
                break
        text = buf.decode("utf-8", errors="ignore")
        assert len(text) > 5
        # heuristic: expect at least one cyrillic char
        assert any("\u0400" <= c <= "\u04FF" for c in text), f"Expected Cyrillic in RU reply, got: {text!r}"

    def test_support_chat_empty_message(self):
        r = requests.post(f"{API}/support/chat",
                          json={"session_id": "x", "message": "   ", "lang": "en"}, timeout=15)
        assert r.status_code == 400

    def test_create_ticket_and_admin_list(self, admin_token):
        email = f"TEST_ticket_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/support/ticket", json={
            "name": "Iter9 Tester", "email": email,
            "message": "Please help me with my account setup, I need info."}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("created") is True

        # admin can see it
        lst = requests.get(f"{API}/admin/support/tickets?status=open",
                           headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        assert lst.status_code == 200
        tickets = lst.json()
        mine = [t for t in tickets if t.get("email") == email]
        assert mine, "Submitted ticket missing from admin list"
        tid = mine[0]["id"]

        # resolve
        rr = requests.post(f"{API}/admin/support/tickets/{tid}/resolve",
                           headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        assert rr.status_code == 200
        assert rr.json().get("status") == "resolved"

    def test_ticket_short_message_rejected(self):
        r = requests.post(f"{API}/support/ticket",
                          json={"name": "x", "email": "a@b.com", "message": "hi"}, timeout=10)
        assert r.status_code == 400

    def test_admin_get_and_put_settings(self, admin_token):
        r = requests.get(f"{API}/admin/support/settings",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        assert r.status_code == 200
        s = r.json()
        assert "hours" in s and "timezone" in s
        # update timezone (invalid should fail)
        bad = dict(agent_enabled=True, timezone="Not/AZone",
                   hours=[{"day": d, "enabled": False, "open": "09:00", "close": "18:00"} for d in range(7)],
                   offline_message="off", welcome_message="hi")
        rb = requests.put(f"{API}/admin/support/settings", json=bad,
                          headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        assert rb.status_code == 400

        good = dict(bad, timezone=s.get("timezone", "UTC"))
        rg = requests.put(f"{API}/admin/support/settings", json=good,
                          headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        assert rg.status_code == 200

    def test_admin_support_settings_requires_admin(self, user_a):
        ta, _ = user_a
        r = requests.get(f"{API}/admin/support/settings",
                         headers={"Authorization": f"Bearer {ta}"}, timeout=10)
        assert r.status_code == 403
