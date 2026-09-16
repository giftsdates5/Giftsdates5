"""GiftsDates backend — dating, wallet, gifts, escrow dates, video calls, Stripe."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Request, Form
from fastapi.responses import Response, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from pathlib import Path
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from date_ideas_catalog import build_catalog, CAT_IMG
import os, uuid, logging, bcrypt, jwt, stripe, requests, re, secrets, httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# Storage
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "giftsdates"
storage_key = None

def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    try:
        r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        r.raise_for_status()
        storage_key = r.json()["storage_key"]
    except Exception as e:
        logging.error(f"Storage init failed: {e}")
        raise HTTPException(503, "Storage unavailable")
    return storage_key

def put_object(path: str, data: bytes, content_type: str):
    k = init_storage()
    r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": k, "Content-Type": content_type}, data=data, timeout=120)
    r.raise_for_status()
    return r.json()

def get_object(path: str):
    k = init_storage()
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": k}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")

app = FastAPI()
api = APIRouter(prefix="/api")

# ---------- Constants ----------
COIN_PACKAGES = {
    "small_talk": {"coins": 100,  "amount": 9.99,   "bonus": 0,   "name": "Small Talk"},
    "starter":    {"coins": 300,  "amount": 29.99,  "bonus": 20,  "name": "Starter"},
    "popular":    {"coins": 1000, "amount": 99.99,  "bonus": 100, "name": "Popular Pack"},
    "extra":      {"coins": 2000, "amount": 189.0,  "bonus": 150, "name": "Extra Pack"},
    "vip":        {"coins": 3000, "amount": 295.0,  "bonus": 300, "name": "VIP Pack"},
}
CUSTOM_COINS_PER_USD = 10
CUSTOM_BONUS_PCT = 2
CUSTOM_MIN_USD = 1.0
COINS_PER_USD = 10  # payout rate: 10 coins = $1
MIN_WITHDRAW_USD = 50.0
CANCEL_REFUND_PCT = 0.5  # booker gets 50% back when cancelling a date; the rest compensates the recipient
PREMIUM_PACKAGE = {"lookup": "premium_monthly", "amount": 29.99, "name": "GiftsDates Premium Monthly"}
VIP_PACKAGE = {"lookup": "vip_monthly", "amount": 49.99, "name": "GiftsDates VIP Monthly"}
PREMIUM_LITE_PACKAGE = {"lookup": "premium_lite_monthly", "amount": 14.99, "name": "GiftsDates Premium Lite Monthly"}
PREMIUM_COINS = 300
VIP_COINS = 500
PREMIUM_LITE_COINS = 150
VIP_SERVICES = {
    "basic": ["Минет в презервативе", "Поцелуи с языком", "Секс анальный", "Секс вагинальный", "Секс групповой", "Секс лесбийский"],
    "extra": ["Куннилингус", "Минет без резинки", "Минет глубокий", "Окончание в рот", "Окончание на грудь", "Окончание на лицо", "Работаю с девственниками", "Ролевые игры", "Секс игрушки", "Секс по телефону", "Услуги семейной паре", "Фейсситтинг", "Фото/видео съемка", "Эскорт"],
    "massage": ["Массаж Ветка сакуры", "Массаж классический", "Массаж профессиональный", "Массаж расслабляющий", "Массаж тайский", "Массаж точечный", "Массаж урологический", "Массаж эротический"],
    "striptease": ["Лесби откровенное", "Лесби-шоу легкое", "Стриптиз не профи", "Стриптиз профи"],
    "bdsm": ["Бандаж", "Госпожа", "Легкая доминация", "Порка", "Рабыня", "Трамплинг", "Фетиш", "Эротические игры"],
    "extreme": ["Анилингус делаю", "Золотой дождь выдача", "Золотой дождь прием", "Копро выдача", "Страпон", "Фистинг анальный", "Фистинг вагинальный"],
}
VIP_SERVICE_SET = {s for arr in VIP_SERVICES.values() for s in arr}
VIP_PLACES = ["own", "your", "other"]
GIFT_CATALOG = [
    {"id": "rose",       "name_key": "gift_rose",       "icon": "🌹", "cost": 50},
    {"id": "chocolate",  "name_key": "gift_chocolate",  "icon": "🍫", "cost": 100},
    {"id": "champagne",  "name_key": "gift_champagne",  "icon": "🍾", "cost": 200},
    {"id": "dress",      "name_key": "gift_dress",      "icon": "👗", "cost": 400},
    {"id": "perfume",    "name_key": "gift_perfume",    "icon": "🧴", "cost": 800},
    {"id": "watch",      "name_key": "gift_watch",      "icon": "⌚", "cost": 1000},
    {"id": "jewelry",    "name_key": "gift_jewelry",    "icon": "💎", "cost": 1500},
    {"id": "ring",       "name_key": "gift_ring",       "icon": "💍", "cost": 5000},
]
GIFT_COMMISSION = 0.30
VIDEO_RATE_PER_MIN = 10
DATE_MIN_COINS = 150
REFERRAL_BONUS = 100
MAX_PHOTOS = 12
PHONE_RE = re.compile(r"(?:\+?\d[\s\-\.\(\)_]*){7,}")
PHONE_WORDS_RE = re.compile(r"\b(whatsapp|telegram|viber|wechat|signal|тел[её]фон|ватсап|телеграм)\b", re.I)
MAX_VIOLATIONS = 3
BLOCK_DAYS = 7
FREE_DAILY_LIKES = 15

def contains_phone(text: str) -> bool:
    return bool(PHONE_RE.search(text)) or bool(PHONE_WORDS_RE.search(text) and re.search(r"\d{4,}", text))

DEFAULT_SETTINGS = {
    "gifts": GIFT_CATALOG,
    "coin_packages": [{"id": k, **v} for k, v in COIN_PACKAGES.items()],
    "premium_amount": PREMIUM_PACKAGE["amount"],
    "video_rate": VIDEO_RATE_PER_MIN,
    "date_min_coins": DATE_MIN_COINS,
    "referral_bonus": REFERRAL_BONUS,
    "commission": GIFT_COMMISSION,
    "free_daily_likes": FREE_DAILY_LIKES,
    "custom_coins_per_usd": CUSTOM_COINS_PER_USD,
    "custom_bonus_pct": CUSTOM_BONUS_PCT,
    "custom_min_usd": CUSTOM_MIN_USD,
    "coins_per_usd": COINS_PER_USD,
    "min_withdraw_usd": MIN_WITHDRAW_USD,
    "referral_package_id": "popular",
    "cancel_refund_pct": CANCEL_REFUND_PCT,
    "gift_auto_match_coins": 100,
}

async def ensure_match(a_id: str, b_id: str, reason: str = "like") -> tuple[str, bool]:
    exists = await db.matches.find_one({"users": {"$all": [a_id, b_id]}})
    if exists: return exists["id"], False
    now = datetime.now(timezone.utc).isoformat()
    conv_id = str(uuid.uuid4())
    await db.matches.insert_one({"id": conv_id, "users": [a_id, b_id], "created_at": now, "reason": reason})
    await db.conversations.insert_one({"id": conv_id, "users": [a_id, b_id], "created_at": now, "last_message": None})
    return conv_id, True

async def get_settings() -> dict:
    doc = await db.settings.find_one({"id": "pricing"}, {"_id": 0, "id": 0}) or {}
    return {**DEFAULT_SETTINGS, **doc}

# ---------- Support / chatbot settings ----------
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
SUPPORT_DEFAULTS = {
    "agent_enabled": True,
    "timezone": "UTC",
    "hours": [
        {"day": 0, "enabled": True, "open": "09:00", "close": "18:00"},
        {"day": 1, "enabled": True, "open": "09:00", "close": "18:00"},
        {"day": 2, "enabled": True, "open": "09:00", "close": "18:00"},
        {"day": 3, "enabled": True, "open": "09:00", "close": "18:00"},
        {"day": 4, "enabled": True, "open": "09:00", "close": "18:00"},
        {"day": 5, "enabled": False, "open": "10:00", "close": "16:00"},
        {"day": 6, "enabled": False, "open": "10:00", "close": "16:00"},
    ],
    "offline_message": "Our support agents are offline right now. Leave a message and we'll reply by email, or ask me anything meanwhile.",
    "welcome_message": "Hi! I'm the GiftsDates assistant 💛 Ask me anything about coins, dates, safety, Premium and more.",
}

async def get_support_settings() -> dict:
    doc = await db.settings.find_one({"id": "support"}, {"_id": 0, "id": 0}) or {}
    merged = {**SUPPORT_DEFAULTS, **doc}
    if not merged.get("hours"):
        merged["hours"] = SUPPORT_DEFAULTS["hours"]
    return merged

def _support_status(s: dict) -> dict:
    try:
        tz = ZoneInfo(s.get("timezone") or "UTC")
    except Exception:
        tz = ZoneInfo("UTC")
    now = datetime.now(tz)
    wd = now.weekday()
    row = next((h for h in s.get("hours", []) if h.get("day") == wd), None)
    is_open = False
    if s.get("agent_enabled", True) and row and row.get("enabled"):
        try:
            oh, om = map(int, str(row["open"]).split(":"))
            ch, cm = map(int, str(row["close"]).split(":"))
            mins = now.hour * 60 + now.minute
            is_open = (oh * 60 + om) <= mins < (ch * 60 + cm)
        except Exception:
            is_open = False
    return {"is_open": is_open, "server_time": now.strftime("%a %H:%M"), "weekday": wd, "timezone": s.get("timezone") or "UTC"}

SUPPORT_SYSTEM = (
    "You are the GiftsDates support assistant for a luxury worldwide dating platform. "
    "Answer only questions about GiftsDates. Be warm, concise (2-5 sentences), and helpful. Never invent policies. "
    "If asked something unrelated or that needs an account action you cannot do, suggest using the app or contacting a human agent via the 'Contact an agent' button.\n\n"
    "KEY FACTS:\n"
    "- Users must be 18+ and verified. Registration is free.\n"
    "- Coins (🪙) power the platform. Top-up packs: Small Talk 🪙100 ($9.99), Starter 🪙300+20 ($29.99), Popular Pack 🪙1000+100 ($99.99), Extra Pack 🪙2000+150 ($189), VIP Pack 🪙3000+300 ($295), or custom at $1=10🪙 +2% bonus.\n"
    "- A gift of 100+ coins automatically opens a chat (instant match).\n"
    "- Safety: keep contact & meeting plans on-platform; phone numbers and chat photos unlock only after a confirmed date; off-platform meetings aren't protected and can lead to a block.\n"
    "- Withdrawals: after bank approval, minus 30% commission; 10 coins = $1; escrow unlocks after a confirmed date.\n"
    "- Dates: invite someone, pick location, pay date price in coins (held in escrow). The invited side can request a taxi fee; if the inviter approves it, the date is auto-confirmed.\n"
    "- Cancellations: if the inviter cancels, 50% of booking+taxi is refunded and 50% compensates the invited user; if the invited user cancels, all coins go back to the inviter.\n"
    "- Photo proof: submit within 24h to get 100%; after 24h with no photo and no complaint, the invited user can claim 50% and the platform keeps 50%. The 'Get 50% now' button unlocks 24h after the date starts.\n"
    "- Premium: unlimited likes, top placement, advanced filters, see who liked you, priority support; auto-renews monthly until cancelled from the profile page.\n"
    "- Invite a friend: earn 🪙100 when a friend buys their first Popular Pack.\n"
    "- Manage/delete account from the profile page. Support email: help@GiftsDates.com.\n"
    "- Helpful pages: /faq, /help, /safety, /terms-of-use, /privacy, /fraud-prevention.\n"
    "Do not ask for passwords, card numbers, or one-time codes."
)

_support_chats: dict = {}

def is_premium(u: dict) -> bool:
    pu = u.get("premium_until")
    if not pu: return False
    try: return datetime.fromisoformat(pu.replace("Z", "+00:00")) > datetime.now(timezone.utc)
    except Exception: return False

def is_vip(u: dict) -> bool:
    vu = u.get("vip_until")
    if not vu: return False
    try: return datetime.fromisoformat(vu.replace("Z", "+00:00")) > datetime.now(timezone.utc)
    except Exception: return False

def is_premium_lite(u: dict) -> bool:
    pu = u.get("premium_lite_until")
    if not pu: return False
    try: return datetime.fromisoformat(pu.replace("Z", "+00:00")) > datetime.now(timezone.utc)
    except Exception: return False

def has_premium(u: dict) -> bool:
    """Baseline premium perks: unlimited likes, advanced filters, see who liked you, boosted placement.
    Granted to Premium-lite, Premium and VIP. VIP-content access is gated separately by is_premium/is_vip."""
    return is_premium(u) or is_premium_lite(u) or is_vip(u)

async def spend_coins(uid: str, amount: int):
    """Spend from main coins first, then from withdrawable. Withdrawable is spendable but not withdrawable from main."""
    amount = int(amount)
    if amount <= 0: return
    u = await db.users.find_one({"id": uid}, {"_id": 0, "coins": 1, "withdrawable": 1})
    coins = int(u.get("coins", 0) or 0)
    wd = float(u.get("withdrawable", 0) or 0)
    if coins + wd < amount:
        raise HTTPException(400, "Insufficient coins")
    from_coins = min(coins, amount)
    from_wd = amount - from_coins
    await db.users.update_one({"id": uid}, {"$inc": {"coins": -from_coins, "withdrawable": -from_wd}})

async def record_txn(user_id: str, ttype: str, amount: int, date_id: str | None = None, description: str = "", status: str = "completed"):
    """Append a coin ledger entry. amount is signed (negative=debit). balance = spendable (coins+withdrawable)."""
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "coins": 1, "withdrawable": 1})
    before = int((u.get("coins") or 0) + (u.get("withdrawable") or 0)) if u else 0
    after = before + int(amount)
    doc = {"id": str(uuid.uuid4()), "user_id": user_id, "date_id": date_id, "type": ttype,
           "amount": int(amount), "balance_before": before, "balance_after": after,
           "status": status, "description": description, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.coin_transactions.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

def extend_until(cur, days=30):
    s = datetime.now(timezone.utc)
    if cur:
        try:
            c = datetime.fromisoformat(cur.replace("Z", "+00:00"))
            if c > s: s = c
        except Exception: pass
    return (s + timedelta(days=days)).isoformat()

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "GiftsDates")

def _email_safe(subject: str, html: str) -> bool:
    low = f"{subject}\n{html}".lower()
    if any(tag in low for tag in ("<form", "<input", "<textarea", "<select")): return False
    import re as _re
    for url in _re.findall(r'(?:href|src)\s*=\s*["\']([^"\']+)', html, _re.I):
        u = url.strip().lower()
        if u.startswith(("mailto:", "tel:", "cid:", "#")): continue
        if not u.startswith("https://"): return False
    return True

async def send_email(*, to: str, subject: str, html: str) -> bool:
    if not EMAIL_KEY or not _email_safe(subject, html): return False
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                   headers={"X-Email-Key": EMAIL_KEY},
                                   json={"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME})
        r.raise_for_status()
        return True
    except Exception as e:
        logging.error(f"Email send failed: {e}")
        return False

def _email_html(title: str, body: str) -> str:
    from html import escape as _esc
    return (f'<table role="presentation" width="100%" style="background:#0d0b12;padding:24px"><tr><td align="center">'
            f'<table role="presentation" width="480" style="background:#161320;border-radius:16px;'
            f'border:1px solid rgba(212,175,55,0.25);font-family:Arial,sans-serif;color:#f4f1f7">'
            f'<tr><td style="padding:24px 28px">'
            f'<div style="font-size:20px;font-weight:700;color:#f3e5ab;margin-bottom:6px">GiftsDates</div>'
            f'<div style="font-size:17px;font-weight:600;margin:14px 0 6px">{_esc(title)}</div>'
            f'<div style="font-size:14px;line-height:1.5;color:#c9c4d4">{_esc(body)}</div>'
            f'<div style="font-size:11px;color:#8a8598;margin-top:22px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px">'
            f'Sent by GiftsDates · Luxury Dating. We never ask for your password or card details by email.</div>'
            f'</td></tr></table></td></tr></table>')

async def notify(user_id: str, ntype: str, title: str, body: str, data: dict | None = None, email: bool = False, link: str | None = None, cta: str = "View on GiftsDates"):
    now = datetime.now(timezone.utc).isoformat()
    await db.notifications.insert_one({"id": str(uuid.uuid4()), "user_id": user_id, "type": ntype, "title": title,
                                       "body": body, "data": data or {}, "read": False, "created_at": now})
    if email:
        u = await db.users.find_one({"id": user_id}, {"email": 1})
        if u and u.get("email"):
            html = _email_cta_html(title, body, link, cta) if link else _email_html(title, body)
            sent = await send_email(to=u["email"], subject=f"{title} · GiftsDates", html=html)
            await db.email_outbox.insert_one({"id": str(uuid.uuid4()), "to": u["email"], "subject": title, "body": body,
                                              "status": "sent" if sent else "failed", "created_at": now})

# ---------- Auth helpers ----------
def hash_pwd(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
def verify_pwd(p: str, h: str) -> bool:
    try: return bcrypt.checkpw(p.encode(), h.encode())
    except Exception: return False
def make_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)}, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(authorization: Optional[str] = Header(None), auth: Optional[str] = None):
    tok = None
    if authorization and authorization.startswith("Bearer "):
        tok = authorization.split(" ", 1)[1]
    elif auth:
        tok = auth
    if not tok:
        raise HTTPException(401, "Missing token")
    try:
        payload = jwt.decode(tok, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(401, "User not found")
    bu = user.get("blocked_until")
    if bu and datetime.fromisoformat(bu.replace("Z", "+00:00")) > datetime.now(timezone.utc):
        raise HTTPException(403, f"BLOCKED:{bu}")
    if not user.get("referral_code"):
        user["referral_code"] = user["id"][:8].upper()
        await db.users.update_one({"id": user["id"]}, {"$set": {"referral_code": user["referral_code"]}})
    now = datetime.now(timezone.utc)
    ls = user.get("last_seen")
    if not ls or (now - datetime.fromisoformat(ls.replace("Z", "+00:00"))).total_seconds() > 60:
        user["last_seen"] = now.isoformat()
        await db.users.update_one({"id": user["id"]}, {"$set": {"last_seen": user["last_seen"]}})
    return user

async def have_met(a: str, b: str) -> bool:
    return bool(await db.date_bookings.find_one({"status": {"$in": ["confirmed", "released"]}, "$or": [{"from_id": a, "to_id": b}, {"from_id": b, "to_id": a}]}))

# ---------- Models ----------
ZODIAC_RANGES = [
    ((1, 20), "aquarius"), ((2, 19), "pisces"), ((3, 21), "aries"), ((4, 20), "taurus"),
    ((5, 21), "gemini"), ((6, 21), "cancer"), ((7, 23), "leo"), ((8, 23), "virgo"),
    ((9, 23), "libra"), ((10, 23), "scorpio"), ((11, 22), "sagittarius"), ((12, 22), "capricorn"),
]

def zodiac_sign(month: int, day: int) -> Optional[str]:
    try:
        month = int(month); day = int(day)
    except (TypeError, ValueError):
        return None
    if not (1 <= month <= 12 and 1 <= day <= 31):
        return None
    sign = "capricorn"  # Dec 22 - Jan 19 wraps to capricorn
    for (m, d), name in ZODIAC_RANGES:
        if month == m and day >= d:
            sign = name
        elif month == m and day < d:
            break
        elif month > m:
            sign = name
    return sign

def age_from_birth(year: int, month: int, day: int) -> Optional[int]:
    try:
        today = datetime.now(timezone.utc).date()
        a = today.year - int(year) - ((today.month, today.day) < (int(month), int(day)))
        return a if 0 < a < 120 else None
    except (TypeError, ValueError):
        return None

class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    name: str
    age: int
    gender: str
    interested_in: str
    orientation: Optional[str] = "straight"
    city: str
    country: str
    bio: Optional[str] = ""
    referral_code: Optional[str] = None
    spin_token: Optional[str] = None
    language: Optional[str] = "en"
    birth_year: Optional[int] = None
    birth_month: Optional[int] = None
    birth_day: Optional[int] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    birth_year: Optional[int] = None
    birth_month: Optional[int] = None
    birth_day: Optional[int] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    hide_distance: Optional[bool] = None
    passport_cities: Optional[List[dict]] = None
    interests: Optional[List[str]] = None
    photos: Optional[List[str]] = None
    language: Optional[str] = None
    relationship_intent: Optional[List[str]] = None
    orientation: Optional[str] = None
    gender: Optional[str] = None
    hobbies: Optional[List[str]] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    languages_spoken: Optional[List[str]] = None
    job_title: Optional[str] = None
    income: Optional[str] = None
    income_custom: Optional[str] = None
    kids: Optional[str] = None
    smoking: Optional[str] = None
    drinking: Optional[str] = None
    religion: Optional[str] = None
    bust_size: Optional[str] = None
    penis_size: Optional[str] = None
    date_price: Optional[int] = None
    video_rate: Optional[int] = None  # coins per minute, >= global video_rate
    availability: Optional[List[str]] = None  # ISO dates YYYY-MM-DD when user is open for dates
    availability_time: Optional[dict] = None  # {"from": "18:00", "to": "23:00"} default window
    availability_slots: Optional[dict] = None  # {"YYYY-MM-DD": {"from": "..", "to": ".."}} per-day overrides

class LikeReq(BaseModel):
    target_id: str

class GiftReq(BaseModel):
    target_id: str
    gift_id: str  # catalog id or "custom"
    message: Optional[str] = ""
    custom_icon: Optional[str] = None
    custom_cost: Optional[int] = None
    conversation_id: Optional[str] = None

CUSTOM_GIFT_MIN = 10

class VideoCallReq(BaseModel):
    target_id: str
    minutes: int

class DateBookingReq(BaseModel):
    target_id: str
    venue: str
    city: str
    scheduled_at: str  # ISO
    coins: int
    local_time: Optional[str] = None  # HH:MM in booker's local time, used for availability window check
    address: Optional[str] = ""
    postal_code: Optional[str] = ""
    country: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    place: Optional[str] = None  # VIP: own | your | other

class DateConfirmReq(BaseModel):
    booking_id: str
    photo_url: str

class WithdrawReq(BaseModel):
    amount: float

class PayoutAccountReq(BaseModel):
    # recipient
    tax_id: str
    holder_name: str  # full name
    recipient_street: str
    recipient_city: str
    recipient_province: str
    recipient_postal_code: str
    country: str  # recipient country
    recipient_email: str
    # bank
    iban: str  # account number / IBAN
    swift: str
    routing_number: Optional[str] = ""
    bank_name: str
    bank_street: str
    bank_city: str
    bank_province: str
    bank_postal_code: str
    bank_country: str
    document_path: Optional[str] = None

class AdminVerifyReq(BaseModel):
    approve: bool
    reason: Optional[str] = ""

REPORT_REASONS = {
    "underage": "Underage user",
    "illegal": "Illegal activity",
    "harassment": "Abuse or harassment",
    "hate": "Hate speech",
    "nonconsensual": "Non-consensual / intimate images",
    "impersonation": "Fake profile / impersonation",
    "scam": "Scam or fraud",
    "spam": "Spam or advertising",
    "offplatform": "Pushing off-platform contact",
    "other": "Other violation",
}

class ReportReq(BaseModel):
    target_id: str
    reason: str
    details: Optional[str] = ""

ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}
def is_admin(u: dict) -> bool:
    return u.get("is_admin") is True or u["email"].lower() in ADMIN_EMAILS
async def get_admin(user=Depends(get_current_user)):
    if not is_admin(user): raise HTTPException(403, "Admin only")
    return user

class CheckoutReq(BaseModel):
    package_id: str  # coin package id, "custom" or "premium_monthly"
    origin_url: str
    usd_amount: Optional[float] = None  # for custom

class MessageReq(BaseModel):
    conversation_id: str
    text: str

# ---------- Startup ----------
@app.on_event("startup")
async def _startup():
    init_storage()
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.likes.create_index([("from_id", 1), ("to_id", 1)], unique=True)
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.spins.create_index("token", unique=True)
    await db.spins.create_index([("ip", 1), ("used", 1)])
    await db.date_ideas.create_index("id", unique=True)
    await db.coin_transactions.create_index([("user_id", 1), ("created_at", -1)])
    for idea in build_catalog():
        await db.date_ideas.update_one({"id": idea["id"]}, {"$setOnInsert": idea}, upsert=True)
    logging.info("GiftsDates backend ready")

# ---------- Meta ----------
@api.get("/meta")
async def meta():
    s = await get_settings()
    return {
        "gifts": s["gifts"],
        "coin_packages": s["coin_packages"],
        "premium": {**PREMIUM_PACKAGE, "amount": s["premium_amount"]},
        "vip": {**VIP_PACKAGE},
        "premium_lite": {**PREMIUM_LITE_PACKAGE},
        "premium_coins": PREMIUM_COINS,
        "vip_coins": VIP_COINS,
        "premium_lite_coins": PREMIUM_LITE_COINS,
        "video_rate": s["video_rate"],
        "gift_commission": s["commission"],
        "date_min_coins": s["date_min_coins"],
        "referral_bonus": s["referral_bonus"],
        "referral_package": next((p for p in s["coin_packages"] if p["id"] == s.get("referral_package_id")), None),
        "free_daily_likes": s["free_daily_likes"],
        "custom_coins": {"per_usd": s["custom_coins_per_usd"], "bonus_pct": s["custom_bonus_pct"], "min_usd": s["custom_min_usd"]},
        "coins_per_usd": s["coins_per_usd"],
        "cancel_refund_pct": s.get("cancel_refund_pct", CANCEL_REFUND_PCT),
        "gift_auto_match_coins": s.get("gift_auto_match_coins", 100),
        "max_photos": MAX_PHOTOS,
    }

# ---------- Support chatbot / tickets ----------
class SupportChatReq(BaseModel):
    session_id: str
    message: str
    lang: Optional[str] = "en"

LANG_NAMES = {"ru": "Russian", "en": "English", "es": "Spanish", "fr": "French", "de": "German",
              "pt": "Portuguese", "zh": "Chinese", "hi": "Hindi", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic"}

class SupportTicketReq(BaseModel):
    name: Optional[str] = ""
    email: EmailStr
    message: str

@api.get("/support/config")
async def support_config():
    s = await get_support_settings()
    st = _support_status(s)
    return {
        "welcome_message": s["welcome_message"],
        "offline_message": s["offline_message"],
        "agent_enabled": s.get("agent_enabled", True),
        "hours": [{"day": h["day"], "day_name": DAY_NAMES[h["day"]], "enabled": h.get("enabled", False),
                   "open": h.get("open"), "close": h.get("close")} for h in sorted(s["hours"], key=lambda x: x["day"])],
        **st,
    }

@api.post("/support/chat")
async def support_chat(req: SupportChatReq):
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(503, "Assistant unavailable")
    text = (req.message or "").strip()[:1000]
    if not text:
        raise HTTPException(400, "Empty message")
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    if len(_support_chats) > 500:
        _support_chats.clear()
    lang_name = LANG_NAMES.get((req.lang or "en").lower(), "English")
    cached = _support_chats.get(req.session_id)
    chat = cached[0] if cached and cached[1] == lang_name else None
    if chat is None:
        sys_msg = SUPPORT_SYSTEM + f"\n\nAlways reply in {lang_name}, regardless of the language of the question."
        chat = LlmChat(api_key=key, session_id=req.session_id, system_message=sys_msg).with_model("gemini", "gemini-3-flash-preview")
        _support_chats[req.session_id] = (chat, lang_name)

    async def gen():
        try:
            async for ev in chat.stream_message(UserMessage(text=text)):
                if isinstance(ev, TextDelta):
                    yield ev.content
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logging.error(f"support chat error: {e}")
            yield "Sorry, I had trouble answering just now. Please try again, or use 'Contact an agent'."

    return StreamingResponse(gen(), media_type="text/plain",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@api.post("/support/ticket")
async def create_support_ticket(req: SupportTicketReq, authorization: Optional[str] = Header(None)):
    msg = (req.message or "").strip()
    if len(msg) < 5:
        raise HTTPException(400, "MESSAGE_TOO_SHORT")
    uid = None
    try:
        if authorization and authorization.startswith("Bearer "):
            uid = jwt.decode(authorization.split(" ", 1)[1], JWT_SECRET, algorithms=[JWT_ALG]).get("sub")
    except Exception:
        uid = None
    now = datetime.now(timezone.utc).isoformat()
    st = _support_status(await get_support_settings())
    doc = {"id": str(uuid.uuid4()), "name": (req.name or "").strip()[:120], "email": req.email,
           "message": msg[:4000], "user_id": uid, "status": "open",
           "created_while_open": st["is_open"], "created_at": now}
    await db.support_tickets.insert_one(doc)
    for a_email in ADMIN_EMAILS:
        adm = await db.users.find_one({"email": a_email}, {"_id": 0, "id": 1})
        if adm:
            await notify(adm["id"], "support", "New support message 📨",
                         f"{req.email}: {msg[:120]}", {"ticket_id": doc["id"]}, email=True)
    return {"created": True, "is_open": st["is_open"]}

# ---------- Spin-to-win (pre-registration promo) ----------
SPIN_PRIZES = [
    {"index": 0, "type": "coins", "coins": 10, "weight": 80, "label": "10"},
    {"index": 1, "type": "coins", "coins": 20, "weight": 75, "label": "20"},
    {"index": 2, "type": "coins", "coins": 30, "weight": 70, "label": "30"},
    {"index": 3, "type": "coins", "coins": 40, "weight": 60, "label": "40"},
    {"index": 4, "type": "coins", "coins": 50, "weight": 50, "label": "50"},
    {"index": 5, "type": "coins", "coins": 60, "weight": 40, "label": "60"},
    {"index": 6, "type": "coins", "coins": 100, "weight": 15, "label": "100"},
    {"index": 7, "type": "premium", "premium_days": 30, "weight": 10, "label": "PREMIUM"},
]

def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff: return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def _pick_spin_prize() -> dict:
    total = sum(p["weight"] for p in SPIN_PRIZES)
    r = secrets.randbelow(total)
    acc = 0
    for p in SPIN_PRIZES:
        acc += p["weight"]
        if r < acc: return p
    return SPIN_PRIZES[0]

def _spin_public(p: dict) -> dict:
    return {"index": p["index"], "type": p["type"], "coins": p.get("coins"), "premium_days": p.get("premium_days"), "label": p["label"]}

async def _apply_spin_bonus(token: Optional[str], uid: str) -> Optional[dict]:
    if not token: return None
    sp = await db.spins.find_one({"token": token, "used": False})
    if not sp: return None
    if sp["type"] == "coins":
        await db.users.update_one({"id": uid}, {"$inc": {"coins": int(sp["coins"])}})
        bonus = {"type": "coins", "coins": int(sp["coins"])}
    else:
        until = (datetime.now(timezone.utc) + timedelta(days=int(sp.get("premium_days", 30)))).isoformat()
        await db.users.update_one({"id": uid}, {"$set": {"premium_until": until}})
        bonus = {"type": "premium", "premium_days": int(sp.get("premium_days", 30))}
    await db.spins.update_one({"token": token}, {"$set": {"used": True, "used_by": uid, "used_at": datetime.now(timezone.utc).isoformat()}})
    return bonus

@api.get("/spin/config")
async def spin_config():
    return {"prizes": [_spin_public(p) for p in SPIN_PRIZES]}

@api.post("/spin")
async def spin(request: Request):
    ip = _client_ip(request)
    existing = await db.spins.find_one({"ip": ip, "used": False})
    if existing:
        return {**_spin_public(SPIN_PRIZES[existing["index"]]), "token": existing["token"], "locked": True}
    p = _pick_spin_prize()
    token = str(uuid.uuid4())
    await db.spins.insert_one({"id": str(uuid.uuid4()), "token": token, "index": p["index"], "type": p["type"],
                               "coins": p.get("coins"), "premium_days": p.get("premium_days"), "ip": ip,
                               "used": False, "created_at": datetime.now(timezone.utc).isoformat()})
    return {**_spin_public(p), "token": token, "locked": False}

# ---------- Date idea catalog & coin ledger ----------
@api.get("/date-ideas")
async def list_date_ideas(search: Optional[str] = None, category: Optional[str] = None,
    budget: Optional[str] = None, duration: Optional[str] = None, environment: Optional[str] = None,
    indoor: bool = False, outdoor: bool = False, casual: bool = False, romantic: bool = False,
    creative: bool = False, active: bool = False, food: bool = False, conversation: bool = False,
    entertainment: bool = False, free: bool = False, limit: int = 600, user=Depends(get_current_user)):
    conds = [{"active": True}]
    if search: conds.append({"name": {"$regex": re.escape(search.strip()), "$options": "i"}})
    if category: conds.append({"$or": [{"category": category}, {"all_categories": category}]})
    if budget: conds.append({"budget_level": budget})
    if duration: conds.append({"duration": duration})
    if environment: conds.append({"environment": {"$in": [environment, "both"]}})
    if indoor: conds.append({"indoor": True})
    if outdoor: conds.append({"outdoor": True})
    for field, val in [("casual", casual), ("romantic", romantic), ("creative", creative), ("style_active", active),
                       ("food", food), ("conversation", conversation), ("entertainment", entertainment), ("free", free)]:
        if val: conds.append({field: True})
    items = await db.date_ideas.find({"$and": conds}, {"_id": 0}).sort("name", 1).to_list(limit)
    for it in items:
        it["category_image"] = CAT_IMG.get(it.get("category"))
    cat_docs = await db.date_ideas.find({"active": True}, {"_id": 0, "category": 1, "category_label": 1}).to_list(1000)
    seen, categories = set(), []
    for c in cat_docs:
        if c["category"] not in seen:
            seen.add(c["category"]); categories.append({"key": c["category"], "label": c["category_label"]})
    categories.sort(key=lambda x: x["label"])
    return {"items": items, "total": len(items), "categories": categories}

@api.get("/coins/ledger")
async def coin_ledger(user=Depends(get_current_user)):
    txns = await db.coin_transactions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(300)
    return {"transactions": txns}

# ---------- Auth ----------
@api.post("/auth/register")
async def register(req: RegisterReq):
    if await db.users.find_one({"email": req.email.lower()}):
        raise HTTPException(400, "Email already registered")
    uid = str(uuid.uuid4())
    referrer = None
    if req.referral_code:
        referrer = await db.users.find_one({"referral_code": req.referral_code.strip().upper()}, {"id": 1})
    birth_date = None
    zodiac = None
    age = req.age
    if req.birth_year and req.birth_month and req.birth_day:
        birth_date = f"{int(req.birth_year):04d}-{int(req.birth_month):02d}-{int(req.birth_day):02d}"
        zodiac = zodiac_sign(req.birth_month, req.birth_day)
        computed = age_from_birth(req.birth_year, req.birth_month, req.birth_day)
        if computed:
            age = computed
    doc = {
        "id": uid, "email": req.email.lower(), "password": hash_pwd(req.password),
        "name": req.name, "age": age, "gender": req.gender,
        "birth_date": birth_date, "zodiac": zodiac,
        "interested_in": req.interested_in, "orientation": req.orientation or "straight", "city": req.city, "country": req.country,
        "lat": req.lat, "lng": req.lng,
        "bio": req.bio or "", "interests": [], "photos": [], "language": req.language or "en",
        "coins": 0,  # no welcome bonus (Spin & Win only)
        "escrow": 0.0, "withdrawable": 0.0,
        "premium_until": None, "verified": False,
        "referral_code": uid[:8].upper(), "referred_by": referrer["id"] if referrer else None,
        "referral_rewarded": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    spin_bonus = await _apply_spin_bonus(req.spin_token, uid)
    fresh = await db.users.find_one({"id": uid})
    return {"token": make_token(uid), "user": {k: v for k, v in fresh.items() if k not in ("password", "_id")}, "spin_bonus": spin_bonus}

@api.post("/auth/login")
async def login(req: LoginReq):
    u = await db.users.find_one({"email": req.email.lower()})
    if not u or not verify_pwd(req.password, u["password"]):
        raise HTTPException(401, "Invalid credentials")
    bu = u.get("blocked_until")
    if bu and datetime.fromisoformat(bu.replace("Z", "+00:00")) > datetime.now(timezone.utc):
        raise HTTPException(403, f"BLOCKED:{bu}")
    return {"token": make_token(u["id"]), "user": {k: v for k, v in u.items() if k not in ("password", "_id")}}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    user["is_premium"] = is_premium(user)
    user["is_vip"] = is_vip(user)
    user["is_premium_lite"] = is_premium_lite(user)
    return user

@api.patch("/auth/me")
async def update_me(patch: ProfileUpdate, user=Depends(get_current_user)):
    upd = {k: v for k, v in patch.model_dump().items() if v is not None}
    if "hide_distance" in upd and upd["hide_distance"] and not is_vip(user):
        raise HTTPException(403, "VIP_REQUIRED")
    if "height" in upd and not (100 <= upd["height"] <= 250): raise HTTPException(400, "Height must be 100-250 cm")
    if "weight" in upd and not (30 <= upd["weight"] <= 300): raise HTTPException(400, "Weight must be 30-300 kg")
    if "date_price" in upd:
        mn = (await get_settings())["date_min_coins"]
        if upd["date_price"] < mn: raise HTTPException(400, f"Date price must be at least {mn} coins")
    if "photos" in upd and len(upd["photos"]) > MAX_PHOTOS:
        raise HTTPException(400, f"Max {MAX_PHOTOS} photos")
    if "video_rate" in upd:
        mn = (await get_settings())["video_rate"]
        if upd["video_rate"] < mn: raise HTTPException(400, f"Video rate must be at least {mn} coins/min")
    if "passport_cities" in upd:
        cleaned = []
        for c in (upd["passport_cities"] or [])[:8]:
            try:
                if isinstance(c, dict) and c.get("city") and c.get("lat") is not None and c.get("lng") is not None:
                    cleaned.append({"city": str(c["city"])[:80], "lat": float(c["lat"]), "lng": float(c["lng"])})
            except Exception:
                continue
        upd["passport_cities"] = cleaned
    if "availability" in upd:
        upd["availability"] = sorted({d[:10] for d in upd["availability"] if re.fullmatch(r"\d{4}-\d{2}-\d{2}", d[:10])})
    def _win_ok(w): return isinstance(w, dict) and re.fullmatch(r"\d{2}:\d{2}", str(w.get("from", ""))) and re.fullmatch(r"\d{2}:\d{2}", str(w.get("to", ""))) and w["from"] < w["to"]
    if "availability_time" in upd and upd["availability_time"] and not _win_ok(upd["availability_time"]): raise HTTPException(400, "Invalid time window")
    if "availability_slots" in upd:
        upd["availability_slots"] = {k[:10]: v for k, v in (upd["availability_slots"] or {}).items() if re.fullmatch(r"\d{4}-\d{2}-\d{2}", k[:10]) and _win_ok(v)}
    by, bm, bd = upd.pop("birth_year", None), upd.pop("birth_month", None), upd.pop("birth_day", None)
    if by and bm and bd:
        upd["birth_date"] = f"{int(by):04d}-{int(bm):02d}-{int(bd):02d}"
        upd["zodiac"] = zodiac_sign(bm, bd)
        computed = age_from_birth(by, bm, bd)
        if computed: upd["age"] = computed
    if upd:
        await db.users.update_one({"id": user["id"]}, {"$set": upd})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return fresh

# ---------- Uploads ----------
@api.post("/upload")
async def upload(file: UploadFile = File(...), user=Depends(get_current_user)):
    ext = (file.filename.split(".")[-1] if "." in file.filename else "bin").lower()
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    ct = file.content_type or "application/octet-stream"
    result = put_object(path, data, ct)
    await db.files.insert_one({
        "id": str(uuid.uuid4()), "storage_path": result["path"],
        "user_id": user["id"], "content_type": ct, "size": result["size"],
        "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}

@api.post("/profile/photos")
async def add_photo(file: UploadFile = File(...), user=Depends(get_current_user)):
    photos = user.get("photos") or []
    if len(photos) >= MAX_PHOTOS: raise HTTPException(400, f"Max {MAX_PHOTOS} photos")
    if not (file.content_type or "").startswith("image/"): raise HTTPException(400, "Only images allowed")
    ext = (file.filename.split(".")[-1] if "." in file.filename else "jpg").lower()
    path = f"{APP_NAME}/photos/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type)
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": result["path"], "user_id": user["id"],
                               "content_type": file.content_type, "size": result["size"], "is_deleted": False,
                               "created_at": datetime.now(timezone.utc).isoformat()})
    photos.append(result["path"])
    await db.users.update_one({"id": user["id"]}, {"$set": {"photos": photos}})
    return {"photos": photos}

# ---------- News feed (stories) ----------
FEED_TEXT_COINS = 100
FEED_VIDEO_COINS = 150
FEED_MAX = 50
FEED_VIDEO_MAX_BYTES = 120 * 1024 * 1024

@api.get("/feed")
async def get_feed(country: Optional[str] = None, city: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if country: q["user_country"] = {"$regex": country, "$options": "i"}
    if city: q["user_city"] = {"$regex": city, "$options": "i"}
    return await db.feed.find(q, {"_id": 0}).sort("created_at", -1).to_list(FEED_MAX)

@api.post("/feed")
async def create_feed(text: str = Form(""), video: Optional[UploadFile] = File(None), user=Depends(get_current_user)):
    text = (text or "").strip()[:80]
    has_video = video is not None
    if not text and not has_video:
        raise HTTPException(400, "EMPTY_POST")
    cost = (FEED_TEXT_COINS if text else 0) + (FEED_VIDEO_COINS if has_video else 0)
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "coins": 1, "withdrawable": 1, "photos": 1, "name": 1, "age": 1, "city": 1, "country": 1, "gender": 1})
    if ((fresh.get("coins") or 0) + (fresh.get("withdrawable") or 0)) < cost:
        raise HTTPException(400, "INSUFFICIENT_COINS")
    video_path = None
    if has_video:
        data = await video.read()
        if len(data) > FEED_VIDEO_MAX_BYTES:
            raise HTTPException(400, "VIDEO_TOO_LARGE")
        ct = video.content_type or "video/mp4"
        if not ct.startswith("video/"):
            raise HTTPException(400, "NOT_VIDEO")
        ext = (video.filename.split(".")[-1] if video.filename and "." in video.filename else "mp4").lower()
        path = f"{APP_NAME}/feed/{user['id']}/{uuid.uuid4()}.{ext}"
        result = put_object(path, data, ct)
        video_path = result["path"]
        await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": video_path, "user_id": user["id"],
                                   "content_type": ct, "size": result["size"], "is_deleted": False, "private": False,
                                   "created_at": datetime.now(timezone.utc).isoformat()})
    await spend_coins(user["id"], cost)
    now = datetime.now(timezone.utc).isoformat()
    photos = fresh.get("photos") or []
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "user_name": fresh.get("name"),
           "user_avatar": photos[0] if photos else None, "text": text or None,
           "user_age": fresh.get("age"), "user_city": fresh.get("city"), "user_country": fresh.get("country"),
           "gender": fresh.get("gender"),
           "video_path": video_path, "has_video": has_video, "created_at": now}
    await db.feed.insert_one({**doc})
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "type": "feed_post",
                                      "coins": -cost, "created_at": now})
    extras = await db.feed.find({}, {"_id": 0, "id": 1}).sort("created_at", -1).skip(FEED_MAX).to_list(1000)
    if extras:
        await db.feed.delete_many({"id": {"$in": [e["id"] for e in extras]}})
    return {"posted": True, "cost": cost, "item": doc}

@api.delete("/feed/{fid}")
async def delete_feed(fid: str, user=Depends(get_current_user)):
    it = await db.feed.find_one({"id": fid})
    if not it:
        raise HTTPException(404, "Not found")
    if it["user_id"] != user["id"] and not is_admin(user):
        raise HTTPException(403, "Forbidden")
    await db.feed.delete_one({"id": fid})
    if it.get("video_path"):
        await db.files.update_one({"storage_path": it["video_path"]}, {"$set": {"is_deleted": True}})
    return {"deleted": True}

class PhotoReq(BaseModel):
    path: str

@api.delete("/profile/photos")
async def delete_photo(req: PhotoReq, user=Depends(get_current_user)):
    photos = [p for p in (user.get("photos") or []) if p != req.path]
    await db.users.update_one({"id": user["id"]}, {"$set": {"photos": photos}})
    await db.files.update_one({"storage_path": req.path, "user_id": user["id"]}, {"$set": {"is_deleted": True}})
    return {"photos": photos}

@api.post("/profile/photos/primary")
async def primary_photo(req: PhotoReq, user=Depends(get_current_user)):
    photos = user.get("photos") or []
    if req.path not in photos: raise HTTPException(404, "Photo not found")
    photos = [req.path] + [p for p in photos if p != req.path]
    await db.users.update_one({"id": user["id"]}, {"$set": {"photos": photos}})
    return {"photos": photos}

# ---------- Identity verification (ID + selfie) ----------
@api.post("/verification/upload")
async def verification_upload(kind: str, file: UploadFile = File(...), user=Depends(get_current_user)):
    if kind not in ("id", "selfie"): raise HTTPException(400, "kind must be id or selfie")
    if not (file.content_type or "").startswith("image/"): raise HTTPException(400, "Only images allowed")
    v = user.get("verification") or {}
    if v.get("status") == "verified": raise HTTPException(400, "Already verified")
    ext = (file.filename.split(".")[-1] if "." in file.filename else "jpg").lower()
    path = f"{APP_NAME}/verification/{user['id']}/{kind}-{uuid.uuid4()}.{ext}"
    result = put_object(path, await file.read(), file.content_type)
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": result["path"], "user_id": user["id"], "private": True,
                               "content_type": file.content_type, "size": result["size"], "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()})
    v[f"{kind}_path"] = result["path"]
    v["status"] = "pending" if v.get("id_path") and v.get("selfie_path") else "incomplete"
    v["reason"] = ""
    if v["status"] == "pending": v["submitted_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": user["id"]}, {"$set": {"verification": v}})
    return v

@api.get("/verification")
async def verification_status(user=Depends(get_current_user)):
    return user.get("verification") or {"status": "none"}

@api.get("/admin/verifications")
async def admin_verifications(status: str = "pending", admin=Depends(get_admin)):
    q = {"verification.status": status} if status != "all" else {"verification": {"$exists": True}}
    users = await db.users.find(q, {"_id": 0, "id": 1, "name": 1, "email": 1, "age": 1, "city": 1, "country": 1, "verification": 1, "verified": 1}).sort("verification.submitted_at", -1).to_list(200)
    return users

@api.post("/admin/verifications/{user_id}/verify")
async def admin_verify_identity(user_id: str, req: AdminVerifyReq, admin=Depends(get_admin)):
    u = await db.users.find_one({"id": user_id})
    if not u or not u.get("verification"): raise HTTPException(404, "Not found")
    status = "verified" if req.approve else "rejected"
    await db.users.update_one({"id": user_id}, {"$set": {"verified": req.approve, "verification.status": status, "verification.reason": req.reason or "",
                                                          "verification.reviewed_at": datetime.now(timezone.utc).isoformat(), "verification.reviewed_by": admin["id"]}})
    await notify(user_id, "identity", "Identity verified ✅" if req.approve else "Identity verification rejected",
                 "Your profile now has the verified badge." if req.approve else (req.reason or "Please upload clearer photos of your ID and selfie."), email=True)
    return {"status": status}

@api.post("/reports")
async def create_report(req: ReportReq, user=Depends(get_current_user)):
    if req.reason not in REPORT_REASONS:
        raise HTTPException(400, "INVALID_REASON")
    if req.target_id == user["id"]:
        raise HTTPException(400, "CANNOT_REPORT_SELF")
    target = await db.users.find_one({"id": req.target_id}, {"_id": 0, "id": 1, "name": 1})
    if not target:
        raise HTTPException(404, "User not found")
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.reports.find_one({"reporter_id": user["id"], "target_id": req.target_id, "status": "open"})
    if existing:
        raise HTTPException(409, "ALREADY_REPORTED")
    await db.reports.insert_one({
        "id": str(uuid.uuid4()), "reporter_id": user["id"], "reporter_name": user.get("name"),
        "target_id": req.target_id, "target_name": target.get("name"),
        "reason": req.reason, "reason_label": REPORT_REASONS[req.reason],
        "details": (req.details or "").strip()[:2000], "status": "open", "created_at": now,
    })
    for a_email in ADMIN_EMAILS:
        adm = await db.users.find_one({"email": a_email}, {"_id": 0, "id": 1})
        if adm:
            await notify(adm["id"], "report", "New user report 🚩",
                         f"{user.get('name')} reported {target.get('name')} · {REPORT_REASONS[req.reason]}",
                         {"target_id": req.target_id})
    return {"reported": True}

@api.get("/admin/reports")
async def admin_reports(status: str = "open", admin=Depends(get_admin)):
    q = {} if status == "all" else {"status": status}
    reports = await db.reports.find(q, {"_id": 0}).sort("created_at", -1).to_list(300)
    return reports

@api.post("/admin/reports/{rid}/resolve")
async def admin_resolve_report(rid: str, admin=Depends(get_admin)):
    r = await db.reports.find_one({"id": rid})
    if not r:
        raise HTTPException(404, "Not found")
    await db.reports.update_one({"id": rid}, {"$set": {"status": "resolved",
                                "resolved_at": datetime.now(timezone.utc).isoformat(), "resolved_by": admin["id"]}})
    return {"status": "resolved"}

@api.post("/admin/reports/{rid}/block")
async def admin_block_from_report(rid: str, admin=Depends(get_admin)):
    r = await db.reports.find_one({"id": rid})
    if not r:
        raise HTTPException(404, "Not found")
    new_until = datetime.now(timezone.utc) + timedelta(days=BLOCK_DAYS)
    target = await db.users.find_one({"id": r["target_id"]}, {"_id": 0, "blocked_until": 1})
    existing = target.get("blocked_until") if target else None
    if existing:
        try:
            ex = datetime.fromisoformat(existing.replace("Z", "+00:00"))
            if ex > new_until:
                new_until = ex
        except Exception:
            pass
    until = new_until.isoformat()
    await db.users.update_one({"id": r["target_id"]}, {"$set": {"blocked_until": until}})
    await db.reports.update_one({"id": rid}, {"$set": {"status": "resolved", "action": "blocked",
                                "resolved_at": datetime.now(timezone.utc).isoformat(), "resolved_by": admin["id"]}})
    await notify(r["target_id"], "blocked", "Account blocked 🚫",
                 f"Your account was blocked for {BLOCK_DAYS} days following a policy violation report.", {"until": until}, email=True)
    return {"status": "resolved", "action": "blocked", "until": until}

@api.get("/files/{path:path}")
async def download(path: str, authorization: Optional[str] = Header(None), auth: Optional[str] = None):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not rec:
        raise HTTPException(404, "Not found")
    if rec.get("private"):
        token = auth or (authorization.split(" ", 1)[1] if authorization and " " in authorization else None)
        try: uid = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])["sub"] if token else None
        except Exception: uid = None
        viewer = await db.users.find_one({"id": uid}) if uid else None
        if not viewer or (viewer["id"] != rec["user_id"] and viewer["id"] not in (rec.get("viewers") or []) and not is_admin(viewer)): raise HTTPException(403, "Private file")
    data, ct = get_object(path)
    return Response(content=data, media_type=rec.get("content_type") or ct)

# ---------- Profiles / Search ----------
def haversine_km(lat1, lng1, lat2, lng2):
    """Great-circle distance in km between two lat/lng points, or None if any missing."""
    if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
        return None
    try:
        from math import radians, sin, cos, asin, sqrt
        rlat1, rlat2 = radians(float(lat1)), radians(float(lat2))
        dlat = rlat2 - rlat1
        dlng = radians(float(lng2) - float(lng1))
        a = sin(dlat / 2) ** 2 + cos(rlat1) * cos(rlat2) * sin(dlng / 2) ** 2
        return round(2 * 6371.0088 * asin(sqrt(a)), 2)
    except Exception:
        return None

def visible_distance(vlat, vlng, target: dict):
    """Distance in km from a viewer to a target, honoring the target's hide_distance privacy flag."""
    if target.get("hide_distance"):
        return None
    return haversine_km(vlat, vlng, target.get("lat"), target.get("lng"))

@api.get("/profiles")
async def list_profiles(
    q: Optional[str] = None, city: Optional[str] = None, country: Optional[str] = None,
    min_age: int = 18, max_age: int = 99, gender: Optional[str] = None,
    intent: Optional[str] = None, min_height: Optional[int] = None, max_height: Optional[int] = None,
    kids: Optional[str] = None, smoking: Optional[str] = None, religion: Optional[str] = None, orientation: Optional[str] = None,
    drinking: Optional[str] = None, income: Optional[str] = None, language: Optional[str] = None,
    hobby: Optional[str] = None, job: Optional[str] = None, min_weight: Optional[int] = None, max_weight: Optional[int] = None,
    bust_size: Optional[str] = None, penis_size: Optional[str] = None, max_date_price: Optional[int] = None,
    premium_only: bool = False, vip_only: bool = False, with_photos: bool = False, verified_only: bool = False, online_now: bool = False,
    vip_categories: Optional[str] = None, vip_min_price: Optional[int] = None, vip_max_price: Optional[int] = None, vip_date: Optional[str] = None,
    max_distance: Optional[int] = None, sort: Optional[str] = None,
    origin_lat: Optional[float] = None, origin_lng: Optional[float] = None,
    online_nearby: bool = False,
    limit: int = 40, user=Depends(get_current_user)
):
    conds = [{"id": {"$ne": user["id"]}}, {"age": {"$gte": min_age, "$lte": max_age}}]
    advanced_used = any(v not in (None, "", "all", False) for v in (intent, min_height, max_height, kids, smoking, religion, drinking, income, language, orientation,
                                                                   hobby, job, min_weight, max_weight, bust_size, penis_size, max_date_price, premium_only, with_photos, verified_only, online_now,
                                                                   vip_categories, vip_min_price, vip_max_price, vip_date))
    if advanced_used and not has_premium(user): raise HTTPException(403, "PREMIUM_REQUIRED")
    vip_adv = bool(vip_categories or (vip_min_price is not None) or (vip_max_price is not None) or vip_date)
    if vip_adv and not is_vip(user): raise HTTPException(403, "VIP_REQUIRED")
    vip_filter = bool(vip_only or vip_adv)
    if city and city.strip().lower() != "global":
        conds.append({"$or": [{"city": {"$regex": re.escape(city.strip()), "$options": "i"}}, {"city": {"$regex": "^global$", "$options": "i"}}]})
    if country and country.strip().lower() != "global":
        conds.append({"$or": [{"country": {"$regex": re.escape(country.strip()), "$options": "i"}}, {"country": {"$regex": "^global$", "$options": "i"}}]})
    if gender and gender != "all": conds.append({"gender": gender})
    if q: conds.append({"$or": [{"name": {"$regex": q, "$options": "i"}}, {"bio": {"$regex": q, "$options": "i"}}]})
    for field, val in (("relationship_intent", intent), ("kids", kids), ("smoking", smoking), ("religion", religion), ("orientation", orientation),
                       ("drinking", drinking), ("income", income), ("bust_size", bust_size), ("penis_size", penis_size)):
        if val and val != "all": conds.append({field: val})
    if language and language != "all": conds.append({"languages_spoken": language})
    if hobby: conds.append({"hobbies": {"$elemMatch": {"$regex": re.escape(hobby), "$options": "i"}}})
    if job: conds.append({"job_title": {"$regex": re.escape(job), "$options": "i"}})
    for field, lo, hi in (("height", min_height, max_height), ("weight", min_weight, max_weight)):
        if lo or hi:
            r = {}
            if lo: r["$gte"] = lo
            if hi: r["$lte"] = hi
            conds.append({field: r})
    if max_date_price: conds.append({"$or": [{"date_price": {"$lte": max_date_price}}, {"date_price": None}, {"date_price": {"$exists": False}}]})
    if with_photos: conds.append({"photos.0": {"$exists": True}})
    if verified_only: conds.append({"verified": True})
    if online_now: conds.append({"last_seen": {"$gt": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()}})
    if online_nearby: conds.append({"last_seen": {"$gt": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()}})
    now_iso = datetime.now(timezone.utc).isoformat()
    if premium_only: conds.append({"premium_until": {"$gt": now_iso}})
    if vip_filter: conds.append({"vip_until": {"$gt": now_iso}}); conds.append({"vip.published": {"$ne": False}})
    if vip_categories:
        cats = [c.strip() for c in vip_categories.split(",") if c.strip() in VIP_SERVICES]
        names = [s for c in cats for s in VIP_SERVICES[c]]
        if names: conds.append({"vip.services": {"$in": names}})
    if vip_min_price is not None or vip_max_price is not None:
        checks = []
        if vip_min_price is not None: checks.append({"$gte": ["$$p.v", vip_min_price]})
        if vip_max_price is not None: checks.append({"$lte": ["$$p.v", vip_max_price]})
        conds.append({"$expr": {"$anyElementTrue": {"$map": {"input": {"$objectToArray": {"$ifNull": ["$vip.prices", {}]}}, "as": "p", "in": {"$and": checks}}}}})
    if vip_date:
        conds.append({"vip.availability": {"$elemMatch": {"date": vip_date}}})
    proj = {"_id": 0, "password": 0, "email": 0, "referred_by": 0, "referral_code": 0}
    _not_premium = [{"$or": [{"premium_until": None}, {"premium_until": {"$lte": now_iso}}, {"premium_until": {"$exists": False}}]}]
    _not_lite = [{"$or": [{"premium_lite_until": None}, {"premium_lite_until": {"$lte": now_iso}}, {"premium_lite_until": {"$exists": False}}]}]
    # Top placement: Premium + VIP (both carry premium_until). Then Premium-lite placement. Then everyone else.
    top = await db.users.find({"$and": conds + [{"premium_until": {"$gt": now_iso}}]}, proj).limit(limit).to_list(limit)
    lite_limit = max(limit - len(top), 0)
    lite = await db.users.find({"$and": conds + [{"premium_lite_until": {"$gt": now_iso}}] + _not_premium}, proj).limit(lite_limit).to_list(lite_limit) if lite_limit else []
    rest_limit = max(limit - len(top) - len(lite), 0)
    rest = await db.users.find({"$and": conds + _not_premium + _not_lite}, proj).limit(rest_limit).to_list(rest_limit) if rest_limit else []
    for p in top: p["is_premium"] = True; p["is_vip"] = is_vip(p); p["is_premium_lite"] = False
    for p in lite: p["is_premium"] = False; p["is_vip"] = False; p["is_premium_lite"] = True
    for p in rest: p["is_premium"] = False; p["is_vip"] = False; p["is_premium_lite"] = False
    results = top + lite + rest
    if vip_filter:
        # In the VIP section, listings posted "separately" appear as their own anonymous card
        results = [_vip_listing_card(p) for p in results]
    else:
        # On the main feed, hide any VIP hint for listings posted separately with show_on_main disabled
        for p in results:
            v = p.get("vip") or {}
            if v.get("post_mode") == "separate" and not v.get("show_on_main", True):
                p["is_vip"] = False
    # Distance from the viewer (or a Travel-mode origin) to each profile (km). Exact coords are never exposed.
    vlat = origin_lat if origin_lat is not None else user.get("lat")
    vlng = origin_lng if origin_lng is not None else user.get("lng")
    for p in results:
        d = visible_distance(vlat, vlng, p)
        if d is not None:
            p["distance_km"] = d
        p.pop("lat", None)
        p.pop("lng", None)
        p.pop("hide_distance", None)
    # Radius filter: only keep profiles within max_distance km (requires origin + target coords).
    # Online-nearby applies a sensible default radius when the member hasn't picked one.
    eff_max = max_distance or (100 if online_nearby else None)
    if eff_max and vlat is not None and vlng is not None:
        results = [p for p in results if p.get("distance_km") is not None and p["distance_km"] <= eff_max]
    # Nearby sort: closest first (profiles without a distance go last)
    if (sort == "nearby" or online_nearby) and vlat is not None and vlng is not None:
        results.sort(key=lambda p: p.get("distance_km") if p.get("distance_km") is not None else float("inf"))
    return results

def _vip_listing_card(p: dict) -> dict:
    """Build a browse card for a VIP listing. Separate listings are fully anonymised
    (own nickname/photos/age/city) so they can't be linked to the owner's main profile."""
    v = p.get("vip") or {}
    if v.get("post_mode") != "separate":
        return p
    return {
        "id": v.get("public_id") or p.get("id"),
        "name": (v.get("nickname") or "").strip() or "VIP",
        "age": v.get("age") or p.get("age"),
        "city": v.get("city") or p.get("city"),
        "country": v.get("country") or p.get("country"),
        "gender": v.get("gender") or p.get("gender"),
        "bio": v.get("bio") or "",
        "photos": v.get("photos") or [],
        "is_vip": True, "is_premium": bool(p.get("is_premium")), "is_premium_lite": bool(p.get("is_premium_lite")),
        "vip_listing": True, "verified": False, "last_seen": None,
    }

@api.get("/profiles/{pid}")
async def profile_detail(pid: str, user=Depends(get_current_user)):
    p = await db.users.find_one({"id": pid}, {"_id": 0, "password": 0, "email": 0, "referred_by": 0, "referral_code": 0})
    if not p:
        # Might be a standalone (separate) VIP listing referenced by its public id
        owner = await db.users.find_one({"vip.public_id": pid}, {"_id": 0, "id": 1, "age": 1, "city": 1, "country": 1, "gender": 1, "vip": 1})
        v = (owner or {}).get("vip") or {}
        if owner and v.get("post_mode") == "separate" and v.get("published") is not False:
            return {
                "id": v.get("public_id"), "name": (v.get("nickname") or "").strip() or "VIP",
                "age": v.get("age") or owner.get("age"), "city": v.get("city") or owner.get("city"),
                "country": v.get("country") or owner.get("country"), "gender": v.get("gender") or owner.get("gender"),
                "bio": v.get("bio") or "", "photos": v.get("photos") or [],
                "is_vip": True, "is_premium": False, "vip_listing": True,
                "liked_by_me": False, "conversation_id": None,
                "gifts_total": 0, "gifts_count": 0, "top_givers": [],
            }
        raise HTTPException(404, "Not found")
    p["is_premium"] = is_premium(p)
    p["is_vip"] = is_vip(p)
    p["is_premium_lite"] = is_premium_lite(p)
    # Hide the VIP hint on the main profile when the listing is posted separately with show_on_main off
    _v = p.get("vip") or {}
    if _v.get("post_mode") == "separate" and not _v.get("show_on_main", True):
        p["is_vip"] = False
    p["liked_by_me"] = bool(await db.likes.find_one({"from_id": user["id"], "to_id": pid}))
    m = await db.matches.find_one({"users": {"$all": [user["id"], pid]}})
    p["conversation_id"] = m["id"] if m else None
    agg = await db.transactions.aggregate([{"$match": {"to_id": pid, "type": "gift"}}, {"$group": {"_id": "$from_id", "total": {"$sum": "$cost"}, "count": {"$sum": 1}}}, {"$sort": {"total": -1}}]).to_list(1000)
    p["gifts_total"] = sum(a["total"] for a in agg)
    p["gifts_count"] = sum(a["count"] for a in agg)
    top = []
    for a in agg[:3]:
        g = await db.users.find_one({"id": a["_id"]}, {"_id": 0, "id": 1, "name": 1, "photos": 1})
        if g: top.append({"id": g["id"], "name": g["name"], "photo": (g.get("photos") or [None])[0], "total": a["total"], "count": a["count"]})
    p["top_givers"] = top
    d = visible_distance(user.get("lat"), user.get("lng"), p)
    if d is not None:
        p["distance_km"] = d
    # Approximate location for a map preview: rounded to ~1 decimal (~11 km grid) to protect privacy
    if not p.get("hide_distance") and p.get("lat") is not None and p.get("lng") is not None:
        p["approx_lat"] = round(float(p["lat"]), 1)
        p["approx_lng"] = round(float(p["lng"]), 1)
    p.pop("lat", None)
    p.pop("lng", None)
    p.pop("hide_distance", None)
    return p

# ---------- Likes / Matches ----------
@api.post("/likes")
async def like(req: LikeReq, user=Depends(get_current_user)):
    if req.target_id == user["id"]: raise HTTPException(400, "Cannot like yourself")
    now = datetime.now(timezone.utc).isoformat()
    already = await db.likes.find_one({"from_id": user["id"], "to_id": req.target_id})
    if not already and not has_premium(user):
        limit = (await get_settings())["free_daily_likes"]
        day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        used = await db.likes.count_documents({"from_id": user["id"], "created_at": {"$gte": day_start}})
        if used >= limit: raise HTTPException(429, f"LIKE_LIMIT:{limit}")
    try:
        await db.likes.insert_one({"from_id": user["id"], "to_id": req.target_id, "created_at": now})
    except Exception:
        pass
    reverse = await db.likes.find_one({"from_id": req.target_id, "to_id": user["id"]})
    matched = False
    if reverse:
        matched = True
        conv_id, created = await ensure_match(user["id"], req.target_id)
        if created:
            other = await db.users.find_one({"id": req.target_id}, {"name": 1})
            await notify(req.target_id, "match", "It's a match! 💘", f"You and {user['name']} liked each other. Say hello!", {"conversation_id": conv_id, "user_id": user["id"], "name": user["name"]}, email=True)
            await notify(user["id"], "match", "It's a match! 💘", f"You and {other['name']} liked each other. Say hello!", {"conversation_id": conv_id, "user_id": req.target_id, "name": other["name"]}, email=True)
    elif not already:
        await notify(req.target_id, "like", "Someone likes you ❤️", f"{user['name']} liked your profile. Like back to match!", {"user_id": user["id"], "name": user["name"]}, email=True)
    return {"liked": True, "matched": matched}

@api.get("/likes/received")
async def likes_received(user=Depends(get_current_user)):
    likes = await db.likes.find({"to_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    matched = {u for m in await db.matches.find({"users": user["id"]}, {"_id": 0, "users": 1}).to_list(500) for u in m["users"]}
    premium = has_premium(user)
    items = []
    for lk in likes:
        if lk["from_id"] in matched: continue
        u = await db.users.find_one({"id": lk["from_id"]}, {"_id": 0, "id": 1, "name": 1, "age": 1, "city": 1, "country": 1, "photos": 1})
        if not u: continue
        if premium: items.append({**u, "liked_at": lk["created_at"]})
        else: items.append({"id": u["id"], "photos": u.get("photos", [])[:1], "liked_at": lk["created_at"]})
    return {"premium": premium, "count": len(items), "items": items}

@api.get("/likes/quota")
async def likes_quota(user=Depends(get_current_user)):
    limit = (await get_settings())["free_daily_likes"]
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    used = await db.likes.count_documents({"from_id": user["id"], "created_at": {"$gte": day_start}})
    prem = has_premium(user)
    return {"premium": prem, "limit": None if prem else limit, "used": used, "remaining": None if prem else max(limit - used, 0)}

# ---------- Notifications ----------
@api.get("/notifications")
async def list_notifications(unread_only: bool = False, user=Depends(get_current_user)):
    q = {"user_id": user["id"]}
    if unread_only: q["read"] = False
    items = await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).to_list(50)
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"items": items, "unread": unread}

@api.post("/notifications/read")
async def read_notifications(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}

# ---------- Referrals ----------
@api.get("/referrals")
async def referrals(user=Depends(get_current_user)):
    invited = await db.users.find({"referred_by": user["id"]}, {"_id": 0, "name": 1, "created_at": 1, "referral_rewarded": 1}).to_list(200)
    earned = await db.transactions.find({"to_id": user["id"], "type": "referral_bonus"}, {"_id": 0}).to_list(500)
    s = await get_settings()
    pkg = next((p for p in s["coin_packages"] if p["id"] == s.get("referral_package_id")), None)
    return {"code": user["referral_code"], "bonus": s["referral_bonus"], "package": pkg, "invited": invited,
            "earned": sum(t["cost"] for t in earned), "rewarded_count": len(earned)}

async def _reward_referrer(buyer_id: str):
    buyer = await db.users.find_one({"id": buyer_id})
    if not buyer or not buyer.get("referred_by") or buyer.get("referral_rewarded"): return
    res = await db.users.update_one({"id": buyer_id, "referral_rewarded": {"$ne": True}}, {"$set": {"referral_rewarded": True}})
    if res.modified_count == 0: return
    bonus = (await get_settings())["referral_bonus"]
    await db.users.update_one({"id": buyer["referred_by"]}, {"$inc": {"coins": bonus}})
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "type": "referral_bonus", "from_id": buyer_id, "to_id": buyer["referred_by"],
                                      "cost": bonus, "net": bonus, "created_at": datetime.now(timezone.utc).isoformat()})
    await notify(buyer["referred_by"], "referral", f"+{bonus} 🪙 referral bonus", f"{buyer['name']} bought their first pack. Thanks for inviting!", {"user_id": buyer_id})

@api.get("/matches")
async def my_matches(user=Depends(get_current_user)):
    matches = await db.matches.find({"users": user["id"]}, {"_id": 0}).to_list(200)
    result = []
    for m in matches:
        other_id = [u for u in m["users"] if u != user["id"]][0]
        other = await db.users.find_one({"id": other_id}, {"_id": 0, "password": 0, "email": 0})
        if other:
            d = visible_distance(user.get("lat"), user.get("lng"), other)
            if d is not None:
                other["distance_km"] = d
            other.pop("lat", None)
            other.pop("lng", None)
            other.pop("hide_distance", None)
            result.append({"conversation_id": m["id"], "user": other, "created_at": m["created_at"], "can_share_media": await have_met(user["id"], other_id)})
    return result

@api.post("/conversations/{cid}/photo")
async def send_chat_photo(cid: str, file: UploadFile = File(...), user=Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": cid})
    if not conv or user["id"] not in conv["users"]: raise HTTPException(403, "No access")
    other_id = [u for u in conv["users"] if u != user["id"]][0]
    if not await have_met(user["id"], other_id): raise HTTPException(403, "MEDIA_LOCKED")
    if not (file.content_type or "").startswith("image/"): raise HTTPException(400, "Only images allowed")
    ext = (file.filename.split(".")[-1] if "." in file.filename else "jpg").lower()
    path = f"{APP_NAME}/chat/{cid}/{uuid.uuid4()}.{ext}"
    result = put_object(path, await file.read(), file.content_type)
    now = datetime.now(timezone.utc).isoformat()
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": result["path"], "user_id": user["id"], "viewers": conv["users"], "private": True,
                               "content_type": file.content_type, "size": result["size"], "is_deleted": False, "created_at": now})
    msg = {"id": str(uuid.uuid4()), "conversation_id": cid, "from_id": user["id"], "text": "", "type": "image", "image_path": result["path"], "created_at": now}
    await db.messages.insert_one(dict(msg))
    await db.conversations.update_one({"id": cid}, {"$set": {"last_message": "📷", "last_at": now}})
    return msg

# ---------- Chat ----------
@api.get("/conversations/{cid}/messages")
async def get_messages(cid: str, user=Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": cid})
    if not conv or user["id"] not in conv["users"]: raise HTTPException(403, "No access")
    msgs = await db.messages.find({"conversation_id": cid}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return msgs

@api.post("/conversations/messages")
async def send_message(req: MessageReq, user=Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": req.conversation_id})
    if not conv or user["id"] not in conv["users"]: raise HTTPException(403, "No access")
    now = datetime.now(timezone.utc).isoformat()
    if contains_phone(req.text):
        other_id = [u for u in conv["users"] if u != user["id"]][0]
        met = await db.date_bookings.find_one({"status": {"$in": ["confirmed", "released"]}, "$or": [
            {"from_id": user["id"], "to_id": other_id}, {"from_id": other_id, "to_id": user["id"]}]})
        if not met:
            violations = (user.get("violations") or 0) + 1
            upd = {"$set": {"violations": violations}}
            blocked = violations >= MAX_VIOLATIONS
            if blocked:
                until = (datetime.now(timezone.utc) + timedelta(days=BLOCK_DAYS)).isoformat()
                upd["$set"]["blocked_until"] = until
                upd["$set"]["violations"] = 0
            await db.users.update_one({"id": user["id"]}, upd)
            await db.moderation_log.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "conversation_id": req.conversation_id,
                                                "text": req.text, "violation_no": violations, "blocked": blocked, "created_at": now})
            if blocked:
                await notify(user["id"], "blocked", "Account blocked 🚫", f"Repeated attempts to share a phone number before a date. Blocked for {BLOCK_DAYS} days.", {"until": until}, email=True)
                raise HTTPException(403, f"BLOCKED:{until}")
            await notify(user["id"], "warning", "Warning ⚠️", f"Sharing phone numbers before a confirmed date is not allowed. Warning {violations}/{MAX_VIOLATIONS} — next violations lead to a block.", {"violations": violations})
            raise HTTPException(400, f"PHONE_BLOCKED:{violations}:{MAX_VIOLATIONS}")
    msg = {"id": str(uuid.uuid4()), "conversation_id": req.conversation_id, "from_id": user["id"], "text": req.text, "created_at": now, "type": "text"}
    await db.messages.insert_one(dict(msg))
    await db.conversations.update_one({"id": req.conversation_id}, {"$set": {"last_message": req.text, "last_at": now}})
    other_id = [u for u in conv["users"] if u != user["id"]][0]
    preview = (req.text[:60] + "…") if len(req.text) > 60 else req.text
    await notify(other_id, "message", f"New message from {user['name']} 💬", preview, {"conversation_id": req.conversation_id, "user_id": user["id"], "name": user["name"]}, email=True)
    return msg

# ---------- Gifts ----------
async def _find_gift(gid):
    return next((g for g in (await get_settings())["gifts"] if g["id"] == gid), None)

@api.post("/gifts/send")
async def send_gift(req: GiftReq, user=Depends(get_current_user)):
    if req.gift_id == "custom":
        icon = (req.custom_icon or "🎁").strip()[:4] or "🎁"
        if not req.custom_cost or req.custom_cost < CUSTOM_GIFT_MIN: raise HTTPException(400, f"Minimum {CUSTOM_GIFT_MIN} coins")
        gift = {"id": "custom", "name_key": "gift_custom", "icon": icon, "cost": int(req.custom_cost)}
    else:
        gift = await _find_gift(req.gift_id)
    if not gift: raise HTTPException(400, "Unknown gift")
    if (user.get("coins", 0) + user.get("withdrawable", 0)) < gift["cost"]: raise HTTPException(400, "Insufficient coins")
    target = await db.users.find_one({"id": req.target_id})
    if not target: raise HTTPException(404, "Recipient not found")
    # full value credited to recipient; 30% commission is withheld at withdrawal time
    net = gift["cost"]
    commission = round(gift["cost"] * (await get_settings())["commission"], 2)
    now = datetime.now(timezone.utc).isoformat()
    await spend_coins(user["id"], gift["cost"])
    await db.users.update_one({"id": req.target_id}, {"$inc": {"withdrawable": net}})
    tx = {"id": str(uuid.uuid4()), "type": "gift", "from_id": user["id"], "to_id": req.target_id,
          "gift_id": gift["id"], "gift_icon": gift["icon"], "cost": gift["cost"],
          "commission": commission, "net": net, "message": req.message, "created_at": now}
    await db.transactions.insert_one(tx)
    s = await get_settings()
    conv_id = req.conversation_id
    auto_matched = False
    if gift["cost"] >= s.get("gift_auto_match_coins", 100):
        conv_id, auto_matched = await ensure_match(user["id"], req.target_id, reason="gift")
    if not conv_id:
        m = await db.matches.find_one({"users": {"$all": [user["id"], req.target_id]}})
        conv_id = m["id"] if m else None
    if conv_id:
        conv = await db.conversations.find_one({"id": conv_id})
        if conv and user["id"] in conv.get("users", []) and req.target_id in conv.get("users", []):
            label = f"{gift['icon']} 🪙 {gift['cost']}"
            await db.messages.insert_one({"id": str(uuid.uuid4()), "conversation_id": conv_id, "from_id": user["id"],
                                          "text": (req.message or "").strip(), "type": "gift", "gift_icon": gift["icon"], "gift_cost": gift["cost"], "tx_id": tx["id"], "created_at": now})
            await db.conversations.update_one({"id": conv_id}, {"$set": {"last_message": label, "last_at": now}})
    await notify(req.target_id, "gift", f"{gift['icon']} Gift from {user['name']}",
                 f"{user['name']} sent you {gift['icon']} worth {gift['cost']} coins" + (f": “{req.message.strip()}”" if (req.message or "").strip() else ""),
                 {"from_id": user["id"], "name": user["name"], "gift_icon": gift["icon"], "cost": gift["cost"], "conversation_id": conv_id, "auto_matched": auto_matched}, email=True)
    if auto_matched:
        await notify(req.target_id, "match", "It's a match! 💘", f"{user['name']} sent you a gift — you're now matched. Say hello!", {"conversation_id": conv_id, "user_id": user["id"], "name": user["name"]}, email=True)
        await notify(user["id"], "match", "It's a match! 💘", f"Your gift to {target['name']} opened a chat. Say hello!", {"conversation_id": conv_id, "user_id": req.target_id, "name": target["name"]}, email=True)
    return {"ok": True, "commission": commission, "net_to_recipient": net, "conversation_id": conv_id, "auto_matched": auto_matched}

class GiftThanksReq(BaseModel):
    message_id: str
    reaction: Optional[str] = "❤️"

@api.post("/gifts/thanks")
async def gift_thanks(req: GiftThanksReq, user=Depends(get_current_user)):
    m = await db.messages.find_one({"id": req.message_id, "type": "gift"})
    if not m or m["from_id"] == user["id"]: raise HTTPException(404, "Gift message not found")
    conv = await db.conversations.find_one({"id": m["conversation_id"]})
    if not conv or user["id"] not in conv["users"]: raise HTTPException(403, "No access")
    if m.get("thanks"): return {"ok": True, "already": True}
    reaction = (req.reaction or "❤️").strip()[:4] or "❤️"
    now = datetime.now(timezone.utc).isoformat()
    await db.messages.update_one({"id": m["id"]}, {"$set": {"thanks": reaction, "thanks_at": now}})
    await db.messages.insert_one({"id": str(uuid.uuid4()), "conversation_id": m["conversation_id"], "from_id": user["id"], "text": f"Thank you {reaction}", "type": "thanks", "reaction": reaction, "gift_message_id": m["id"], "created_at": now})
    await db.conversations.update_one({"id": m["conversation_id"]}, {"$set": {"last_message": f"Thank you {reaction}", "last_at": now}})
    await notify(m["from_id"], "gift_thanks", f"{user['name']} said thanks {reaction}", f"{user['name']} thanked you for your gift {m.get('gift_icon','')}", {"conversation_id": m["conversation_id"], "user_id": user["id"]})
    return {"ok": True}

@api.get("/gifts/received")
async def gifts_received(user=Depends(get_current_user)):
    return await db.transactions.find({"to_id": user["id"], "type": "gift"}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api.get("/gifts/sent")
async def gifts_sent(user=Depends(get_current_user)):
    return await db.transactions.find({"from_id": user["id"], "type": "gift"}, {"_id": 0}).sort("created_at", -1).to_list(200)

# ---------- Video calls ----------
@api.post("/videocalls/start")
async def start_call(req: VideoCallReq, user=Depends(get_current_user)):
    target = await db.users.find_one({"id": req.target_id})
    if not target: raise HTTPException(404, "Recipient not found")
    rate = max(target.get("video_rate") or 0, (await get_settings())["video_rate"])
    cost = req.minutes * rate
    if (user.get("coins", 0) + user.get("withdrawable", 0)) < cost: raise HTTPException(400, "Insufficient coins")
    now = datetime.now(timezone.utc).isoformat()
    await spend_coins(user["id"], cost)
    net = cost
    await db.users.update_one({"id": req.target_id}, {"$inc": {"withdrawable": net}})
    call_id = str(uuid.uuid4())
    await db.transactions.insert_one({"id": call_id, "type": "videocall", "from_id": user["id"], "to_id": req.target_id, "minutes": req.minutes, "cost": cost, "rate": rate, "net": net, "created_at": now})
    return {"call_id": call_id, "cost": cost, "minutes": req.minutes, "rate": rate}

# ---------- Date bookings with escrow ----------
DATE_SLOT_HOURS = 3  # every date locks a 3-hour block on the chosen day

def _hm_to_min(s):
    try:
        h, m = str(s).split(":")[:2]; return int(h) * 60 + int(m)
    except Exception:
        return 0

def _min_to_hm(x):
    x = max(0, min(24 * 60, int(x))); return f"{x // 60:02d}:{x % 60:02d}"

def gen_slots(win):
    """Split an availability window into consecutive 3-hour slots.
    e.g. win 12:00-21:00 -> [12:00-15:00, 15:00-18:00, 18:00-21:00]."""
    win = win or {"from": "18:00", "to": "23:00"}
    start = _hm_to_min(win.get("from", "18:00"))
    end = _hm_to_min(win.get("to", "23:00"))
    step = DATE_SLOT_HOURS * 60
    slots = []
    s = start
    while s < end:
        e = min(s + step, end)
        slots.append({"from": _min_to_hm(s), "to": _min_to_hm(e)})
        s += step
    return slots

def _booking_start_min(b):
    if b.get("slot_from"):
        return _hm_to_min(b["slot_from"])
    if b.get("local_time"):
        return _hm_to_min(b["local_time"])
    try:
        return _hm_to_min(datetime.fromisoformat(b["scheduled_at"].replace("Z", "+00:00")).strftime("%H:%M"))
    except Exception:
        return 0

def _booking_end_min(b):
    if b.get("slot_to"):
        return _hm_to_min(b["slot_to"])
    return _booking_start_min(b) + DATE_SLOT_HOURS * 60

@api.post("/dates/book")
async def book_date(req: DateBookingReq, user=Depends(get_current_user)):
    min_coins = (await get_settings())["date_min_coins"]
    if req.coins < min_coins: raise HTTPException(400, f"Minimum {min_coins} coins")
    if (user.get("coins", 0) + user.get("withdrawable", 0)) < req.coins: raise HTTPException(400, "Insufficient coins")
    target = await db.users.find_one({"id": req.target_id})
    if not target: raise HTTPException(404, "Recipient not found")
    now = datetime.now(timezone.utc).isoformat()
    day = req.scheduled_at[:10]
    if target.get("availability") and day not in target["availability"]: raise HTTPException(400, "DAY_UNAVAILABLE")
    win = (target.get("availability_slots") or {}).get(day) or target.get("availability_time")
    # Determine the requested start time (HH:MM)
    try:
        local_t = datetime.fromisoformat(req.scheduled_at.replace("Z", "+00:00")).strftime("%H:%M") if req.local_time is None else req.local_time
    except Exception:
        local_t = req.local_time or "00:00"
    start_min = _hm_to_min(local_t)
    end_min = start_min + DATE_SLOT_HOURS * 60
    slot_from, slot_to = _min_to_hm(start_min), _min_to_hm(end_min)
    if win:
        # The chosen 3h block must fit inside the availability window
        if not (_hm_to_min(win["from"]) <= start_min and end_min <= _hm_to_min(win["to"])):
            raise HTTPException(400, f"TIME_UNAVAILABLE:{win['from']}-{win['to']}")
    # 3-hour slot conflict check (allow multiple non-overlapping dates on the same day)
    day_bookings = await db.date_bookings.find({"status": {"$in": ["escrow", "accepted", "confirmed"]},
                                                "scheduled_at": {"$regex": f"^{day}"},
                                                "$or": [{"to_id": req.target_id}, {"from_id": req.target_id}]}).to_list(200)
    for b in day_bookings:
        bs, be = _booking_start_min(b), _booking_end_min(b)
        if bs < end_min and start_min < be:  # overlap
            raise HTTPException(400, f"SLOT_BUSY:{_min_to_hm(bs)}-{_min_to_hm(be)}")
    booking_id = str(uuid.uuid4())
    doc = {"id": booking_id, "from_id": user["id"], "to_id": req.target_id,
           "venue": req.venue, "city": req.city, "address": (req.address or "").strip(), "postal_code": (req.postal_code or "").strip(), "country": (req.country or "").strip(), "lat": req.lat, "lng": req.lng, "scheduled_at": req.scheduled_at,
           "local_time": local_t, "slot_from": slot_from, "slot_to": slot_to,
           "coins": req.coins, "status": "escrow", "photo_url": None,
           "release_at": None, "created_at": now}
    await spend_coins(user["id"], req.coins)
    # hold in escrow of recipient
    await db.users.update_one({"id": req.target_id}, {"$inc": {"escrow": req.coins}})
    await db.date_bookings.insert_one(doc)
    await notify(req.target_id, "date_request", "New date request 📅", f"{user['name']} invited you to {req.venue}, {req.city} · 🪙 {req.coins}. Accept or decline in Dates.", {"booking_id": booking_id}, email=True)
    return {"booking_id": booking_id, "status": "escrow"}

@api.post("/dates/respond/{bid}")
async def respond_date(bid: str, accept: bool, user=Depends(get_current_user)):
    b = await db.date_bookings.find_one({"id": bid})
    if not b: raise HTTPException(404, "Not found")
    if b["to_id"] != user["id"]: raise HTTPException(403, "Only recipient can respond")
    if b["status"] != "escrow": raise HTTPException(400, "Cannot respond")
    now = datetime.now(timezone.utc).isoformat()
    if accept:
        await db.date_bookings.update_one({"id": bid}, {"$set": {"status": "accepted", "accepted_at": now}})
        await notify(b["from_id"], "date_accepted", "Date accepted 💃", f"{user['name']} accepted your date at {b['venue']}.", {"booking_id": bid}, email=True)
        return {"status": "accepted"}
    await db.users.update_one({"id": b["from_id"]}, {"$inc": {"coins": b["coins"]}})
    await db.users.update_one({"id": user["id"]}, {"$inc": {"escrow": -b["coins"]}})
    await db.date_bookings.update_one({"id": bid}, {"$set": {"status": "declined", "declined_at": now}})
    await notify(b["from_id"], "date_declined", "Date declined", f"{user['name']} declined your date at {b['venue']}. 🪙 {b['coins']} refunded.", {"booking_id": bid}, email=True)
    return {"status": "declined", "refunded": b["coins"]}

@api.get("/profiles/{pid}/availability")
async def profile_availability(pid: str, user=Depends(get_current_user)):
    p = await db.users.find_one({"id": pid}, {"_id": 0, "availability": 1, "availability_time": 1, "availability_slots": 1})
    if not p: raise HTTPException(404, "Not found")
    busy = await db.date_bookings.find({"status": {"$in": ["escrow", "accepted", "confirmed"]}, "$or": [{"to_id": pid}, {"from_id": pid}]},
                                       {"_id": 0, "scheduled_at": 1, "slot_from": 1, "slot_to": 1, "local_time": 1}).to_list(500)
    time_window = p.get("availability_time")
    day_slots = p.get("availability_slots") or {}
    # busy 3-hour blocks grouped by day
    busy_slots = {}
    for b in busy:
        d = b["scheduled_at"][:10]
        busy_slots.setdefault(d, []).append({"from": _min_to_hm(_booking_start_min(b)), "to": _min_to_hm(_booking_end_min(b))})
    # a day is fully booked only when every generated slot is taken
    fully_booked = []
    for d, taken in busy_slots.items():
        win = day_slots.get(d) or time_window
        all_slots = gen_slots(win)
        def _overlaps(s):
            sf, st = _hm_to_min(s["from"]), _hm_to_min(s["to"])
            return any(_hm_to_min(t["from"]) < st and sf < _hm_to_min(t["to"]) for t in taken)
        if all_slots and all(_overlaps(s) for s in all_slots):
            fully_booked.append(d)
    return {"available_days": p.get("availability") or [], "busy_days": sorted(fully_booked),
            "time_window": time_window, "slots": day_slots,
            "busy_slots": busy_slots, "slot_hours": DATE_SLOT_HOURS}

@api.get("/dates")
async def list_dates(user=Depends(get_current_user)):
    # trigger release for any past release_at
    now_dt = datetime.now(timezone.utc)
    to_release = await db.date_bookings.find({"to_id": user["id"], "status": "confirmed"}).to_list(200)
    for b in to_release:
        if b.get("release_at"):
            try: ra = datetime.fromisoformat(b["release_at"].replace("Z", "+00:00"))
            except Exception: continue
            if ra <= now_dt:
                coins = b["coins"]
                if b.get("photo_url"):
                    rec, cut = coins, 0
                else:
                    rec = int(round(coins * 0.5)); cut = coins - rec
                await db.users.update_one({"id": user["id"]}, {"$inc": {"escrow": -coins, "withdrawable": rec}})
                await db.date_bookings.update_one({"id": b["id"]}, {"$set": {"status": "released", "released_net": rec, "platform_cut": cut}})
                if cut:
                    await db.transactions.insert_one({"id": str(uuid.uuid4()), "type": "platform_fee_no_photo", "from_id": user["id"], "to_id": "platform", "cost": cut, "net": cut, "created_at": now_dt.isoformat()})
    outgoing = await db.date_bookings.find({"from_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    incoming = await db.date_bookings.find({"to_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"outgoing": outgoing, "incoming": incoming}

@api.post("/dates/confirm")
async def confirm_date(req: DateConfirmReq, user=Depends(get_current_user)):
    b = await db.date_bookings.find_one({"id": req.booking_id})
    if not b: raise HTTPException(404, "Not found")
    if b["to_id"] != user["id"]: raise HTTPException(403, "Only recipient can confirm")
    if b["status"] not in ("escrow", "accepted") and not (b["status"] == "confirmed" and b.get("auto_confirmed") and not b.get("photo_url")):
        raise HTTPException(400, "Cannot confirm")
    now_dt = datetime.now(timezone.utc)
    try: sched = datetime.fromisoformat(b["scheduled_at"].replace("Z", "+00:00"))
    except Exception: sched = now_dt
    if sched.tzinfo is None: sched = sched.replace(tzinfo=timezone.utc)
    if now_dt < sched: raise HTTPException(400, "DATE_NOT_YET")
    set_fields = {"photo_url": req.photo_url, "confirmed_at": datetime.now(timezone.utc).isoformat()}
    if b["status"] in ("escrow", "accepted"):
        set_fields["status"] = "confirmed"
        set_fields["release_at"] = max(sched + timedelta(days=1), now_dt).isoformat()
    await db.date_bookings.update_one({"id": req.booking_id}, {"$set": set_fields})
    return {"status": "confirmed", "release_at": set_fields.get("release_at", b.get("release_at"))}

@api.post("/dates/release-half/{bid}")
async def release_half(bid: str, user=Depends(get_current_user)):
    b = await db.date_bookings.find_one({"id": bid})
    if not b: raise HTTPException(404, "Not found")
    if b["to_id"] != user["id"]: raise HTTPException(403, "Only the recipient can claim")
    if b["status"] not in ("accepted", "confirmed"): raise HTTPException(400, "Cannot release")
    if b.get("photo_url"): raise HTTPException(400, "Already photo-confirmed")
    now_dt = datetime.now(timezone.utc)
    try: sched = datetime.fromisoformat(b["scheduled_at"].replace("Z", "+00:00"))
    except Exception: sched = now_dt
    if sched.tzinfo is None: sched = sched.replace(tzinfo=timezone.utc)
    if now_dt < sched + timedelta(hours=24): raise HTTPException(400, "CLAIM_NOT_YET")
    coins = b["coins"]
    rec = int(round(coins * 0.5)); cut = coins - rec
    await db.users.update_one({"id": user["id"]}, {"$inc": {"escrow": -coins, "withdrawable": rec}})
    await db.date_bookings.update_one({"id": bid}, {"$set": {"status": "released", "released_net": rec, "platform_cut": cut, "released_at": now_dt.isoformat()}})
    if cut:
        await db.transactions.insert_one({"id": str(uuid.uuid4()), "type": "platform_fee_no_photo", "from_id": user["id"], "to_id": "platform", "cost": cut, "net": cut, "created_at": now_dt.isoformat()})
    await notify(b["from_id"], "date_declined", "Date closed without photo", f"The date at {b['venue']} was closed without a photo. The recipient received 50% (🪙 {rec}); the platform kept 🪙 {cut}.", {"booking_id": bid})
    return {"status": "released", "recipient": rec, "platform_cut": cut}

@api.post("/dates/cancel/{bid}")
async def cancel_date(bid: str, user=Depends(get_current_user)):
    b = await db.date_bookings.find_one({"id": bid})
    if not b: raise HTTPException(404, "Not found")
    if user["id"] not in (b["from_id"], b["to_id"]): raise HTTPException(403, "No access")
    if b["status"] not in ("escrow", "accepted") and not (b["status"] == "confirmed" and b.get("auto_confirmed")):
        raise HTTPException(400, "Cannot cancel")
    now = datetime.now(timezone.utc).isoformat()
    taxi = b.get("taxi") or {}
    taxi_sent = taxi.get("status") == "sent"
    tcoins = int(taxi.get("coins", 0)) if taxi_sent else 0
    base = b["coins"] + tcoins
    taxi_set = {"taxi.status": "refunded"} if taxi_sent else {}
    if user["id"] == b["from_id"]:
        # inviter cannot cancel during the 24h window after the date has started
        try: sched = datetime.fromisoformat(b["scheduled_at"].replace("Z", "+00:00"))
        except Exception: sched = datetime.now(timezone.utc)
        if sched.tzinfo is None: sched = sched.replace(tzinfo=timezone.utc)
        now_dt = datetime.now(timezone.utc)
        if sched <= now_dt < sched + timedelta(hours=24): raise HTTPException(400, "CANCEL_LOCKED_24H")
        # inviter cancels -> 50% of (booking + taxi) back to inviter, the rest compensates the invited person
        pct = (await get_settings()).get("cancel_refund_pct", CANCEL_REFUND_PCT)
        refund = int(round(base * pct)); kept = base - refund
        await db.users.update_one({"id": b["from_id"]}, {"$inc": {"coins": refund}})
        await db.users.update_one({"id": b["to_id"]}, {"$inc": {"escrow": -b["coins"], "withdrawable": kept - tcoins}})
        await db.date_bookings.update_one({"id": bid}, {"$set": {"status": "cancelled", "refund": refund, "compensation": kept, "cancelled_at": now, "cancelled_by": "inviter", **taxi_set}})
        if kept:
            await db.transactions.insert_one({"id": str(uuid.uuid4()), "type": "date_cancel_fee", "from_id": b["from_id"], "to_id": b["to_id"], "cost": kept, "net": kept, "created_at": now})
        for uid in (b["from_id"], b["to_id"]):
            await notify(uid, "date_cancelled", "Date cancelled", f"The date at {b['venue']} was cancelled by the inviter. 50% (🪙 {refund}) refunded to the inviter; 🪙 {kept} kept by the invited person.", {"booking_id": bid}, email=True)
        return {"status": "cancelled", "refund": refund, "compensation": kept}
    # invited person cancels -> full refund to the inviter
    await db.users.update_one({"id": b["from_id"]}, {"$inc": {"coins": base}})
    await db.users.update_one({"id": b["to_id"]}, {"$inc": {"escrow": -b["coins"], "withdrawable": -tcoins}})
    await db.date_bookings.update_one({"id": bid}, {"$set": {"status": "cancelled", "refund": base, "compensation": 0, "cancelled_at": now, "cancelled_by": "invited", **taxi_set}})
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "type": "date_cancel_refund", "from_id": b["to_id"], "to_id": b["from_id"], "cost": base, "net": base, "created_at": now})
    for uid in (b["from_id"], b["to_id"]):
        await notify(uid, "date_cancelled", "Date cancelled", f"The date at {b['venue']} was cancelled by the invited person. All coins (🪙 {base}) were refunded to the inviter.", {"booking_id": bid}, email=True)
    return {"status": "cancelled", "refund": base, "compensation": 0}

# ---------- Taxi gift for a date ----------
class TaxiRequestReq(BaseModel):
    coins: int

@api.post("/dates/taxi/request/{bid}")
async def request_taxi(bid: str, req: TaxiRequestReq, user=Depends(get_current_user)):
    b = await db.date_bookings.find_one({"id": bid})
    if not b: raise HTTPException(404, "Not found")
    if b["to_id"] != user["id"]: raise HTTPException(403, "Only the invited person can request a taxi")
    if b["status"] not in ("escrow", "accepted", "confirmed"): raise HTTPException(400, "Cannot request taxi")
    if req.coins < 1: raise HTTPException(400, "Invalid amount")
    if (b.get("taxi") or {}).get("status") == "pending": raise HTTPException(400, "TAXI_PENDING")
    now = datetime.now(timezone.utc).isoformat()
    taxi = {"coins": int(req.coins), "status": "pending", "requested_at": now}
    await db.date_bookings.update_one({"id": bid}, {"$set": {"taxi": taxi}})
    await notify(b["from_id"], "date_taxi", "Taxi requested 🚕", f"{user['name']} asks for 🪙 {req.coins} for a taxi to your date at {b['venue']}. Send it in Dates.", {"booking_id": bid, "coins": req.coins}, email=True)
    return {"ok": True, "taxi": taxi}

@api.post("/dates/taxi/send/{bid}")
async def send_taxi(bid: str, user=Depends(get_current_user)):
    b = await db.date_bookings.find_one({"id": bid})
    if not b: raise HTTPException(404, "Not found")
    if b["from_id"] != user["id"]: raise HTTPException(403, "Only the booker can send a taxi")
    if b["status"] not in ("escrow", "accepted", "confirmed"): raise HTTPException(400, "Cannot send taxi")
    taxi = b.get("taxi")
    if not taxi or taxi.get("status") != "pending": raise HTTPException(400, "No pending taxi request")
    coins = int(taxi["coins"])
    if (user.get("coins", 0) + user.get("withdrawable", 0)) < coins: raise HTTPException(400, "Insufficient coins")
    now = datetime.now(timezone.utc).isoformat()
    commission = round(coins * (await get_settings())["commission"], 2)
    await spend_coins(user["id"], coins)
    await db.users.update_one({"id": b["to_id"]}, {"$inc": {"withdrawable": coins}})
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "type": "gift", "from_id": user["id"], "to_id": b["to_id"],
                                      "gift_id": "taxi", "gift_icon": "🚕", "cost": coins, "commission": commission, "net": coins, "message": "Taxi", "created_at": now})
    set_fields = {"taxi.status": "sent", "taxi.sent_at": now}
    auto_confirmed = False
    if b["status"] in ("escrow", "accepted"):
        try: sched = datetime.fromisoformat(b["scheduled_at"].replace("Z", "+00:00"))
        except Exception: sched = datetime.now(timezone.utc)
        if sched.tzinfo is None: sched = sched.replace(tzinfo=timezone.utc)
        release_at = max(sched + timedelta(days=1), datetime.now(timezone.utc)).isoformat()
        set_fields.update({"status": "confirmed", "confirmed_at": now, "release_at": release_at, "auto_confirmed": True})
        auto_confirmed = True
    await db.date_bookings.update_one({"id": bid}, {"$set": set_fields})
    recv_msg = f"{user['name']} sent you 🪙 {coins} for a taxi to your date at {b['venue']}."
    if auto_confirmed: recv_msg += " The date is now confirmed."
    await notify(b["to_id"], "date_taxi", "🚕 Taxi received", recv_msg, {"booking_id": bid, "coins": coins}, email=True)
    if auto_confirmed:
        await notify(user["id"], "date_taxi", "Date confirmed ✅", f"Your taxi auto-confirmed the date at {b['venue']}. If you cancel, all taxi + date coins are refunded to you.", {"booking_id": bid}, email=True)
    return {"ok": True, "coins": coins, "auto_confirmed": auto_confirmed}

@api.post("/dates/taxi/decline/{bid}")
async def decline_taxi(bid: str, user=Depends(get_current_user)):
    b = await db.date_bookings.find_one({"id": bid})
    if not b: raise HTTPException(404, "Not found")
    if b["from_id"] != user["id"]: raise HTTPException(403, "Only the booker can decline")
    taxi = b.get("taxi")
    if not taxi or taxi.get("status") != "pending": raise HTTPException(400, "No pending taxi request")
    now = datetime.now(timezone.utc).isoformat()
    await db.date_bookings.update_one({"id": bid}, {"$set": {"taxi.status": "declined", "taxi.declined_at": now}})
    await notify(b["to_id"], "date_taxi", "Taxi request declined", f"{user['name']} declined your taxi request for the date at {b['venue']}.", {"booking_id": bid})
    return {"ok": True}

# ---------- Share meeting location (host shares address when they host) ----------
class MeetLocationReq(BaseModel):
    address: str
    city: Optional[str] = ""
    postal_code: Optional[str] = ""
    country: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None

@api.post("/dates/meet-location/{bid}")
async def share_meet_location(bid: str, req: MeetLocationReq, user=Depends(get_current_user)):
    b = await db.date_bookings.find_one({"id": bid})
    if not b: raise HTTPException(404, "Not found")
    if b["to_id"] != user["id"]: raise HTTPException(403, "Only the host can share the meeting location")
    if b["status"] not in ("escrow", "accepted", "confirmed"): raise HTTPException(400, "Cannot share location")
    if not (req.address or "").strip(): raise HTTPException(400, "Address required")
    meet = {"address": req.address.strip(), "city": (req.city or "").strip(), "postal_code": (req.postal_code or "").strip(),
            "country": (req.country or "").strip(), "lat": req.lat, "lng": req.lng, "shared_at": datetime.now(timezone.utc).isoformat()}
    await db.date_bookings.update_one({"id": bid}, {"$set": {"meet": meet}})
    await notify(b["from_id"], "date_request", "📍 Meeting location shared", f"{user['name']} shared the meeting address for your VIP date. See it in Dates.", {"booking_id": bid}, email=True)
    return {"ok": True, "meet": meet}

# ---------- Wallet / Withdraw ----------
@api.get("/wallet")
async def wallet(user=Depends(get_current_user)):
    txs = await db.transactions.find({"$or": [{"from_id": user["id"]}, {"to_id": user["id"]}]}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    withdrawals = await db.withdrawals.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    acct = await db.payout_accounts.find_one({"user_id": user["id"]}, {"_id": 0})
    s = await get_settings()
    return {"coins": user["coins"], "escrow": user.get("escrow", 0), "withdrawable": user.get("withdrawable", 0),
            "transactions": txs, "withdrawals": withdrawals, "payout_account": acct, "withdraw_commission": s["commission"], "coins_per_usd": s["coins_per_usd"], "min_withdraw_usd": s["min_withdraw_usd"], "is_admin": is_admin(user)}

@api.get("/wallet/payout-account")
async def get_payout_account(user=Depends(get_current_user)):
    return await db.payout_accounts.find_one({"user_id": user["id"]}, {"_id": 0})

@api.post("/wallet/payout-account")
async def submit_payout_account(req: PayoutAccountReq, user=Depends(get_current_user)):
    iban = req.iban.replace(" ", "").upper()
    if len(iban) < 8: raise HTTPException(400, "Invalid account number")
    data = {k: (v.strip() if isinstance(v, str) else v) for k, v in req.model_dump().items()}
    required = [k for k in data if k not in ("routing_number", "document_path")]
    missing = [k for k in required if not data[k]]
    if missing: raise HTTPException(400, f"Missing: {', '.join(missing)}")
    if "@" not in data["recipient_email"]: raise HTTPException(400, "Invalid recipient email")
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "user_name": user["name"], "user_email": user["email"],
           **data, "iban": iban, "status": "pending", "reason": "",
           "submitted_at": datetime.now(timezone.utc).isoformat(), "verified_at": None}
    await db.payout_accounts.replace_one({"user_id": user["id"]}, doc, upsert=True)
    return {k: v for k, v in doc.items() if k != "_id"}

@api.post("/wallet/withdraw")
async def withdraw(req: WithdrawReq, user=Depends(get_current_user)):
    # withdrawable is in coins; coins_per_usd (default 10 coins = $1); commission withheld here
    if req.amount <= 0: raise HTTPException(400, "Invalid amount")
    if user.get("withdrawable", 0) < req.amount: raise HTTPException(400, "Insufficient withdrawable balance")
    acct = await db.payout_accounts.find_one({"user_id": user["id"]})
    if not acct or acct["status"] != "verified": raise HTTPException(400, "Bank account not verified")
    s = await get_settings()
    fee = round(req.amount * s["commission"], 2)
    net = round(req.amount - fee, 2)
    usd = round(net / s["coins_per_usd"], 2)
    if usd < s["min_withdraw_usd"]: raise HTTPException(400, f"MIN_WITHDRAW:{s['min_withdraw_usd']}")
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": user["id"]}, {"$inc": {"withdrawable": -req.amount}})
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "amount": req.amount, "fee": fee, "net": net, "usd": usd, "rate": s["coins_per_usd"],
           "method": "bank", "destination": f"{acct['bank_name']} ····{acct['iban'][-4:]}", "status": "pending", "created_at": now}
    await db.withdrawals.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

# ---------- Admin ----------
class GiftItem(BaseModel):
    id: str
    name_key: str
    icon: str
    cost: int

class CoinPackageItem(BaseModel):
    id: str
    coins: int
    amount: float
    bonus: int = 0
    name: str

class SettingsReq(BaseModel):
    gifts: List[GiftItem]
    coin_packages: List[CoinPackageItem]
    premium_amount: float
    video_rate: int
    date_min_coins: int
    referral_bonus: int
    commission: float
    free_daily_likes: int = FREE_DAILY_LIKES
    custom_coins_per_usd: int = CUSTOM_COINS_PER_USD
    custom_bonus_pct: float = CUSTOM_BONUS_PCT
    custom_min_usd: float = CUSTOM_MIN_USD
    coins_per_usd: int = COINS_PER_USD
    min_withdraw_usd: float = MIN_WITHDRAW_USD
    referral_package_id: Optional[str] = "popular"
    cancel_refund_pct: float = CANCEL_REFUND_PCT
    gift_auto_match_coins: int = 100

@api.get("/admin/settings")
async def admin_get_settings(admin=Depends(get_admin)):
    return await get_settings()

@api.put("/admin/settings")
async def admin_put_settings(req: SettingsReq, admin=Depends(get_admin)):
    if not (0 <= req.commission < 1): raise HTTPException(400, "Commission must be 0–0.99")
    if any(g.cost <= 0 for g in req.gifts) or any(p.amount <= 0 or p.coins <= 0 for p in req.coin_packages): raise HTTPException(400, "Values must be positive")
    doc = {"id": "pricing", **req.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["id"]}
    await db.settings.replace_one({"id": "pricing"}, doc, upsert=True)
    return await get_settings()

@api.get("/admin/payout-accounts")
async def admin_payout_accounts(status: str = "pending", admin=Depends(get_admin)):
    q = {} if status == "all" else {"status": status}
    return await db.payout_accounts.find(q, {"_id": 0}).sort("submitted_at", -1).to_list(200)

@api.post("/admin/payout-accounts/{user_id}/verify")
async def admin_verify_account(user_id: str, req: AdminVerifyReq, admin=Depends(get_admin)):
    acct = await db.payout_accounts.find_one({"user_id": user_id})
    if not acct: raise HTTPException(404, "Not found")
    status = "verified" if req.approve else "rejected"
    await db.payout_accounts.update_one({"user_id": user_id}, {"$set": {"status": status, "reason": req.reason or "", "verified_at": datetime.now(timezone.utc).isoformat(), "verified_by": admin["id"]}})
    await notify(user_id, "payout_account", "Bank account verified ✅" if req.approve else "Bank account rejected",
                 "You can now withdraw your earnings." if req.approve else (req.reason or "Please re-submit your bank details."), email=True)
    return {"status": status}

@api.get("/admin/withdrawals")
async def admin_withdrawals(admin=Depends(get_admin)):
    return await db.withdrawals.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api.post("/admin/withdrawals/{wid}/{action}")
async def admin_withdrawal_action(wid: str, action: str, admin=Depends(get_admin)):
    if action not in ("paid", "rejected"): raise HTTPException(400, "Bad action")
    w = await db.withdrawals.find_one({"id": wid})
    if not w or w["status"] != "pending": raise HTTPException(400, "Not pending")
    if action == "rejected":
        await db.users.update_one({"id": w["user_id"]}, {"$inc": {"withdrawable": w["amount"]}})
    await db.withdrawals.update_one({"id": wid}, {"$set": {"status": action, "processed_at": datetime.now(timezone.utc).isoformat()}})
    await notify(w["user_id"], "withdrawal", f"Withdrawal {action}", f"${w['usd']} → {w['destination']}", email=True)
    return {"status": action}

# ---------- Admin: support ----------
class SupportHoursRow(BaseModel):
    day: int
    enabled: bool = False
    open: str = "09:00"
    close: str = "18:00"

class SupportSettingsReq(BaseModel):
    agent_enabled: bool = True
    timezone: str = "UTC"
    hours: List[SupportHoursRow]
    offline_message: str
    welcome_message: str

@api.get("/admin/support/settings")
async def admin_get_support(admin=Depends(get_admin)):
    return await get_support_settings()

@api.put("/admin/support/settings")
async def admin_put_support(req: SupportSettingsReq, admin=Depends(get_admin)):
    try:
        ZoneInfo(req.timezone)
    except Exception:
        raise HTTPException(400, "INVALID_TIMEZONE")
    doc = {"id": "support", **req.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.settings.replace_one({"id": "support"}, doc, upsert=True)
    return await get_support_settings()

@api.get("/admin/support/tickets")
async def admin_support_tickets(status: str = "open", admin=Depends(get_admin)):
    q = {} if status == "all" else {"status": status}
    return await db.support_tickets.find(q, {"_id": 0}).sort("created_at", -1).to_list(300)

@api.post("/admin/support/tickets/{tid}/resolve")
async def admin_resolve_ticket(tid: str, admin=Depends(get_admin)):
    r = await db.support_tickets.find_one({"id": tid})
    if not r:
        raise HTTPException(404, "Not found")
    await db.support_tickets.update_one({"id": tid}, {"$set": {"status": "resolved",
                                        "resolved_at": datetime.now(timezone.utc).isoformat(), "resolved_by": admin["id"]}})
    return {"status": "resolved"}


# ---------- Stripe checkout ----------
class VipProfileReq(BaseModel):
    services: List[str] = []
    price_hour: int = 0
    price_2h: int = 0
    price_3h: int = 0
    price_night: int = 0
    places: List[str] = []
    client_wants: str = ""
    availability: List[dict] = []
    published: bool = True
    nickname: str = ""
    post_mode: str = "together"  # "together" = attached to main profile | "separate" = standalone under nickname
    # Independent anonymous details used when the VIP profile is posted "separately"
    age: Optional[int] = None
    city: str = ""
    country: str = ""
    gender: str = ""
    bio: str = ""
    show_on_main: bool = True  # when "separate", whether to also show a VIP hint on the main profile

@api.get("/vip/catalog")
async def vip_catalog(user=Depends(get_current_user)):
    return {"services": VIP_SERVICES, "places": VIP_PLACES}

@api.put("/vip/profile")
async def put_vip_profile(req: VipProfileReq, user=Depends(get_current_user)):
    # Anyone can fill in and save their VIP profile; publishing it requires an active VIP subscription
    can_publish = is_vip(user)
    services = [s for s in req.services if s in VIP_SERVICE_SET][:80]
    places = [p for p in req.places if p in VIP_PLACES]
    slots = []
    for a in (req.availability or [])[:300]:
        d = str(a.get("date", ""))[:10]; f = str(a.get("from", "")); tt = str(a.get("to", ""))
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", d) and re.fullmatch(r"\d{2}:\d{2}", f) and re.fullmatch(r"\d{2}:\d{2}", tt) and f < tt:
            slots.append({"date": d, "from": f, "to": tt})
    slots.sort(key=lambda x: (x["date"], x["from"]))
    post_mode = req.post_mode if req.post_mode in ("together", "separate") else "together"
    _age = None
    if req.age:
        try: _age = max(18, min(99, int(req.age)))
        except Exception: _age = None
    vip = {"services": services,
           "prices": {"hour": max(0, req.price_hour), "h2": max(0, req.price_2h), "h3": max(0, req.price_3h), "night": max(0, req.price_night)},
           "places": places, "client_wants": (req.client_wants or "").strip()[:1000],
           "nickname": (req.nickname or "").strip()[:40], "post_mode": post_mode,
           "age": _age, "city": (req.city or "").strip()[:80], "country": (req.country or "").strip()[:80],
           "gender": req.gender if req.gender in ("female", "male", "trans_woman", "trans_man", "non_binary") else "",
           "bio": (req.bio or "").strip()[:1000], "show_on_main": bool(req.show_on_main),
           "availability": slots, "published": bool(req.published) and can_publish, "updated_at": datetime.now(timezone.utc).isoformat()}
    # preserve previously uploaded photos (managed by separate photo endpoints)
    existing = await db.users.find_one({"id": user["id"]}, {"_id": 0, "vip.photos": 1, "vip.private_photos": 1, "vip.public_id": 1})
    if existing and existing.get("vip", {}).get("photos"):
        vip["photos"] = existing["vip"]["photos"]
    if existing and existing.get("vip", {}).get("private_photos"):
        vip["private_photos"] = existing["vip"]["private_photos"]
    # stable public identifier for the standalone (separate) VIP listing — never reveals the real user id
    vip["public_id"] = (existing or {}).get("vip", {}).get("public_id") or ("v" + secrets.token_hex(8))
    await db.users.update_one({"id": user["id"]}, {"$set": {"vip": vip}})
    return {"saved": True, "vip": vip, "can_publish": can_publish}

@api.get("/vip/profile/{uid}")
async def get_vip_profile(uid: str, preview: Optional[str] = None, user=Depends(get_current_user)):
    proj = {"_id": 0, "id": 1, "name": 1, "city": 1, "country": 1, "age": 1, "gender": 1, "vip": 1}
    owner = await db.users.find_one({"id": uid}, proj)
    accessed_by_uid = bool(owner)
    if not owner:
        owner = await db.users.find_one({"vip.public_id": uid}, proj)
    if not owner or not owner.get("vip"):
        raise HTTPException(404, "No VIP profile")
    vip = owner["vip"]
    real_owner = owner["id"] == user["id"]
    # "preview=nonvip" lets the owner see exactly what a non-VIP / non-premium visitor sees
    force_guest = preview == "nonvip"
    is_owner = real_owner and not force_guest
    eff_premium = is_premium(user) and not force_guest
    separate = vip.get("post_mode") == "separate"
    # Unpublished VIP profiles are only visible to their owner
    if vip.get("published") is False and not is_owner:
        raise HTTPException(404, "No VIP profile")
    # A separate listing accessed via the real user id (from the main profile page) is only
    # shown when the owner chose to reveal a VIP hint on their main profile
    if separate and accessed_by_uid and not is_owner and not vip.get("show_on_main", True):
        raise HTTPException(404, "No VIP profile")
    # Display identity: separate listings show the nickname + independent details, never the real name
    if separate:
        display_name = (vip.get("nickname") or "").strip() or "VIP"
        display_city = vip.get("city") or owner.get("city")
        display_country = vip.get("country") or owner.get("country")
        display_age = vip.get("age") or owner.get("age")
        display_gender = vip.get("gender") or owner.get("gender")
    else:
        display_name = owner.get("name")
        display_city = owner.get("city")
        display_country = owner.get("country")
        display_age = owner.get("age")
        display_gender = owner.get("gender")
    # target used for booking: public_id for separate listings so the real id stays hidden
    target_id = vip.get("public_id") if (separate and not is_owner) else owner["id"]
    if is_owner or eff_premium:
        return {"locked": False, "user_id": target_id, "name": display_name,
                "real_name": (None if (separate and not is_owner) else owner.get("name")),
                "nickname": vip.get("nickname") or "", "post_mode": vip.get("post_mode") or "together",
                "separate": separate, "show_on_main": vip.get("show_on_main", True),
                "city": display_city, "country": display_country, "age": display_age, "gender": display_gender,
                "vip": vip, "is_owner": is_owner}
    _p = vip.get("photos") or []
    return {"locked": True, "teaser_photo": _p[0] if _p else None, "name": display_name if separate else None,
            "post_mode": vip.get("post_mode") or "together", "separate": separate,
            "city": display_city if separate else None, "age": display_age if separate else None,
            "services_count": len(vip.get("services") or [])}

@api.post("/vip/book")
async def vip_book(req: DateBookingReq, user=Depends(get_current_user)):
    if req.coins <= 0:
        raise HTTPException(400, "Invalid amount")
    if (user.get("coins", 0) + user.get("withdrawable", 0)) < req.coins:
        raise HTTPException(400, "Insufficient coins")
    target = await db.users.find_one({"id": req.target_id})
    if not target:
        target = await db.users.find_one({"vip.public_id": req.target_id})
    if not target:
        raise HTTPException(404, "Recipient not found")
    recipient_id = target["id"]
    if recipient_id == user["id"]:
        raise HTTPException(400, "CANNOT_BOOK_SELF")
    now = datetime.now(timezone.utc).isoformat()
    bid = str(uuid.uuid4())
    doc = {"id": bid, "from_id": user["id"], "to_id": recipient_id, "venue": req.venue or "VIP", "city": req.city or "-",
           "address": (req.address or "").strip(), "postal_code": (req.postal_code or "").strip(), "country": (req.country or "").strip(),
           "lat": req.lat, "lng": req.lng, "place": req.place, "scheduled_at": req.scheduled_at,
           "coins": req.coins, "status": "escrow", "photo_url": None, "release_at": None, "vip": True, "created_at": now}
    await spend_coins(user["id"], req.coins)
    await db.users.update_one({"id": recipient_id}, {"$inc": {"escrow": req.coins}})
    await db.date_bookings.insert_one(doc)
    await notify(recipient_id, "date_request", "New VIP booking 📅", f"{user['name']} booked you · 🪙 {req.coins}. Manage in Dates.", {"booking_id": bid}, email=True)
    return {"booking_id": bid, "status": "escrow"}

class CoinPremiumReq(BaseModel):
    tier: str = "premium"

class GiftPremiumReq(BaseModel):
    target_id: str
    tier: str = "premium"

@api.get("/premium/coin-prices")
async def premium_coin_prices(user=Depends(get_current_user)):
    return {"premium": PREMIUM_COINS, "vip": VIP_COINS, "premium_lite": PREMIUM_LITE_COINS}

@api.post("/premium/buy-with-coins")
async def buy_premium_coins(req: CoinPremiumReq, user=Depends(get_current_user)):
    tier = req.tier if req.tier in ("premium", "vip", "premium_lite") else "premium"
    cost = VIP_COINS if tier == "vip" else (PREMIUM_LITE_COINS if tier == "premium_lite" else PREMIUM_COINS)
    await spend_coins(user["id"], cost)
    u = await db.users.find_one({"id": user["id"]})
    if tier == "premium_lite":
        upd = {"premium_lite_until": extend_until(u.get("premium_lite_until"))}
    else:
        upd = {"premium_until": extend_until(u.get("premium_until"))}
        if tier == "vip":
            upd["vip_until"] = extend_until(u.get("vip_until"))
    await db.users.update_one({"id": user["id"]}, {"$set": upd})
    return {"ok": True, "tier": tier, **upd}

@api.post("/premium/gift")
async def gift_premium(req: GiftPremiumReq, user=Depends(get_current_user)):
    if req.target_id == user["id"]:
        raise HTTPException(400, "CANNOT_GIFT_SELF")
    tier = req.tier if req.tier in ("premium", "vip", "premium_lite") else "premium"
    cost = VIP_COINS if tier == "vip" else (PREMIUM_LITE_COINS if tier == "premium_lite" else PREMIUM_COINS)
    target = await db.users.find_one({"id": req.target_id}, {"_id": 0, "id": 1, "name": 1, "premium_until": 1, "vip_until": 1, "premium_lite_until": 1})
    if not target:
        raise HTTPException(404, "Recipient not found")
    await spend_coins(user["id"], cost)
    if tier == "premium_lite":
        upd = {"premium_lite_until": extend_until(target.get("premium_lite_until"))}
        label = "Premium Lite"
    else:
        upd = {"premium_until": extend_until(target.get("premium_until"))}
        if tier == "vip":
            upd["vip_until"] = extend_until(target.get("vip_until"))
        label = "VIP Premium" if tier == "vip" else "Premium"
    await db.users.update_one({"id": req.target_id}, {"$set": upd})
    await notify(req.target_id, "premium_gift", f"You received {label}! 👑", f"{user['name']} gifted you 30 days of {label}.", {}, email=True)
    return {"ok": True, "tier": tier}

@api.post("/vip/photo")
async def vip_add_photo(photo: UploadFile = File(...), private: bool = False, user=Depends(get_current_user)):
    # Uploading photos is part of filling in the VIP profile; publishing still requires a subscription
    field = "private_photos" if private else "photos"
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "vip": 1})
    vip = u.get("vip") or {}
    photos = vip.get(field) or []
    if len(photos) >= 12:
        raise HTTPException(400, "MAX_PHOTOS")
    data = await photo.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(400, "TOO_LARGE")
    ct = photo.content_type or "image/jpeg"
    if not ct.startswith("image/"):
        raise HTTPException(400, "NOT_IMAGE")
    ext = (photo.filename.split(".")[-1] if photo.filename and "." in photo.filename else "jpg").lower()
    path = f"{APP_NAME}/vipphotos/{user['id']}/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, ct)
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": result["path"], "user_id": user["id"],
                               "content_type": ct, "size": result["size"], "is_deleted": False, "private": False,
                               "created_at": datetime.now(timezone.utc).isoformat()})
    photos.append(result["path"])
    vip[field] = photos
    await db.users.update_one({"id": user["id"]}, {"$set": {"vip": vip}})
    return {"photos": vip.get("photos") or [], "private_photos": vip.get("private_photos") or []}

@api.delete("/vip/photo")
async def vip_del_photo(path: str, private: bool = False, user=Depends(get_current_user)):
    field = "private_photos" if private else "photos"
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "vip": 1})
    vip = u.get("vip") or {}
    photos = [p for p in (vip.get(field) or []) if p != path]
    vip[field] = photos
    await db.users.update_one({"id": user["id"]}, {"$set": {"vip": vip}})
    await db.files.update_one({"storage_path": path}, {"$set": {"is_deleted": True}})
    return {"photos": vip.get("photos") or [], "private_photos": vip.get("private_photos") or []}

class VipPhotoOrderReq(BaseModel):
    photos: List[str]

@api.post("/vip/photos/reorder")
async def vip_reorder_photos(req: VipPhotoOrderReq, user=Depends(get_current_user)):
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "vip": 1})
    vip = u.get("vip") or {}
    cur = set(vip.get("photos") or [])
    new = [p for p in req.photos if p in cur]
    if set(new) != cur:
        raise HTTPException(400, "MISMATCH")
    vip["photos"] = new
    await db.users.update_one({"id": user["id"]}, {"$set": {"vip": vip}})
    return {"photos": new}

# ---------- Stripe checkout ----------
class AutoRenewReq(BaseModel):
    enabled: bool

@api.post("/premium/auto-renew")
async def set_auto_renew(req: AutoRenewReq, user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"premium_auto_renew": req.enabled}})
    return {"premium_auto_renew": req.enabled}

@api.delete("/account")
async def delete_account(user=Depends(get_current_user)):
    uid = user["id"]
    await db.likes.delete_many({"$or": [{"from_id": uid}, {"to_id": uid}]})
    await db.matches.delete_many({"$or": [{"a_id": uid}, {"b_id": uid}, {"users": uid}]})
    await db.notifications.delete_many({"user_id": uid})
    await db.conversations.delete_many({"participants": uid})
    await db.messages.delete_many({"$or": [{"from_id": uid}, {"to_id": uid}]})
    await db.spins.delete_many({"used_by": uid})
    await db.payout_accounts.delete_many({"user_id": uid})
    await db.users.delete_one({"id": uid})
    return {"deleted": True}

@api.post("/payments/checkout")
async def create_checkout(req: CheckoutReq, user=Depends(get_current_user)):
    s = await get_settings()
    if req.package_id == "premium_monthly":
        pkg_name = PREMIUM_PACKAGE["name"]; amount = int(round(s["premium_amount"] * 100)); mode = "payment"
        metadata = {"user_id": user["id"], "package_id": "premium_monthly", "type": "premium"}
    elif req.package_id == "premium_lite_monthly":
        pkg_name = PREMIUM_LITE_PACKAGE["name"]; amount = int(round(PREMIUM_LITE_PACKAGE["amount"] * 100)); mode = "payment"
        metadata = {"user_id": user["id"], "package_id": "premium_lite_monthly", "type": "premium_lite"}
    elif req.package_id == "vip_monthly":
        pkg_name = VIP_PACKAGE["name"]; amount = int(round(VIP_PACKAGE["amount"] * 100)); mode = "payment"
        metadata = {"user_id": user["id"], "package_id": "vip_monthly", "type": "vip"}
    elif req.package_id == "custom":
        usd = round(float(req.usd_amount or 0), 2)
        if usd < s["custom_min_usd"]: raise HTTPException(400, f"Minimum ${s['custom_min_usd']}")
        base = int(usd * s["custom_coins_per_usd"])
        bonus = int(base * s["custom_bonus_pct"] / 100)
        pkg_name = f"Custom {base} coins (+{bonus} bonus)"; amount = int(round(usd * 100)); mode = "payment"
        metadata = {"user_id": user["id"], "package_id": "custom", "type": "coins", "coins": str(base + bonus)}
    else:
        pkg = next((p for p in s["coin_packages"] if p["id"] == req.package_id), None)
        if not pkg: raise HTTPException(400, "Unknown package")
        pkg_name = pkg["name"]; amount = int(round(pkg["amount"] * 100)); mode = "payment"
        metadata = {"user_id": user["id"], "package_id": req.package_id, "type": "coins", "coins": str(pkg["coins"] + pkg["bonus"])}
    try:
        session = stripe.checkout.Session.create(
            line_items=[{"price_data": {"currency": "usd", "product_data": {"name": pkg_name}, "unit_amount": amount}, "quantity": 1}],
            mode=mode,
            # Omitting payment_method_types lets Stripe show every method enabled in the Dashboard for the buyer's country:
            # all major cards worldwide, Apple Pay / Google Pay, Link, PayPal, Klarna, iDEAL, SEPA, Alipay, WeChat Pay, etc.
            billing_address_collection="auto",
            customer_email=user.get("email"),
            locale="auto",
            success_url=f"{req.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{req.origin_url}/payment/cancel",
            metadata=metadata,
        )
    except stripe.error.StripeError as e:
        raise HTTPException(500, f"Stripe error: {e.user_message or str(e)}")
    await db.payment_transactions.insert_one({
        "session_id": session.id, "user_id": user["id"], "package_id": req.package_id,
        "amount": amount / 100, "currency": "usd", "status": "initiated",
        "payment_status": "pending", "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.id}

async def _fulfill(session_id: str, meta: dict):
    """Idempotent — grants coins/premium once."""
    rec = await db.payment_transactions.find_one({"session_id": session_id})
    if not rec or rec.get("fulfilled"):
        return
    user_id = meta.get("user_id") or rec.get("user_id")
    if meta.get("type") == "coins":
        coins = int(meta.get("coins", 0))
        await db.users.update_one({"id": user_id}, {"$inc": {"coins": coins}})
        req_pkg = (await get_settings()).get("referral_package_id")
        if not req_pkg or meta.get("package_id") == req_pkg:
            await _reward_referrer(user_id)
    elif meta.get("type") == "premium":
        u = await db.users.find_one({"id": user_id})
        start = datetime.now(timezone.utc)
        cur = u.get("premium_until")
        if cur:
            try:
                cur_dt = datetime.fromisoformat(cur.replace("Z", "+00:00"))
                if cur_dt > start: start = cur_dt
            except Exception: pass
        new_until = (start + timedelta(days=30)).isoformat()
        await db.users.update_one({"id": user_id}, {"$set": {"premium_until": new_until, "premium_auto_renew": True}})
    elif meta.get("type") == "premium_lite":
        u = await db.users.find_one({"id": user_id})
        await db.users.update_one({"id": user_id}, {"$set": {"premium_lite_until": extend_until(u.get("premium_lite_until"))}})
    elif meta.get("type") == "vip":
        u = await db.users.find_one({"id": user_id})
        def _ext(cur):
            s0 = datetime.now(timezone.utc)
            if cur:
                try:
                    c = datetime.fromisoformat(cur.replace("Z", "+00:00"))
                    if c > s0: s0 = c
                except Exception: pass
            return (s0 + timedelta(days=30)).isoformat()
        await db.users.update_one({"id": user_id}, {"$set": {
            "premium_until": _ext(u.get("premium_until")), "vip_until": _ext(u.get("vip_until")), "premium_auto_renew": True}})
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"fulfilled": True}})

@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    rec = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not rec: raise HTTPException(404, "Transaction not found")
    if rec.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid",
                              "updated_at": datetime.now(timezone.utc).isoformat()}},
                )
                await _fulfill(session_id, rec.get("metadata") or {})
                rec = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except stripe.error.StripeError:
            pass
    return {"session_id": rec["session_id"], "status": rec["status"], "payment_status": rec["payment_status"]}

@api.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(400, "Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed":
        await db.payment_transactions.update_one(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "completed", "payment_status": obj.get("payment_status", "paid"),
                      "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        await _fulfill(obj["id"], obj.get("metadata") or {})
    return {"status": "ok"}

# ---------- Health ----------
@api.get("/")
async def root():
    return {"service": "GiftsDates", "ok": True}

# ==================== Invite-on-a-Date (v2 state machine) ====================
PUBLIC_APP_URL = os.environ.get("PUBLIC_APP_URL", "")
WEBHOOK_CRON_SECRET = os.environ.get("WEBHOOK_CRON_SECRET", "")
SUPPORT_EMAIL = os.environ.get("SUPPORT_EMAIL", "support@giftsdates.com")
ADMIN_EMAIL_LIST = [e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()]
DATE_WINDOW_HOURS = 3
INVITE_MIN_COINS = 150
DATES_LINK = f"{PUBLIC_APP_URL}/dates"

def _email_cta_html(title, body, link, cta="View on GiftsDates"):
    base = _email_html(title, body)
    if not link:
        return base
    btn = (f'<div style="text-align:center;margin:6px 0 2px"><a href="{link}" style="display:inline-block;'
           f'background:#e11d48;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;'
           f'font-weight:700;font-family:Arial">{cta} &rarr;</a></div>')
    return base.replace('<div style="font-size:11px;color:#8a8598', btn + '<div style="font-size:11px;color:#8a8598')

def _now(): return datetime.now(timezone.utc)
def _iso(dt=None): return (dt or _now()).isoformat()
def _pdt(s):
    try: return datetime.fromisoformat((s or "").replace("Z", "+00:00"))
    except Exception: return None

async def _admin_ids():
    return [u["id"] async for u in db.users.find({"email": {"$in": ADMIN_EMAIL_LIST}}, {"id": 1})]

async def _log_status(did, status, by):
    await db.dates.update_one({"id": did}, {"$set": {"status": status, "updated_at": _iso()},
                                            "$push": {"status_log": {"status": status, "at": _iso(), "by": by}}})

async def _mini(uid):
    u = await db.users.find_one({"id": uid}, {"_id": 0, "id": 1, "name": 1, "photos": 1, "age": 1, "city": 1, "country": 1})
    if not u: return None
    ph = u.get("photos") or []
    return {"id": u["id"], "name": u.get("name"), "age": u.get("age"), "city": u.get("city"),
            "country": u.get("country"), "photo": ph[0] if ph else None}

BUSY_STATUSES = ["DATE_CONFIRMED", "DATE_COMPLETED_PENDING_VERIFICATION", "PHOTO_VERIFICATION_PENDING"]

async def _conflict(uid, start, end, exclude):
    docs = await db.dates.find({"status": {"$in": BUSY_STATUSES}, "id": {"$ne": exclude},
                                "$or": [{"inviter_id": uid}, {"recipient_id": uid}]}, {"_id": 0, "location": 1}).to_list(300)
    for x in docs:
        loc = x.get("location") or {}
        s, e = _pdt(loc.get("scheduled_start")), _pdt(loc.get("scheduled_end"))
        if s and e and start < e and s < end:
            return True
    return False

async def _complete(d, status):
    hold = int(d.get("total_hold", 0) or 0)
    if hold > 0 and not d.get("paid_out"):
        await db.users.update_one({"id": d["recipient_id"]}, {"$inc": {"withdrawable": hold}})
        await record_txn(d["recipient_id"], "DATE_COMPLETION", hold, d["id"], "Date completed — coins released")
    await db.dates.update_one({"id": d["id"]}, {"$set": {"paid_out": True}})
    await _log_status(d["id"], status, "system")

async def _refund(d, mode, status):
    hold = int(d.get("total_hold", 0) or 0)
    inv, rec = d["inviter_id"], d["recipient_id"]
    if hold > 0 and not d.get("refunded"):
        if mode == "full_inviter":
            await db.users.update_one({"id": inv}, {"$inc": {"coins": hold}})
            await record_txn(inv, "DATE_REFUND", hold, d["id"], "Full refund (recipient cancelled)")
        else:  # 50/25/25
            r_inv, r_rec = hold // 2, hold // 4
            fee = hold - r_inv - r_rec
            await db.users.update_one({"id": inv}, {"$inc": {"coins": r_inv}})
            await record_txn(inv, "DATE_REFUND", r_inv, d["id"], "50% refund")
            await db.users.update_one({"id": rec}, {"$inc": {"withdrawable": r_rec}})
            await record_txn(rec, "RECIPIENT_COMPENSATION", r_rec, d["id"], "25% inconvenience compensation")
            await record_txn("PLATFORM", "PLATFORM_FEE", fee, d["id"], "25% platform fee")
    await db.dates.update_one({"id": d["id"]}, {"$set": {"refunded": True}})

_NEXT = {
    "INVITATION_SENT": ("Invitation sent", "Waiting for {o} to choose a date option.", "Choose one of the proposed date options."),
    "DATE_ACTIVITY_SELECTED": ("Date option chosen", "Propose a meeting location, date and time.", "Waiting for {o} to propose the location."),
    "LOCATION_PROPOSED": ("Location proposed", "Waiting for {o} to confirm the location or request a taxi.", "Confirm the location, or request a taxi."),
    "TAXI_REQUESTED": ("Taxi requested", "Confirm & pay the taxi, or offer a pickup instead.", "Waiting for {o}'s transportation decision."),
    "PICKUP_ADDRESS_PENDING": ("Pickup offered", "Waiting for {o} to share a pickup address.", "Share your pickup address."),
    "PICKUP_ADDRESS_SELECTED": ("Pickup address shared", "Confirm pickup, or pay the taxi instead.", "Waiting for {o} to confirm the pickup."),
    "DATE_CONFIRMED": ("Date confirmed", "Your date is confirmed — see the details below.", "Your date is confirmed — see the details below."),
    "DATE_COMPLETED_PENDING_VERIFICATION": ("Date finished", "Submit a photo (24h after start) or it auto-completes after 72h.", "Submit a photo (24h after start) or it auto-completes after 72h."),
    "PHOTO_VERIFICATION_PENDING": ("Verification submitted", "Waiting for admin review.", "Waiting for admin review."),
    "COMPLETED": ("Completed", "This date is completed.", "This date is completed."),
    "COMPLETED_AUTO": ("Completed", "Auto-completed after 72h.", "Auto-completed after 72h."),
    "CANCELLED": ("Cancelled", "This date was cancelled.", "This date was cancelled."),
    "CANCELLED_TRANSPORTATION": ("Cancelled", "Cancelled over transportation.", "Cancelled over transportation."),
    "REPORTED": ("Reported", "Under review by our team.", "Under review by our team."),
    "UNDER_ADMIN_REVIEW": ("Under review", "Our team is reviewing this date.", "Our team is reviewing this date."),
    "REFUNDED": ("Refunded", "This date was refunded.", "This date was refunded."),
}

def _serialize(d, viewer_id, other_mini):
    inv = d["inviter_id"] == viewer_id
    label, inv_step, rec_step = _NEXT.get(d["status"], (d["status"], "", ""))
    step = (inv_step if inv else rec_step).replace("{o}", (other_mini or {}).get("name") or "the other person")
    loc = d.get("location") or {}
    start = _pdt(loc.get("scheduled_start"))
    windows = {}
    if start:
        windows = {"lock_at": _iso(start - timedelta(minutes=30)), "report_open": _iso(start),
                   "report_close": _iso(start + timedelta(hours=DATE_WINDOW_HOURS)), "verify_at": _iso(start + timedelta(hours=24)),
                   "auto_complete_at": _iso(start + timedelta(hours=72))}
    trans = dict(d.get("transportation") or {})
    if not inv:  # hide pickup address from inviter? pickup is recipient's; recipient sees it, inviter sees only after selected. keep as-is
        pass
    return {"id": d["id"], "role": "inviter" if inv else "recipient", "status": d["status"], "status_label": label,
            "next_step": step, "other": other_mini, "options": d.get("options"), "chosen_idea": d.get("chosen_idea"),
            "coins": d.get("coins"), "total_hold": d.get("total_hold"), "gift": d.get("gift"),
            "location": loc, "transportation": trans, "report": bool(d.get("report")),
            "verification": (d.get("verification") or {}).get("status"), "windows": windows,
            "server_now": _iso(), "created_at": d.get("created_at")}

class InviteCreateReq(BaseModel):
    recipient_id: str
    idea_ids: list[str]
    coins: int
    gift_id: Optional[str] = None
    safety_ack: bool = False
class ChooseIdeaReq(BaseModel):
    idea_id: str
class InviteLocationReq(BaseModel):
    venue: str
    address: Optional[str] = ""
    city: Optional[str] = ""
    meeting_point: Optional[str] = ""
    country: Optional[str] = ""
    postal_code: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    scheduled_start: str
class InviteTaxiReq(BaseModel):
    amount: int
class PickupAddrReq(BaseModel):
    pickup_address: str
class InviteReportReq(BaseModel):
    reasons: list[str] = []
    details: str
    evidence: Optional[str] = None
class DateMsgReq(BaseModel):
    text: str

@api.post("/invites")
async def create_invite(req: InviteCreateReq, user=Depends(get_current_user)):
    if req.recipient_id == user["id"]: raise HTTPException(400, "Cannot invite yourself")
    if not req.safety_ack: raise HTTPException(400, "SAFETY_ACK_REQUIRED")
    rec = await db.users.find_one({"id": req.recipient_id}, {"_id": 0, "id": 1, "name": 1, "date_price": 1})
    if not rec: raise HTTPException(404, "Recipient not found")
    ids = list(dict.fromkeys([i for i in req.idea_ids if i]))
    if not 1 <= len(ids) <= 3: raise HTTPException(400, "Select 1 to 3 date ideas")
    ideas = await db.date_ideas.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(10)
    if len(ideas) != len(ids): raise HTTPException(400, "Invalid date idea")
    floor = max(INVITE_MIN_COINS, int(rec.get("date_price") or 0))
    if req.coins < floor: raise HTTPException(400, f"MIN_COINS:{floor}")
    if ((user.get("coins") or 0) + (user.get("withdrawable") or 0)) < req.coins: raise HTTPException(400, "Insufficient coins")
    idea_by = {i["id"]: i["name"] for i in ideas}
    options = [{"idea_id": i, "name": idea_by[i], "order": n + 1} for n, i in enumerate(ids)]
    await spend_coins(user["id"], req.coins)
    await record_txn(user["id"], "DATE_PAYMENT", -req.coins, None, "Date invitation escrow")
    gift = None
    if req.gift_id:
        g = next((x for x in (await get_settings())["gifts"] if x["id"] == req.gift_id), None)
        if g and ((user.get("coins") or 0) + (user.get("withdrawable") or 0)) >= g["cost"]:
            await spend_coins(user["id"], g["cost"])
            await record_txn(user["id"], "DATE_PAYMENT", -g["cost"], None, f"Gift: {g['id']}")
            net = round(g["cost"] * (1 - (await get_settings())["commission"]), 2)
            await db.users.update_one({"id": req.recipient_id}, {"$inc": {"withdrawable": net}})
            gift = {"id": g["id"], "icon": g.get("icon"), "cost": g["cost"]}
    did = str(uuid.uuid4())
    doc = {"id": did, "inviter_id": user["id"], "recipient_id": req.recipient_id, "options": options,
           "chosen_idea": None, "coins": req.coins, "total_hold": req.coins, "gift": gift,
           "location": None, "transportation": None, "status": "INVITATION_SENT",
           "status_log": [{"status": "INVITATION_SENT", "at": _iso(), "by": user["id"]}], "report": None,
           "verification": None, "paid_out": False, "refunded": False, "reminders": {},
           "created_at": _iso(), "updated_at": _iso(), "expires_at": _iso(_now() + timedelta(days=7))}
    await db.dates.insert_one(doc)
    await notify(req.recipient_id, "date_request", "You received a new date invitation",
                 f"{user['name']} invited you on a date with {len(options)} option(s). Choose one to continue.",
                 {"date_id": did}, email=True, link=DATES_LINK, cta="View Invitation")
    return {"id": did, "status": "INVITATION_SENT"}

async def _get_party(did, uid, role=None):
    d = await db.dates.find_one({"id": did}, {"_id": 0})
    if not d: raise HTTPException(404, "Not found")
    if uid not in (d["inviter_id"], d["recipient_id"]): raise HTTPException(403, "Forbidden")
    if role == "inviter" and d["inviter_id"] != uid: raise HTTPException(403, "Only the inviter can do this")
    if role == "recipient" and d["recipient_id"] != uid: raise HTTPException(403, "Only the recipient can do this")
    return d

@api.post("/invites/{did}/choose")
async def invite_choose(did: str, req: ChooseIdeaReq, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"], "recipient")
    if d["status"] != "INVITATION_SENT": raise HTTPException(400, "Cannot choose now")
    opt = next((o for o in d["options"] if o["idea_id"] == req.idea_id), None)
    if not opt: raise HTTPException(400, "Invalid option")
    await db.dates.update_one({"id": did}, {"$set": {"chosen_idea": {"idea_id": opt["idea_id"], "name": opt["name"]}}})
    await _log_status(did, "DATE_ACTIVITY_SELECTED", user["id"])
    await notify(d["inviter_id"], "date_accepted", "Your date invitation was accepted",
                 f"{user['name']} chose: {opt['name']}. Now propose a meeting location.", {"date_id": did}, email=True, link=DATES_LINK, cta="View Date")
    return {"ok": True, "status": "DATE_ACTIVITY_SELECTED"}

@api.post("/invites/{did}/location")
async def invite_location(did: str, req: InviteLocationReq, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"], "inviter")
    if d["status"] not in ("DATE_ACTIVITY_SELECTED", "LOCATION_PROPOSED"): raise HTTPException(400, "Cannot set location now")
    start = _pdt(req.scheduled_start)
    if not start: raise HTTPException(400, "Invalid start time")
    end = start + timedelta(hours=DATE_WINDOW_HOURS)
    if await _conflict(user["id"], start, end, did) or await _conflict(d["recipient_id"], start, end, did):
        raise HTTPException(400, "TIME_CONFLICT")
    loc = {"venue": req.venue, "address": req.address or "", "city": req.city or "", "meeting_point": req.meeting_point or "",
           "country": req.country or "", "postal_code": req.postal_code or "", "lat": req.lat, "lng": req.lng,
           "scheduled_start": _iso(start), "scheduled_end": _iso(end)}
    await db.dates.update_one({"id": did}, {"$set": {"location": loc}})
    await _log_status(did, "LOCATION_PROPOSED", user["id"])
    await notify(d["recipient_id"], "date_location", "A meeting location has been proposed",
                 f"{user['name']} proposed {req.venue}. Confirm it or request a taxi.", {"date_id": did}, email=True, link=DATES_LINK, cta="View Date")
    return {"ok": True, "status": "LOCATION_PROPOSED"}

@api.post("/invites/{did}/location/confirm")
async def invite_location_confirm(did: str, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"], "recipient")
    if d["status"] != "LOCATION_PROPOSED": raise HTTPException(400, "Nothing to confirm")
    await _log_status(did, "DATE_CONFIRMED", user["id"])
    for uid in (d["inviter_id"], d["recipient_id"]):
        await notify(uid, "date_accepted", "Your date is confirmed", "The meeting location was confirmed. See details in Dates.", {"date_id": did}, email=True, link=DATES_LINK, cta="View Date")
    return {"ok": True, "status": "DATE_CONFIRMED"}

@api.post("/invites/{did}/taxi/request")
async def invite_taxi_request(did: str, req: InviteTaxiReq, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"], "recipient")
    if d["status"] != "LOCATION_PROPOSED": raise HTTPException(400, "Cannot request taxi now")
    if req.amount <= 0: raise HTTPException(400, "Invalid amount")
    await db.dates.update_one({"id": did}, {"$set": {"transportation": {"type": "taxi", "taxi_amount": int(req.amount), "status": "requested", "requested_by": user["id"]}}})
    await _log_status(did, "TAXI_REQUESTED", user["id"])
    await notify(d["inviter_id"], "date_taxi", "Transportation request received",
                 f"{user['name']} requested a taxi fee of 🪙{req.amount}. Confirm & pay, or offer a pickup.", {"date_id": did}, email=True, link=DATES_LINK, cta="Review Request")
    return {"ok": True, "status": "TAXI_REQUESTED"}

@api.post("/invites/{did}/taxi/confirm")
async def invite_taxi_confirm(did: str, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"], "inviter")
    if d["status"] not in ("TAXI_REQUESTED", "PICKUP_ADDRESS_SELECTED"): raise HTTPException(400, "Cannot confirm taxi now")
    amount = int((d.get("transportation") or {}).get("taxi_amount") or 0)
    if amount > 0:
        if ((user.get("coins") or 0) + (user.get("withdrawable") or 0)) < amount: raise HTTPException(400, "Insufficient coins")
        await spend_coins(user["id"], amount)
        await record_txn(user["id"], "DATE_PAYMENT", -amount, did, "Taxi fee escrow")
        await db.dates.update_one({"id": did}, {"$inc": {"total_hold": amount}})
    await db.dates.update_one({"id": did}, {"$set": {"transportation.type": "taxi", "transportation.status": "confirmed", "transportation.confirmed_by": user["id"]}})
    await _log_status(did, "DATE_CONFIRMED", user["id"])
    for uid in (d["inviter_id"], d["recipient_id"]):
        await notify(uid, "date_taxi", "Transportation confirmed", "Taxi confirmed — your date is confirmed.", {"date_id": did}, email=True, link=DATES_LINK, cta="View Date")
    return {"ok": True, "status": "DATE_CONFIRMED"}

@api.post("/invites/{did}/pickup/offer")
async def invite_pickup_offer(did: str, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"], "inviter")
    if d["status"] not in ("TAXI_REQUESTED", "PICKUP_ADDRESS_SELECTED"): raise HTTPException(400, "Cannot offer pickup now")
    await db.dates.update_one({"id": did}, {"$set": {"transportation.type": "pickup", "transportation.status": "awaiting_address"}})
    await _log_status(did, "PICKUP_ADDRESS_PENDING", user["id"])
    await notify(d["recipient_id"], "date_taxi", "Pickup offered", f"{user['name']} offered to pick you up. Share your pickup address.", {"date_id": did}, email=True, link=DATES_LINK, cta="View Date")
    return {"ok": True, "status": "PICKUP_ADDRESS_PENDING"}

@api.post("/invites/{did}/pickup/address")
async def invite_pickup_address(did: str, req: PickupAddrReq, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"], "recipient")
    if d["status"] != "PICKUP_ADDRESS_PENDING": raise HTTPException(400, "Cannot submit pickup now")
    if not req.pickup_address.strip(): raise HTTPException(400, "Address required")
    await db.dates.update_one({"id": did}, {"$set": {"transportation.pickup_address": req.pickup_address.strip(), "transportation.status": "address_selected"}})
    await _log_status(did, "PICKUP_ADDRESS_SELECTED", user["id"])
    await notify(d["inviter_id"], "date_taxi", "Pickup address shared", f"{user['name']} shared a pickup address. Confirm pickup or pay taxi instead.", {"date_id": did}, email=True, link=DATES_LINK, cta="View Date")
    return {"ok": True, "status": "PICKUP_ADDRESS_SELECTED"}

@api.post("/invites/{did}/pickup/confirm")
async def invite_pickup_confirm(did: str, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"], "inviter")
    if d["status"] != "PICKUP_ADDRESS_SELECTED": raise HTTPException(400, "Nothing to confirm")
    await db.dates.update_one({"id": did}, {"$set": {"transportation.type": "pickup", "transportation.status": "confirmed", "transportation.confirmed_by": user["id"]}})
    await _log_status(did, "DATE_CONFIRMED", user["id"])
    for uid in (d["inviter_id"], d["recipient_id"]):
        await notify(uid, "date_accepted", "Your date is confirmed", "Pickup confirmed — your date is confirmed.", {"date_id": did}, email=True, link=DATES_LINK, cta="View Date")
    return {"ok": True, "status": "DATE_CONFIRMED"}

@api.post("/invites/{did}/transport/refuse")
async def invite_transport_refuse(did: str, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"], "inviter")
    if d["status"] not in ("TAXI_REQUESTED", "PICKUP_ADDRESS_SELECTED", "PICKUP_ADDRESS_PENDING"): raise HTTPException(400, "Cannot refuse now")
    await _refund(d, "split", "CANCELLED_TRANSPORTATION")
    await _log_status(did, "CANCELLED_TRANSPORTATION", user["id"])
    for uid in (d["inviter_id"], d["recipient_id"]):
        await notify(uid, "date_declined", "Your date has been cancelled", "The date was cancelled over transportation. Refund applied (50/25/25).", {"date_id": did}, email=True, link=DATES_LINK, cta="View Details")
    return {"ok": True, "status": "CANCELLED_TRANSPORTATION"}

@api.post("/invites/{did}/cancel")
async def invite_cancel(did: str, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"])
    if d["status"] in ("COMPLETED", "COMPLETED_AUTO", "CANCELLED", "CANCELLED_TRANSPORTATION", "REFUNDED"): raise HTTPException(400, "Already closed")
    start = _pdt((d.get("location") or {}).get("scheduled_start"))
    if start and d["status"] in ("DATE_CONFIRMED",) and _now() >= start - timedelta(minutes=30):
        raise HTTPException(400, "LOCKED")
    if d["recipient_id"] == user["id"]:
        await _refund(d, "full_inviter", "CANCELLED")
    else:
        await _refund(d, "split", "CANCELLED")
    await _log_status(did, "CANCELLED", user["id"])
    other = d["recipient_id"] if user["id"] == d["inviter_id"] else d["inviter_id"]
    await notify(other, "date_declined", "Your date has been cancelled", "The other person cancelled the date. Any applicable refund was processed.", {"date_id": did}, email=True, link=DATES_LINK, cta="View Details")
    return {"ok": True, "status": "CANCELLED"}

@api.post("/invites/{did}/report")
async def invite_report(did: str, req: InviteReportReq, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"])
    start = _pdt((d.get("location") or {}).get("scheduled_start"))
    if not start: raise HTTPException(400, "Report not available yet")
    if not (start <= _now() <= start + timedelta(hours=DATE_WINDOW_HOURS)):
        raise HTTPException(400, "REPORT_WINDOW_CLOSED")
    if len((req.details or "").strip()) < 10: raise HTTPException(400, "Please describe what happened (min 10 chars)")
    rep = {"reporter_id": user["id"], "reasons": req.reasons, "details": req.details.strip(), "evidence": req.evidence, "created_at": _iso()}
    await db.dates.update_one({"id": did}, {"$set": {"report": rep}})
    await _log_status(did, "REPORTED", user["id"])
    for aid in await _admin_ids():
        await notify(aid, "date_request", "Date report submitted", f"A date ({did}) was reported. Review the case in admin.", {"date_id": did}, email=True, link=f"{PUBLIC_APP_URL}/admin", cta="View Case")
    return {"ok": True, "status": "REPORTED"}

@api.post("/invites/{did}/verify")
async def invite_verify(did: str, file: UploadFile = File(...), confirm: bool = Form(False), note: str = Form(""), user=Depends(get_current_user)):
    d = await _get_party(did, user["id"])
    start = _pdt((d.get("location") or {}).get("scheduled_start"))
    if not start or _now() < start + timedelta(hours=24): raise HTTPException(400, "VERIFY_NOT_YET")
    if not confirm: raise HTTPException(400, "Confirmation required")
    ct = (file.content_type or "").lower()
    ext = {"image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp"}.get(ct)
    if not ext: raise HTTPException(400, "Only JPEG/PNG/WEBP images allowed")
    data = await file.read()
    if len(data) > 15 * 1024 * 1024: raise HTTPException(400, "Max 15MB")
    path = f"giftsdates/dateverify/{did}/{uuid.uuid4()}.{ext}"
    put_object(path, data, ct)
    ver = {"user_id": user["id"], "photo": path, "note": note, "status": "pending", "submitted_at": _iso()}
    await db.dates.update_one({"id": did}, {"$set": {"verification": ver}})
    await _log_status(did, "PHOTO_VERIFICATION_PENDING", user["id"])
    inv = await _mini(d["inviter_id"]); rec = await _mini(d["recipient_id"])
    detail = (f"Date confirmation submitted.<br>Date ID: {did}<br>Activity: {(d.get('chosen_idea') or {}).get('name')}<br>"
              f"When: {(d.get('location') or {}).get('scheduled_start')}<br>Where: {(d.get('location') or {}).get('venue')}, {(d.get('location') or {}).get('address')}<br>"
              f"Coins: {d.get('total_hold')}<br>Inviter: {inv}<br>Recipient: {rec}<br>Submitted: {_iso()}")
    await send_email(to=SUPPORT_EMAIL, subject=f"Date confirmation submitted · {did}", html=_email_cta_html("Date confirmation submitted", detail, f"{PUBLIC_APP_URL}/admin", "Review Confirmation"))
    for aid in await _admin_ids():
        await notify(aid, "date_request", "Date confirmation submitted", f"Photo verification pending for date {did}.", {"date_id": did}, email=False)
    return {"ok": True, "status": "PHOTO_VERIFICATION_PENDING"}

@api.post("/invites/{did}/acknowledge")
async def invite_ack(did: str, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"])
    await db.dates.update_one({"id": did}, {"$push": {"acknowledgements": {"by": user["id"], "at": _iso(),
                              "text": "I confirm I have no complaints regarding this date, its cancellation, refund, or the agreed arrangements."}}})
    return {"ok": True}

@api.get("/invites/{did}/slots")
async def invite_slots(did: str, day: str, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"], "inviter")
    try:
        base = datetime.fromisoformat(day).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(400, "Invalid day")
    day_end = base + timedelta(days=1)
    busy = []
    for uid in {d["inviter_id"], d["recipient_id"]}:
        docs = await db.dates.find({"status": {"$in": BUSY_STATUSES}, "id": {"$ne": did},
                                    "$or": [{"inviter_id": uid}, {"recipient_id": uid}]}, {"_id": 0, "location": 1}).to_list(300)
        for x in docs:
            loc = x.get("location") or {}
            s, e = _pdt(loc.get("scheduled_start")), _pdt(loc.get("scheduled_end"))
            if s and e and s < day_end and e > base:
                busy.append((s, e))
    slots = []
    for h in range(10, 20):  # starts 10:00..19:00, +3h ends by 22:00
        st = base.replace(hour=h)
        en = st + timedelta(hours=DATE_WINDOW_HOURS)
        conflict = any(bs < en and st < be for bs, be in busy)
        slots.append({"time": f"{h:02d}:00", "start": _iso(st), "available": not conflict})
    return {"day": day, "busy": [{"start": _iso(s), "end": _iso(e)} for s, e in busy], "slots": slots, "duration_hours": DATE_WINDOW_HOURS}

DATE_CHAT_STATUSES = {"DATE_CONFIRMED", "DATE_COMPLETED_PENDING_VERIFICATION", "PHOTO_VERIFICATION_PENDING",
                      "COMPLETED", "COMPLETED_AUTO", "REPORTED", "UNDER_ADMIN_REVIEW"}

@api.get("/invites/{did}/messages")
async def invite_messages(did: str, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"])
    msgs = await db.date_messages.find({"date_id": did}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"messages": msgs, "chat_enabled": d["status"] in DATE_CHAT_STATUSES}

@api.post("/invites/{did}/messages")
async def invite_send_message(did: str, req: DateMsgReq, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"])
    if d["status"] not in DATE_CHAT_STATUSES:
        raise HTTPException(400, "CHAT_NOT_AVAILABLE")
    text = (req.text or "").strip()[:1000]
    if not text:
        raise HTTPException(400, "Empty message")
    msg = {"id": str(uuid.uuid4()), "date_id": did, "from_id": user["id"], "text": text, "created_at": _iso()}
    await db.date_messages.insert_one(dict(msg))
    other = d["recipient_id"] if d["inviter_id"] == user["id"] else d["inviter_id"]
    await notify(other, "date_message", "New date message", f"{user.get('name')}: {text[:80]}",
                 {"date_id": did}, email=False, link=DATES_LINK, cta="Open chat")
    return {"ok": True, "message": msg}

@api.get("/invites")
async def list_invites(user=Depends(get_current_user)):
    docs = await db.dates.find({"$or": [{"inviter_id": user["id"]}, {"recipient_id": user["id"]}]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    incoming, outgoing = [], []
    for d in docs:
        other_id = d["recipient_id"] if d["inviter_id"] == user["id"] else d["inviter_id"]
        s = _serialize(d, user["id"], await _mini(other_id))
        (outgoing if d["inviter_id"] == user["id"] else incoming).append(s)
    return {"incoming": incoming, "outgoing": outgoing}

@api.get("/invites/{did}")
async def get_invite(did: str, user=Depends(get_current_user)):
    d = await _get_party(did, user["id"])
    other_id = d["recipient_id"] if d["inviter_id"] == user["id"] else d["inviter_id"]
    return _serialize(d, user["id"], await _mini(other_id))

# ---------- Monthly Spin & Win ----------
@api.get("/spin/status")
async def spin_status(user=Depends(get_current_user)):
    month = _now().strftime("%Y-%m")
    done = await db.spin_history.find_one({"user_id": user["id"], "month": month})
    return {"eligible": not done, "month": month, "last": (done or {}).get("reward")}

@api.post("/spin/claim")
async def spin_claim(user=Depends(get_current_user)):
    month = _now().strftime("%Y-%m")
    if await db.spin_history.find_one({"user_id": user["id"], "month": month}):
        raise HTTPException(400, "Already spun this month")
    p = _pick_spin_prize()
    reward = _spin_public(p)
    if p.get("coins"):
        await db.users.update_one({"id": user["id"]}, {"$inc": {"coins": int(p["coins"])}})
        await record_txn(user["id"], "SPIN_WIN", int(p["coins"]), None, "Monthly Spin & Win")
    elif p.get("type") == "premium":
        await db.users.update_one({"id": user["id"]}, {"$set": {"premium_until": extend_until(user.get("premium_until"), int(p.get("premium_days", 30)))}})
    await db.spin_history.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "month": month, "spin_date": _iso(), "reward": reward, "status": "completed", "created_at": _iso()})
    return {"prize": reward}

# ---------- Admin: dates dashboard ----------
async def _require_admin(user):
    if (user.get("email") or "").lower() not in ADMIN_EMAIL_LIST: raise HTTPException(403, "Admin only")

@api.get("/admin/dates")
async def admin_dates(status: Optional[str] = None, user=Depends(get_current_user)):
    await _require_admin(user)
    q = {"status": status} if status else {}
    docs = await db.dates.find(q, {"_id": 0}).sort("updated_at", -1).to_list(300)
    out = []
    for d in docs:
        d["inviter"] = await _mini(d["inviter_id"]); d["recipient"] = await _mini(d["recipient_id"])
        out.append(d)
    return {"dates": out}

@api.post("/admin/dates/{did}/verify")
async def admin_verify(did: str, approve: bool = True, user=Depends(get_current_user)):
    await _require_admin(user)
    d = await db.dates.find_one({"id": did}, {"_id": 0})
    if not d: raise HTTPException(404, "Not found")
    if approve:
        await db.dates.update_one({"id": did}, {"$set": {"verification.status": "approved", "verification.reviewed_by": user["id"], "verification.reviewed_at": _iso()}})
        await _complete(d, "COMPLETED")
    else:
        await db.dates.update_one({"id": did}, {"$set": {"verification.status": "rejected", "verification.reviewed_by": user["id"]}})
        await _log_status(did, "UNDER_ADMIN_REVIEW", user["id"])
    await db.date_admin_log.insert_one({"id": str(uuid.uuid4()), "date_id": did, "admin_id": user["id"], "action": "verify_approve" if approve else "verify_reject", "at": _iso()})
    return {"ok": True}

@api.post("/admin/dates/{did}/resolve")
async def admin_resolve(did: str, action: str, user=Depends(get_current_user)):
    await _require_admin(user)
    d = await db.dates.find_one({"id": did}, {"_id": 0})
    if not d: raise HTTPException(404, "Not found")
    if action == "payout_recipient": await _complete(d, "COMPLETED")
    elif action == "refund_inviter": await _refund(d, "full_inviter", "REFUNDED")
    elif action == "split": await _refund(d, "split", "REFUNDED")
    else: raise HTTPException(400, "Unknown action")
    await db.date_admin_log.insert_one({"id": str(uuid.uuid4()), "date_id": did, "admin_id": user["id"], "action": action, "at": _iso()})
    return {"ok": True}

# ---------- Cron endpoints ----------
async def _run_lifecycle():
    now = _now()
    docs = await db.dates.find({"status": "DATE_CONFIRMED"}, {"_id": 0}).to_list(500)
    for d in docs:
        start = _pdt((d.get("location") or {}).get("scheduled_start"))
        if not start: continue
        r = d.get("reminders") or {}
        async def snd(flag, title, body):
            if r.get(flag): return
            for uid in (d["inviter_id"], d["recipient_id"]):
                await notify(uid, "date_reminder", title, body, {"date_id": d["id"]}, email=True, link=DATES_LINK, cta="View Date")
            await db.dates.update_one({"id": d["id"]}, {"$set": {f"reminders.{flag}": True}})
        if start - timedelta(hours=24) <= now < start - timedelta(hours=3): await snd("h24", "Your date is tomorrow", "Reminder: your date is coming up. Check the details and use the date chat to coordinate.")
        elif start - timedelta(hours=3) <= now < start - timedelta(hours=1): await snd("pre3h", "Your date is in a few hours", "Heads up — your date starts in about 3 hours. Confirm the meeting spot in the date chat so no one forgets.")
        elif start - timedelta(hours=1) <= now < start - timedelta(minutes=30): await snd("h1", "Your date starts in 1 hour", "Your date starts in 1 hour.")
        elif start - timedelta(minutes=30) <= now < start: await snd("m30", "Your date starts in 30 minutes", "Cancellation and date coin actions are now locked.")
        elif start <= now < start + timedelta(hours=3): await snd("started", "Your date has started", "Enjoy — be respectful and safe.")
        elif now >= start + timedelta(hours=3): await snd("h3", "Your scheduled date window has ended", "Photo confirmation unlocks 24h after the start.")
        if now > start + timedelta(hours=72) and not d.get("report") and not (d.get("verification") or {}).get("status") == "pending" and not d.get("paid_out"):
            await _complete(d, "COMPLETED_AUTO")

async def _run_spin_reminders():
    now = _now(); month = now.strftime("%Y-%m")
    users = await db.users.find({"spin_email_month": {"$ne": month}}, {"_id": 0, "id": 1}).to_list(500)
    for u in users:
        if await db.spin_history.find_one({"user_id": u["id"], "month": month}): continue
        await notify(u["id"], "spin", "Your Spin & Win is ready", "Your monthly Spin & Win is available. Spin now to claim your reward!", {}, email=True, link=f"{PUBLIC_APP_URL}/spin", cta="Spin Now")
        await db.users.update_one({"id": u["id"]}, {"$set": {"spin_email_month": month}})

def _cron_auth(authorization):
    import hmac
    if not WEBHOOK_CRON_SECRET: raise HTTPException(503, "cron not configured")
    tok = authorization.split(" ", 1)[1] if authorization and authorization.startswith("Bearer ") else ""
    if not hmac.compare_digest(tok, WEBHOOK_CRON_SECRET): raise HTTPException(401, "unauthorized")

@api.post("/cron/tick")
async def cron_tick(authorization: Optional[str] = Header(None)):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    import asyncio
    _cron_auth(authorization)
    asyncio.create_task(_run_lifecycle())
    return {"accepted": True}

@api.post("/cron/spin")
async def cron_spin(authorization: Optional[str] = Header(None)):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    import asyncio
    _cron_auth(authorization)
    asyncio.create_task(_run_spin_reminders())
    return {"accepted": True}

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
