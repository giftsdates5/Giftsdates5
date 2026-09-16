import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { GENDERS, ORIENTATIONS, optLabel } from "../components/ProfileDetailsForm";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { LANGUAGES, ZODIAC_EMOJI } from "../lib/i18n";
import SpinWheel from "../components/SpinWheel";
import CountrySelect from "../components/CountrySelect";
import CityField from "../components/CityField";
import { Eye, EyeOff, MapPin, Loader2 } from "lucide-react";
import { detectLocation } from "../lib/geolocate";

const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const CUR_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 82 }, (_, i) => CUR_YEAR - 18 - i); // 18..99 y.o.

const ZODIAC_BOUNDS = [
  [1, 20, "aquarius"], [2, 19, "pisces"], [3, 21, "aries"], [4, 20, "taurus"],
  [5, 21, "gemini"], [6, 21, "cancer"], [7, 23, "leo"], [8, 23, "virgo"],
  [9, 23, "libra"], [10, 23, "scorpio"], [11, 22, "sagittarius"], [12, 22, "capricorn"],
];
function calcZodiac(month, day) {
  if (!month || !day) return null;
  let sign = "capricorn";
  for (const [m, d, name] of ZODIAC_BOUNDS) {
    if (month === m) { sign = day >= d ? name : sign; break; }
    if (month > m) sign = name;
  }
  return sign;
}
function calcAge(y, m, d) {
  if (!y || !m || !d) return null;
  const now = new Date();
  let a = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a -= 1;
  return a > 0 && a < 120 ? a : null;
}

export default function Auth() {
  const { login, register, lang, setLanguage } = useApp();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [mode, setMode] = useState(sp.get("register") ? "register" : "login");
  const [f, setF] = useState({ email: "", password: "", name: "", age: 25, gender: "female", interested_in: "male", orientation: "straight", city: "", country: "", bio: "", referral_code: sp.get("ref") || "", language: lang, birth_day: "", birth_month: "", birth_year: "", lat: null, lng: null });
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingSpin] = useState(() => {
    try { const p = JSON.parse(localStorage.getItem("gd_spin_prize") || "null"); return p && localStorage.getItem("gd_spin_token") ? p : null; } catch { return null; }
  });

  const setBirth = (key, v) => {
    const nf = { ...f, [key]: parseInt(v) };
    const age = calcAge(nf.birth_year, nf.birth_month, nf.birth_day);
    if (age) nf.age = age;
    setF(nf);
  };
  const zodiacPreview = calcZodiac(f.birth_month ? parseInt(f.birth_month) : null, f.birth_day ? parseInt(f.birth_day) : null);

  const detectMyLocation = async () => {
    setLocating(true);
    try {
      const { lat, lng, city, country } = await detectLocation(lang);
      setF((prev) => ({ ...prev, lat, lng, city: city || prev.city, country: country || prev.country }));
      toast.success(t("location_detected", lang) + (city ? ` · ${city}${country ? ", " + country : ""}` : ""));
    } catch {
      toast.error(t("location_failed", lang));
    } finally {
      setLocating(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "register" && !agreed) { toast.error(t("consent_required", lang)); return; }
    setBusy(true);
    try {
      if (mode === "login") { await login(f.email, f.password); toast.success(t("welcome_back", lang)); }
      else {
        const st = localStorage.getItem("gd_spin_token");
        const payload = {
          ...f,
          birth_day: f.birth_day ? parseInt(f.birth_day) : undefined,
          birth_month: f.birth_month ? parseInt(f.birth_month) : undefined,
          birth_year: f.birth_year ? parseInt(f.birth_year) : undefined,
          spin_token: st || undefined,
        };
        await register(payload);
        if (f.language && f.language !== lang) setLanguage(f.language);
        if (pendingSpin) {
          localStorage.removeItem("gd_spin_token"); localStorage.removeItem("gd_spin_prize");
          const p = pendingSpin.type === "premium" ? t("spin_premium_prize", lang) : t("spin_coins_prize", lang).replace("{n}", pendingSpin.coins);
          toast.success(t("spin_bonus_applied", lang).replace("{p}", p));
        } else { toast.success(t("welcome_new", lang)); }
      }
      nav(mode === "login" ? "/browse" : "/verify");
    } catch (err) {
      const d = err.response?.data?.detail || "";
      if (d.startsWith("BLOCKED:")) toast.error(t("account_blocked", lang).replace("{d}", new Date(d.slice(8)).toLocaleDateString()), { duration: 8000 });
      else toast.error(d || t("failed", lang));
    }
    finally { setBusy(false); }
  };

  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md glass rounded-3xl p-8 float-in">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden gold-hairline bg-[#1A0A14] logo-glow">
            <img src="/brand-logo.png" alt="GiftsDates" className="w-full h-full object-cover" />
          </div>
          <h2 className="font-serif-luxe text-3xl gold-text">{mode === "login" ? t("login", lang) : t("register", lang)}</h2>
        </div>

        {mode === "register" && pendingSpin && (
          <div data-testid="spin-pending-banner" className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center text-sm">
            <span className="font-semibold text-amber-200">🎁 {t("spin_banner", lang).replace("{p}", pendingSpin.type === "premium" ? t("spin_premium_prize", lang) : t("spin_coins_prize", lang).replace("{n}", pendingSpin.coins))}</span>
          </div>
        )}
        {!pendingSpin && (
          <div className="mb-4 flex justify-center">
            <SpinWheel onClaim={() => setMode("register")} />
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="text-xs text-slate-400">{t("email", lang)}</Label>
            <Input data-testid="auth-email-input" type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} className="bg-white/5 border-white/10 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-slate-400">{t("password", lang)}</Label>
            <div className="relative mt-1">
              <Input data-testid="auth-password-input" type={showPassword ? "text" : "password"} required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} className="bg-white/5 border-white/10 pr-10" />
              <button type="button" data-testid="auth-password-toggle" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-rose-300 transition-colors">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <>
              <div>
                <Label className="text-xs text-slate-400">{t("language_label", lang)}</Label>
                <Select value={f.language} onValueChange={v => setF({ ...f, language: v })}>
                  <SelectTrigger data-testid="auth-language-select" className="bg-white/5 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#161320] border-white/10 max-h-72">{LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.flag} {l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs text-slate-400">{t("name", lang)}</Label>
                <Input data-testid="auth-name-input" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
              <div>
                <Label className="text-xs text-slate-400">{t("birth_date", lang)}</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <Select value={f.birth_day ? String(f.birth_day) : undefined} onValueChange={v => setBirth("birth_day", v)}>
                    <SelectTrigger data-testid="auth-birth-day-select" className="bg-white/5 border-white/10"><SelectValue placeholder={t("day", lang)} /></SelectTrigger>
                    <SelectContent className="bg-[#161320] border-white/10 max-h-72">{DAYS.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={f.birth_month ? String(f.birth_month) : undefined} onValueChange={v => setBirth("birth_month", v)}>
                    <SelectTrigger data-testid="auth-birth-month-select" className="bg-white/5 border-white/10"><SelectValue placeholder={t("month", lang)} /></SelectTrigger>
                    <SelectContent className="bg-[#161320] border-white/10 max-h-72">{MONTHS.map(m => <SelectItem key={m} value={String(m)}>{String(m).padStart(2,"0")}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={f.birth_year ? String(f.birth_year) : undefined} onValueChange={v => setBirth("birth_year", v)}>
                    <SelectTrigger data-testid="auth-birth-year-select" className="bg-white/5 border-white/10"><SelectValue placeholder={t("year", lang)} /></SelectTrigger>
                    <SelectContent className="bg-[#161320] border-white/10 max-h-72">{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {zodiacPreview && <p className="mt-1.5 text-xs text-violet-300 flex items-center gap-1" data-testid="auth-zodiac-preview"><span aria-hidden="true">{ZODIAC_EMOJI[zodiacPreview]}</span> {t(`zod_${zodiacPreview}`, lang)}{f.age ? ` · ${f.age}` : ""}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">{t("gender", lang)}</Label>
                  <Select value={f.gender} onValueChange={v => setF({ ...f, gender: v })}>
                    <SelectTrigger data-testid="auth-gender-select" className="bg-white/5 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#161320] border-white/10">{GENDERS.map(g => <SelectItem key={g} value={g}>{t(g, lang)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">{t("interested_in", lang)}</Label>
                  <Select value={f.interested_in} onValueChange={v => setF({ ...f, interested_in: v })}>
                    <SelectTrigger data-testid="auth-interest-select" className="bg-white/5 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#161320] border-white/10">{GENDERS.map(g => <SelectItem key={g} value={g}>{t(g, lang)}</SelectItem>)}<SelectItem value="all">{t("all", lang)}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">{t("orientation", lang)}</Label>
                  <Select value={f.orientation} onValueChange={v => setF({ ...f, orientation: v })}>
                    <SelectTrigger data-testid="auth-orientation-select" className="bg-white/5 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#161320] border-white/10">{ORIENTATIONS.map(o => <SelectItem key={o} value={o}>{optLabel("orientation", o, lang)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-slate-400">{t("country", lang)}</Label>
                  <CountrySelect testid="auth-country-select" value={f.country} onChange={v => setF({ ...f, country: v })} lang={lang} /></div>
                <div><Label className="text-xs text-slate-400">{t("city", lang)}</Label>
                  <CityField testid="auth-city-input" required value={f.city} onChange={v => setF({ ...f, city: v })} lang={lang} /></div>
              </div>
              <button
                type="button"
                data-testid="auth-detect-location-button"
                onClick={detectMyLocation}
                disabled={locating}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-200 text-sm hover:bg-sky-500/20 transition-colors disabled:opacity-60"
              >
                {locating ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
                {locating ? t("detecting_location", lang) : t("detect_location", lang)}
              </button>
              {f.lat != null && f.lng != null && (
                <p data-testid="auth-location-coords" className="text-[11px] text-emerald-300/80 flex items-center gap-1 -mt-1">
                  <MapPin size={11} /> {f.lat.toFixed(3)}, {f.lng.toFixed(3)}
                </p>
              )}
              <div><Label className="text-xs text-slate-400">{t("bio", lang)}</Label>
                <Textarea data-testid="auth-bio-input" rows={2} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
              <div><Label className="text-xs text-slate-400">{t("referral_optional", lang)}</Label>
                <Input data-testid="auth-referral-input" value={f.referral_code} onChange={e => setF({ ...f, referral_code: e.target.value.toUpperCase() })} className="bg-white/5 border-white/10 mt-1 font-mono" /></div>
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer" data-testid="auth-consent-label">
                <input data-testid="auth-consent-checkbox" type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-rose-500 shrink-0" />
                <span className="text-xs text-slate-400 leading-relaxed">
                  {t("consent_intro", lang)}{" "}
                  <Link to="/terms" target="_blank" className="text-amber-300 hover:underline">{t("consent_terms", lang)}</Link>,{" "}
                  <Link to="/terms-of-use" target="_blank" className="text-amber-300 hover:underline">{t("consent_use", lang)}</Link>,{" "}
                  <Link to="/privacy" target="_blank" className="text-amber-300 hover:underline">{t("consent_privacy", lang)}</Link> {t("consent_and", lang)}{" "}
                  <Link to="/cookies" target="_blank" className="text-amber-300 hover:underline">{t("consent_cookies", lang)}</Link>.
                </span>
              </label>
            </>
          )}

          <Button data-testid="auth-submit-button" disabled={busy || (mode === "register" && !agreed)} type="submit" className="w-full rose-btn text-white border-0 h-11 mt-2">
            {busy ? "…" : (mode === "login" ? t("login", lang) : t("register", lang))}
          </Button>
        </form>

        <button data-testid="auth-toggle-mode" onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-4 w-full text-center text-sm text-slate-400 hover:text-rose-300">
          {mode === "login" ? `${t("register", lang)} →` : `← ${t("login", lang)}`}
        </button>
      </div>
    </div>
  );
}
