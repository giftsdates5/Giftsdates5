import React, { useEffect, useRef, useState } from "react";
import { Bell, Heart, Gift, Landmark, CalendarHeart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

const ICONS = { match: Heart, like: Heart, message: Bell, referral: Gift, payout_account: Landmark, withdrawal: Landmark, date_request: CalendarHeart, date_accepted: CalendarHeart, date_declined: CalendarHeart, date_location: CalendarHeart, date_taxi: CalendarHeart };

function playChime() {
  if (localStorage.getItem("gd_sound") === "off") return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      o.connect(g); g.connect(ctx.destination);
      const s = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.18, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.22);
      o.start(s); o.stop(s + 0.24);
    });
  } catch {}
}

function showBrowserNotification(n) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (document.visibilityState === "visible") return;
    new Notification(n.title, { body: n.body, icon: "/brand-logo.png", tag: n.id });
  } catch {}
}

export default function NotificationBell() {
  const { user, lang, refreshUser } = useApp();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const seen = useRef(null);

  useEffect(() => {
    if (!user) return;
    if ("Notification" in window && Notification.permission === "default") { try { Notification.requestPermission(); } catch {} }
    const poll = async () => {
      try {
        const { data } = await api.get("/notifications");
        setItems(data.items); setUnread(data.unread);
        const fresh = data.items.filter(n => !n.read && seen.current && !seen.current.has(n.id));
        if (fresh.length) playChime();
        fresh.forEach(n => {
          if (n.type === "match") toast.success(`💘 ${t("new_match", lang)} · ${n.data?.name}`, { action: { label: t("chats", lang), onClick: () => nav("/chats") } });
          else toast(n.title, { description: n.body });
          showBrowserNotification(n);
        });
        if (fresh.some(n => n.type === "referral")) refreshUser();
        seen.current = new Set(data.items.map(n => n.id));
      } catch {}
    };
    poll();
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
  }, [user?.id, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = async () => { if (unread) { await api.post("/notifications/read").catch(() => {}); setUnread(0); } };

  return (
    <Popover onOpenChange={(o) => o && markRead()}>
      <PopoverTrigger asChild>
        <button data-testid="nav-notifications-button" className="relative w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center text-slate-300">
          <Bell size={17} />
          {unread > 0 && <span data-testid="nav-notifications-unread-badge" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-semibold flex items-center justify-center">{unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-[#161320] border-white/10 text-white" data-testid="notifications-panel">
        <div className="px-4 py-3 border-b border-white/10 font-serif-luxe text-lg">{t("notifications", lang)}</div>
        <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
          {items.length === 0 ? <div className="p-6 text-center text-sm text-slate-500">{t("no_notifications", lang)}</div> : items.map(n => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <button key={n.id} data-testid={`notification-item-${n.id}`} onClick={() => (n.type === "match" || n.type === "message" || n.type === "gift_thanks" || (n.type === "gift" && n.data?.conversation_id)) ? nav(n.data?.conversation_id ? `/chats?c=${n.data.conversation_id}` : "/chats") : n.type === "like" ? nav("/matches") : n.type.startsWith("date_") ? nav("/dates") : nav("/wallet")} className="w-full text-left px-4 py-3 flex gap-3 hover:bg-white/5">
                <Icon size={16} className={n.type === "match" ? "text-rose-400 mt-0.5" : "text-amber-300 mt-0.5"} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{n.title}</div>
                  <div className="text-xs text-slate-400 truncate">{n.body}</div>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
