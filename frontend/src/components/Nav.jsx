import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Heart, Wallet, MessageCircle, Search, Crown, LogOut, CalendarHeart, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import LanguageSwitcher from "./LanguageSwitcher";
import NotificationBell from "./NotificationBell";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

export default function Nav() {
  const { user, lang, logout, spinEligible } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const isPremium = user?.premium_until && new Date(user.premium_until) > new Date();
  const isVip = user?.vip_until && new Date(user.vip_until) > new Date();
  const isLite = user?.premium_lite_until && new Date(user.premium_lite_until) > new Date();

  const NavLink = ({ to, icon: Icon, label, testid }) => (
    <Link to={to} data-testid={testid} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${loc.pathname === to ? "bg-rose-500/15 text-rose-300 border border-rose-500/30" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
      <Icon size={16} /> <span className="hidden md:inline">{label}</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-[#D4AF37]/15">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link to={user ? "/browse" : "/"} className="flex items-center gap-2.5 group" data-testid="nav-logo">
          <div className="w-10 h-10 rounded-xl overflow-hidden gold-hairline bg-[#1A0A14] logo-glow flex items-center justify-center">
            <img src="/brand-logo.png" alt="GiftsDates" className="w-9 h-9 object-contain logo-pulse" />
          </div>
          <div className="leading-none">
            <span className="font-serif-luxe text-2xl font-bold tracking-tight gold-text">GiftsDates</span>
            <span className="hidden sm:block text-[9px] font-semibold tracking-[0.25em] text-[#D4AF37]/80 uppercase mt-0.5">Luxury Dating</span>
          </div>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/browse" icon={Search} label={t("browse", lang)} testid="nav-link-browse" />
            <NavLink to="/matches" icon={Heart} label={t("matches", lang)} testid="nav-link-matches" />
            <NavLink to="/chats" icon={MessageCircle} label={t("chats", lang)} testid="nav-link-chats" />
            <NavLink to="/dates" icon={CalendarHeart} label={t("dates", lang)} testid="nav-link-dates" />
            {spinEligible && <NavLink to="/spin" icon={Sparkles} label={t("sp_nav", lang)} testid="nav-link-spin" />}
            <NavLink to="/wallet" icon={Wallet} label={t("wallet", lang)} testid="nav-link-wallet" />
          </nav>
        )}

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {user ? (
            <>
              <NotificationBell />
              <div data-testid="nav-wallet-coins-badge" className="coin-chip hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono-num">
                <span>🪙</span>
                <span>{(user.coins || 0) + (user.withdrawable || 0)}</span>
              </div>
              {isVip ? (
                <span data-testid="nav-vip-badge" className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/50 text-red-400 text-xs font-semibold">
                  <Crown size={12} className="text-red-500 fill-red-500" /> VIP
                </span>
              ) : isPremium ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs">
                  <Crown size={12} /> {t("premium_active", lang)}
                </span>
              ) : isLite ? (
                <span data-testid="nav-lite-badge" className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/40 text-sky-300 text-xs">
                  <Crown size={12} className="text-sky-400 fill-sky-500" /> {t("premium_lite", lang)}
                </span>
              ) : (
                <Button data-testid="nav-premium-subscribe-button" onClick={() => nav("/wallet?premium=1")} size="sm" className="rose-btn text-white border-0 hidden sm:inline-flex">
                  <Crown size={14} className="me-1" /> {t("premium", lang)}
                </Button>
              )}
              <Link to="/profile" data-testid="nav-profile-link" className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-violet-500 flex items-center justify-center text-sm font-semibold">
                {user.name?.[0]?.toUpperCase() || "U"}
              </Link>
              <Button data-testid="nav-logout-button" onClick={() => { logout(); nav("/"); }} variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <LogOut size={16} />
              </Button>
            </>
          ) : (
            <>
              <Button data-testid="nav-login-button" onClick={() => nav("/auth")} variant="ghost" className="text-slate-200 hover:text-white">{t("login", lang)}</Button>
              <Button data-testid="nav-register-button" onClick={() => nav("/auth?register=1")} className="rose-btn text-white border-0">{t("register", lang)}</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
