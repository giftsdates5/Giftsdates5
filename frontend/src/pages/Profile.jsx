import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Trash2, Eye, EyeOff, MapPin, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { detectLocation } from "../lib/geolocate";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import PhotoGrid from "../components/PhotoGrid";
import ProfileDetailsForm from "../components/ProfileDetailsForm";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import VipEditor from "../components/VipEditor";
import CountrySelect from "../components/CountrySelect";
import CityField from "../components/CityField";

const DETAIL_KEYS = ["relationship_intent", "orientation", "hobbies", "height", "weight", "languages_spoken", "job_title", "income", "income_custom", "kids", "smoking", "drinking", "religion", "bust_size", "penis_size", "date_price", "video_rate", "availability", "availability_time", "availability_slots"];

export default function Profile() {
  const { user, refreshUser, lang, meta, logout } = useApp();
  const nav = useNavigate();
  const isPremium = user?.premium_until && new Date(user.premium_until) > new Date();
  const [f, setF] = useState(() => ({ name: user?.name, age: user?.age, bio: user?.bio, city: user?.city, country: user?.country,
    lat: user?.lat ?? null, lng: user?.lng ?? null,
    ...Object.fromEntries(DETAIL_KEYS.map(k => [k, user?.[k] ?? null])) }));
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [soundOn, setSoundOn] = useState(localStorage.getItem("gd_sound") !== "off");

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

  const cancelSubscription = async () => {
    if (!window.confirm(t("cancel_sub_confirm", lang))) return;
    try { await api.post("/premium/auto-renew", { enabled: false }); await refreshUser(); toast.success(t("sub_cancelled_toast", lang).replace("{d}", new Date(user.premium_until).toLocaleDateString())); }
    catch { toast.error(t("failed", lang)); }
  };

  const deleteAccount = async () => {
    if (!window.confirm(t("delete_account_confirm", lang))) return;
    if (!window.confirm(t("delete_account_confirm2", lang))) return;
    try { await api.delete("/account"); toast.success(t("account_deleted_toast", lang)); logout(); nav("/"); }
    catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); }
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload = { ...f };
      for (const k of DETAIL_KEYS) if (payload[k] === "" || payload[k] === null) payload[k] = ["hobbies", "languages_spoken", "availability"].includes(k) ? [] : ["availability_time", "availability_slots"].includes(k) ? {} : "";
      if (!payload.availability_time?.from) payload.availability_time = { from: "18:00", to: "23:00" };
      if (!payload.height) delete payload.height;
      if (!payload.weight) delete payload.weight;
      if (!payload.date_price) delete payload.date_price;
      if (!payload.video_rate) delete payload.video_rate;
      await api.patch("/auth/me", payload); await refreshUser(); toast.success(t("saved", lang));
    } catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); } finally { setBusy(false); }
  };

  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)]">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <h1 className="font-serif-luxe text-4xl">{t("profile", lang)}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Button data-testid="profile-preview-button" variant="outline" onClick={() => nav(`/profile/${user.id}`)} className="bg-white/5 border-white/15 hover:bg-white/10 text-slate-200 h-10"><Eye size={16} className="me-1.5" /> {t("preview_my_profile", lang)}</Button>
            <Button data-testid="profile-preview-nonvip-button" variant="outline" onClick={() => nav(`/profile/${user.id}?preview=guest`)} className="bg-white/5 border-white/15 hover:bg-white/10 text-slate-200 h-10"><EyeOff size={16} className="me-1.5" /> {t("preview_as_nonvip", lang)}</Button>
          </div>
        </div>
        <div className="glass rounded-2xl p-6 space-y-4 mb-6">
          <PhotoGrid />
        </div>
        {!user?.verified && (
          <button data-testid="profile-verify-banner" onClick={() => nav("/verify")} className="w-full text-left glass rounded-2xl p-4 mb-6 border border-amber-500/30 hover:bg-amber-500/5 flex items-center gap-3 transition-colors">
            <ShieldCheck className="text-amber-300" size={20} /><span className="text-sm text-amber-200">{t("not_verified_banner", lang)}</span>
          </button>
        )}
        <div className="glass rounded-2xl p-6 space-y-4 mb-6">
          <h2 className="font-serif-luxe text-2xl">{t("about_me", lang)}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-slate-400">{t("name", lang)}</Label>
              <Input data-testid="profile-name-input" value={f.name || ""} onChange={e => setF({ ...f, name: e.target.value })} className="bg-white/5 border-white/10 mt-1"/></div>
            <div><Label className="text-xs text-slate-400">{t("age", lang)}</Label>
              <Input data-testid="profile-age-input" type="number" value={f.age || 18} onChange={e => setF({ ...f, age: parseInt(e.target.value||18) })} className="bg-white/5 border-white/10 mt-1"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-slate-400">{t("country", lang)}</Label>
              <CountrySelect testid="profile-country-select" value={f.country} onChange={v => setF({ ...f, country: v })} lang={lang} /></div>
            <div><Label className="text-xs text-slate-400">{t("city", lang)}</Label>
              <CityField testid="profile-city-input" value={f.city} onChange={v => setF({ ...f, city: v })} lang={lang} /></div>
          </div>
          <button
            type="button"
            data-testid="profile-detect-location-button"
            onClick={detectMyLocation}
            disabled={locating}
            className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-200 text-sm hover:bg-sky-500/20 transition-colors disabled:opacity-60"
          >
            {locating ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
            {locating ? t("detecting_location", lang) : t("detect_location", lang)}
          </button>
          {f.lat != null && f.lng != null && (
            <p data-testid="profile-location-coords" className="text-[11px] text-emerald-300/80 flex items-center gap-1 -mt-1">
              <MapPin size={11} /> {Number(f.lat).toFixed(3)}, {Number(f.lng).toFixed(3)}
            </p>
          )}
          <div><Label className="text-xs text-slate-400">{t("bio", lang)}</Label>
            <Textarea data-testid="profile-bio-input" rows={4} value={f.bio || ""} onChange={e => setF({ ...f, bio: e.target.value })} className="bg-white/5 border-white/10 mt-1"/></div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <Label className="text-xs text-amber-300">{t("date_price", lang)}</Label>
            <p className="text-[11px] text-slate-400 mt-0.5" data-testid="profile-date-price-note">{t("date_price_note", lang)}</p>
            <Input data-testid="profile-date-price-input" type="number" min={meta?.date_min_coins || 150} step="50" value={f.date_price || ""} placeholder={String(meta?.date_min_coins || 150)} onChange={e => setF({ ...f, date_price: e.target.value ? parseInt(e.target.value) : null })} className="bg-white/5 border-white/10 mt-1 font-mono-num"/>
            <p className="text-xs text-slate-400 mt-1">{t("date_price_hint", lang).replace("{n}", meta?.date_min_coins || 150)}</p>
          </div>
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
            <Label className="text-xs text-violet-300">{t("video_price", lang)}</Label>
            <Input data-testid="profile-video-rate-input" type="number" min={meta?.video_rate || 10} step="5" value={f.video_rate || ""} placeholder={String(meta?.video_rate || 10)} onChange={e => setF({ ...f, video_rate: e.target.value ? parseInt(e.target.value) : null })} className="bg-white/5 border-white/10 mt-1 font-mono-num"/>
            <p className="text-xs text-slate-400 mt-1">{t("video_price_hint", lang).replace("{n}", meta?.video_rate || 10)}</p>
          </div>
        </div>
        <ProfileDetailsForm f={f} setF={setF} lang={lang} gender={user?.gender} />
        <AvailabilityCalendar value={f.availability || []} onChange={(days) => setF({ ...f, availability: days })}
          timeWindow={f.availability_time} onTimeWindow={(w) => setF({ ...f, availability_time: w })}
          slots={f.availability_slots || {}} onSlots={(s) => setF({ ...f, availability_slots: s })} />
        <div className="sticky bottom-4">
          <Button data-testid="profile-save-button" disabled={busy} onClick={save} className="rose-btn text-white border-0 h-12 w-full shadow-xl">{t("save", lang)}</Button>
        </div>

        <VipEditor />

        <div className="glass rounded-2xl p-6 mt-6 space-y-4">
          <h3 className="font-serif-luxe text-xl gold-text">{t("account", lang)}</h3>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-300">🔔 {t("sound_notifications", lang)}</div>
            <Button data-testid="profile-sound-toggle" variant="outline" onClick={() => { const next = !soundOn; localStorage.setItem("gd_sound", next ? "on" : "off"); setSoundOn(next); }} className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10">{soundOn ? `🔊 ${t("sound_on", lang)}` : `🔇 ${t("sound_off", lang)}`}</Button>
          </div>
          {isPremium && user?.premium_auto_renew !== false && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-slate-300">👑 {t("premium_active", lang)} · {new Date(user.premium_until).toLocaleDateString()}</div>
              <Button data-testid="profile-cancel-subscription" variant="outline" onClick={cancelSubscription} className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300">{t("cancel_subscription", lang)}</Button>
            </div>
          )}
          {isPremium && user?.premium_auto_renew === false && (
            <div className="text-xs text-amber-300/90" data-testid="profile-sub-cancelled-note">⛔ {t("premium_autorenew_off", lang).replace("{d}", new Date(user.premium_until).toLocaleDateString())}</div>
          )}
          <div className="border-t border-rose-500/20 pt-4">
            <div className="text-sm font-semibold text-rose-300 mb-1 flex items-center gap-1.5"><Trash2 size={15}/> {t("danger_zone", lang)}</div>
            <p className="text-xs text-slate-400 mb-3">{t("delete_account_note", lang)}</p>
            <Button data-testid="profile-delete-account" variant="outline" onClick={deleteAccount} className="bg-rose-500/10 border-rose-500/40 text-rose-300 hover:bg-rose-500/20"><Trash2 size={14} className="me-1"/> {t("delete_account", lang)}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
