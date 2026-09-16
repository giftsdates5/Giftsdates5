import React, { useEffect, useState, useCallback } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import ProfileCard from "../components/ProfileCard";
import CountrySelect from "../components/CountrySelect";
import GiftModal from "../components/GiftModal";
import VideoCallModal from "../components/VideoCallModal";
import DateBookingModal from "../components/DateBookingModal";
import InviteDateModal from "../components/InviteDateModal";
import FeedBar from "../components/FeedBar";
import { Search, SlidersHorizontal, ChevronDown, Crown, Lock, Navigation, Plane, X, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { INTENTS, KIDS, HABITS, RELIGIONS, INCOMES, BUST, SIZES, GENDERS, ORIENTATIONS, optLabel } from "../components/ProfileDetailsForm";
import { VIP_CATEGORIES, catTitle } from "../lib/vipCatalog";
import { LANGUAGES } from "../lib/i18n";
import { Switch } from "../components/ui/switch";
import { geocodeCity } from "../lib/geolocate";

const ALL = "all";
const RADII = [5, 10, 25, 50, 100, 250];
const EXTRA_DEFAULT = { intent: ALL, kids: ALL, smoking: ALL, drinking: ALL, religion: ALL, income: ALL, language: ALL, bust_size: ALL, penis_size: ALL, orientation: ALL,
  min_height: "", max_height: "", min_weight: "", max_weight: "", hobby: "", job: "", max_date_price: "", premium_only: false, vip_only: false, with_photos: false, verified_only: false, online_now: false,
  vip_categories: [], vip_min_price: "", vip_max_price: "", vip_date: "" };

function FilterSelect({ testid, field, value, options, onChange, lang, label, labelFn }) {
  return (
    <div className="min-w-[150px]">
      <label className="text-xs text-slate-400">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid={testid} className="bg-white/5 border-white/10 mt-1"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-[#161320] border-white/10 text-white max-h-72">
          <SelectItem value={ALL}>{t("all", lang)}</SelectItem>
          {options.map(o => <SelectItem key={o} value={o}>{labelFn ? labelFn(o) : optLabel(field, o, lang)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
function NumInput({ testid, label, value, onChange, min, max }) {
  return (
    <div className="min-w-[100px]">
      <label className="text-xs text-slate-400">{label}</label>
      <Input data-testid={testid} type="number" min={min} max={max} value={value} onChange={e => onChange(e.target.value)} className="bg-white/5 border-white/10 mt-1" />
    </div>
  );
}
function Toggle({ testid, label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-300 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer">
      <Switch data-testid={testid} checked={checked} onCheckedChange={onChange} /> {label}
    </label>
  );
}

export default function Browse() {
  const { lang, user, refreshUser } = useApp();
  const isPremium = user?.premium_until && new Date(user.premium_until) > new Date();
  const hasCoords = user?.lat != null && user?.lng != null;
  const isVip = user?.vip_until && new Date(user.vip_until) > new Date();
  const nav = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", city: "", country: "", gender: "all", min_age: 18, max_age: 60, max_distance: "", sort: "", online_nearby: false, ...EXTRA_DEFAULT });
  const [showMore, setShowMore] = useState(false);
  const [target, setTarget] = useState(null);
  const [modal, setModal] = useState(null);
  const [quota, setQuota] = useState(null);
  const [travel, setTravel] = useState(null); // { lat, lng, city }
  const [travelInput, setTravelInput] = useState("");
  const [travelBusy, setTravelBusy] = useState(false);
  const loadQuota = () => api.get("/likes/quota").then(r => setQuota(r.data)).catch(() => {});
  useEffect(() => { loadQuota(); }, []);

  const setTravelMode = async () => {
    const q = travelInput.trim();
    if (!q) return;
    setTravelBusy(true);
    try {
      const res = await geocodeCity(q);
      if (!res) { toast.error(t("travel_not_found", lang)); return; }
      setTravel(res);
      toast.success(t("travel_active", lang).replace("{city}", res.city));
    } catch { toast.error(t("travel_not_found", lang)); }
    finally { setTravelBusy(false); }
  };
  const clearTravel = () => { setTravel(null); setTravelInput(""); };

  const passport = user?.passport_cities || [];
  const savePassport = async (list) => {
    try { await api.patch("/auth/me", { passport_cities: list }); await refreshUser(); }
    catch { toast.error(t("failed", lang)); }
  };
  const applyPassport = (c) => { setTravel({ lat: c.lat, lng: c.lng, city: c.city }); toast.success(t("travel_active", lang).replace("{city}", c.city)); };
  const saveCurrentTravel = async () => {
    if (!travel) return;
    if (passport.some(c => c.city.toLowerCase() === travel.city.toLowerCase())) return;
    await savePassport([...passport, { city: travel.city, lat: travel.lat, lng: travel.lng }].slice(0, 8));
    toast.success(t("passport_saved", lang));
  };
  const removePassport = async (city) => {
    await savePassport(passport.filter(c => c.city !== city));
    toast.success(t("passport_removed", lang));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (travel) { params.origin_lat = travel.lat; params.origin_lng = travel.lng; }
      if (Array.isArray(params.vip_categories)) { if (params.vip_categories.length) params.vip_categories = params.vip_categories.join(","); else delete params.vip_categories; }
      Object.keys(params).forEach(k => (params[k] === ALL || params[k] === "" || params[k] == null || params[k] === false) && delete params[k]);
      const { data } = await api.get("/profiles", { params });
      setProfiles(data);
    } catch (e) {
      if (e.response?.data?.detail === "VIP_REQUIRED") { toast.error(t("vip_filter_locked", lang), { action: { label: "VIP", onClick: () => nav("/wallet?premium=1") } }); setFilters(f => ({ ...f, vip_only: false })); }
      else if (e.response?.data?.detail === "PREMIUM_REQUIRED") { toast.error(t("premium_filters_locked", lang), { action: { label: t("premium", lang), onClick: () => nav("/wallet?premium=1") } }); setFilters(f => ({ ...f, ...EXTRA_DEFAULT })); }
      else toast.error(t("failed_load", lang));
    }
    finally { setLoading(false); }
  }, [filters, travel]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const like = async (p) => {
    try {
      const { data } = await api.post("/likes", { target_id: p.id });
      if (data.matched) toast.success(`💘 ${t("match", lang)} · ${p.name}`);
      else toast.success(`💗 ${t("like", lang)}: ${p.name}`);
      loadQuota();
    } catch (e) {
      const d = e.response?.data?.detail || "";
      if (d.startsWith("LIKE_LIMIT:")) toast.error(t("like_limit_reached", lang).replace("{n}", d.split(":")[1]), { duration: 6000, action: { label: t("premium", lang), onClick: () => nav("/wallet?premium=1") } });
      else toast.error(t("failed", lang));
    }
  };
  const open = (m, p) => { setTarget(p); setModal(m); };

  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <FeedBar />
        <div className="glass rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs text-slate-400 flex items-center gap-1"><Search size={12}/> {t("search_placeholder", lang)}</label>
            <Input data-testid="profile-search-input" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} className="bg-white/5 border-white/10 mt-1" />
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs text-slate-400">{t("country", lang)}</label>
            <CountrySelect testid="profile-country-filter-select" value={filters.country} onChange={v => setFilters({ ...filters, country: v === "Global" ? "" : v })} lang={lang} placeholder={t("any_country", lang)} />
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs text-slate-400">{t("city", lang)}</label>
            <Input data-testid="profile-city-filter-input" value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} className="bg-white/5 border-white/10 mt-1" />
          </div>
          <div className="min-w-[120px]">
            <label className="text-xs text-slate-400">{t("gender", lang)}</label>
            <Select value={filters.gender} onValueChange={v => setFilters({ ...filters, gender: v })}>
              <SelectTrigger data-testid="profile-gender-filter-select" className="bg-white/5 border-white/10 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#161320] border-white/10 text-white">
                <SelectItem value="all">{t("all", lang)}</SelectItem>
                {GENDERS.map(g => <SelectItem key={g} value={g}>{t(g, lang)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[100px]">
            <label className="text-xs text-slate-400">Min {t("age", lang)}</label>
            <Input data-testid="profile-min-age-input" type="number" min="18" max="99" value={filters.min_age} onChange={e => setFilters({ ...filters, min_age: parseInt(e.target.value||18) })} className="bg-white/5 border-white/10 mt-1" />
          </div>
          <div className="min-w-[100px]">
            <label className="text-xs text-slate-400">Max {t("age", lang)}</label>
            <Input data-testid="profile-max-age-input" type="number" min="18" max="99" value={filters.max_age} onChange={e => setFilters({ ...filters, max_age: parseInt(e.target.value||99) })} className="bg-white/5 border-white/10 mt-1" />
          </div>
          <div className="min-w-[130px]">
            <label className="text-xs text-slate-400">{t("distance_label", lang)}</label>
            <Select value={filters.max_distance ? String(filters.max_distance) : ALL} onValueChange={v => setFilters({ ...filters, max_distance: v === ALL ? "" : parseInt(v) })} disabled={!hasCoords && !travel}>
              <SelectTrigger data-testid="profile-distance-filter-select" className="bg-white/5 border-white/10 mt-1" title={(!hasCoords && !travel) ? t("location_needed_for_distance", lang) : undefined}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#161320] border-white/10 text-white">
                <SelectItem value={ALL}>{t("any_distance", lang)}</SelectItem>
                {RADII.map(r => <SelectItem key={r} value={String(r)}>{t("within_km", lang).replace("{n}", r)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <button
            type="button"
            data-testid="profile-sort-nearby-toggle"
            disabled={!hasCoords && !travel}
            title={(!hasCoords && !travel) ? t("location_needed_for_distance", lang) : undefined}
            onClick={() => setFilters(f => ({ ...f, sort: f.sort === "nearby" ? "" : "nearby" }))}
            className={`h-[38px] mt-auto inline-flex items-center gap-1.5 px-3 rounded-lg text-xs border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${filters.sort === "nearby" ? "bg-sky-500/20 border-sky-500/50 text-sky-200" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}
          >
            <Navigation size={13} /> {t("sort_nearby", lang)}
          </button>
          <button
            type="button"
            data-testid="profile-online-nearby-toggle"
            disabled={!hasCoords && !travel}
            title={(!hasCoords && !travel) ? t("location_needed_for_distance", lang) : undefined}
            onClick={() => setFilters(f => ({ ...f, online_nearby: !f.online_nearby }))}
            className={`h-[38px] mt-auto inline-flex items-center gap-1.5 px-3 rounded-lg text-xs border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${filters.online_nearby ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-200" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${filters.online_nearby ? "bg-emerald-400" : "bg-emerald-400/60"}`} /> {t("online_nearby", lang)}
          </button>
          <Button data-testid="profile-search-submit-button" onClick={load} className="rose-btn text-white border-0"><SlidersHorizontal size={14} className="me-1"/> {t("filters", lang)}</Button>
          <label className="flex items-center gap-2 text-xs text-red-200 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 cursor-pointer h-[38px]" data-testid="main-vip-only-wrap">
            <Switch data-testid="main-filter-vip-only" checked={filters.vip_only} onCheckedChange={v => setFilters({ ...filters, vip_only: v })} /> ♛ {t("vip_only", lang)}
          </label>
          <Button data-testid="profile-more-filters-toggle" onClick={() => setShowMore(!showMore)} variant="outline" className={`bg-white/5 border-white/10 hover:bg-white/10 ${!isPremium ? "text-amber-300 border-amber-500/30" : ""}`}><ChevronDown size={14} className={`me-1 transition-transform ${showMore ? "rotate-180" : ""}`}/>{!isPremium && <Crown size={14} className="me-1 text-amber-300"/>} {t("more_filters", lang)}</Button>
          {quota && !quota.premium && (
            <button data-testid="likes-quota-badge" onClick={() => nav("/wallet?premium=1")} className={`ms-auto px-3 py-2 rounded-full text-xs border font-mono-num ${quota.remaining === 0 ? "bg-rose-500/15 border-rose-500/40 text-rose-300" : "bg-white/5 border-white/10 text-slate-300"}`}>
              💗 {t("likes_left", lang).replace("{a}", quota.used).replace("{b}", quota.limit)}
            </button>
          )}
        </div>
        <div className="glass rounded-2xl p-3 mb-6 flex flex-wrap items-center gap-3" data-testid="travel-mode-bar">
          <div className="flex items-center gap-2 text-sm text-sky-200 shrink-0">
            <Plane size={16} className="text-sky-300" /> <span className="font-medium">{t("travel_mode", lang)}</span>
          </div>
          {travel ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span data-testid="travel-mode-active" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/20 border border-sky-500/50 text-sky-100 text-xs">
                <Navigation size={12} /> {t("travel_active", lang).replace("{city}", travel.city)}
              </span>
              {!passport.some(c => c.city.toLowerCase() === travel.city.toLowerCase()) && (
                <button data-testid="travel-mode-save" type="button" onClick={saveCurrentTravel} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition-colors">
                  <Star size={12} /> {t("passport_save", lang)}
                </button>
              )}
              <button data-testid="travel-mode-clear" type="button" onClick={clearTravel} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 transition-colors">
                <X size={12} /> {t("travel_clear", lang)}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <Input
                data-testid="travel-mode-input"
                value={travelInput}
                onChange={e => setTravelInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") setTravelMode(); }}
                placeholder={t("travel_destination", lang)}
                className="bg-white/5 border-white/10 h-9 max-w-[280px]"
              />
              <Button data-testid="travel-mode-set" onClick={setTravelMode} disabled={travelBusy || !travelInput.trim()} className="h-9 bg-sky-600 hover:bg-sky-500 text-white border-0">
                {travelBusy ? "…" : t("travel_set", lang)}
              </Button>
              <span className="text-[11px] text-slate-400 hidden sm:inline">{t("travel_mode_hint", lang)}</span>
            </div>
          )}
          {passport.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto sm:ms-auto" data-testid="passport-cities">
              <span className="text-[11px] text-slate-400 flex items-center gap-1"><Star size={11} className="text-amber-300" /> {t("passport_cities", lang)}:</span>
              {passport.map(c => (
                <span key={c.city} className={`inline-flex items-center gap-1 rounded-full text-xs border transition-colors ${travel && travel.city === c.city ? "bg-sky-500/25 border-sky-500/60 text-sky-100" : "bg-white/5 border-white/10 text-slate-200"}`}>
                  <button data-testid={`passport-apply-${c.city}`} type="button" onClick={() => applyPassport(c)} className="ps-2.5 py-1 hover:text-sky-200 transition-colors">{c.city}</button>
                  <button data-testid={`passport-remove-${c.city}`} type="button" onClick={() => removePassport(c.city)} className="pe-2 ps-0.5 py-1 text-slate-400 hover:text-rose-300 transition-colors"><X size={11} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
        {showMore && (
          <div className="glass rounded-2xl p-4 mb-6 space-y-3 float-in" data-testid="profile-more-filters-panel">
            {!isPremium && (
              <div data-testid="profile-filters-premium-lock" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex flex-wrap items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0"><Lock size={16} className="text-amber-300" /></div>
                <div className="flex-1 min-w-[200px]">
                  <div className="font-serif-luxe text-base">{t("premium_filters_locked", lang)}</div>
                  <div className="text-xs text-slate-400">{t("premium_perks_short", lang)}</div>
                </div>
                <Button data-testid="profile-filters-get-premium" onClick={() => nav("/wallet?premium=1")} className="rose-btn text-white border-0 h-10"><Crown size={16} className="me-1" /> {t("buy_premium", lang)}</Button>
              </div>
            )}
            <fieldset disabled={!isPremium} data-testid="profile-more-filters-controls" className={`space-y-3 border-0 p-0 m-0 min-w-0 ${!isPremium ? "opacity-60 select-none" : ""}`}>
            <div className="flex flex-wrap gap-3 items-end">
              <FilterSelect testid="filter-intent-select" field="relationship_intent" label={t("relationship_intent", lang)} value={filters.intent} options={INTENTS} onChange={v => setFilters({ ...filters, intent: v })} lang={lang} />
              <FilterSelect testid="filter-orientation-select" field="orientation" label={t("orientation", lang)} value={filters.orientation} options={ORIENTATIONS.filter(o => o !== "prefer_not")} onChange={v => setFilters({ ...filters, orientation: v })} lang={lang} />
              <FilterSelect testid="filter-kids-select" field="kids" label={t("kids", lang)} value={filters.kids} options={KIDS} onChange={v => setFilters({ ...filters, kids: v })} lang={lang} />
              <FilterSelect testid="filter-smoking-select" field="smoking" label={t("smoking", lang)} value={filters.smoking} options={HABITS} onChange={v => setFilters({ ...filters, smoking: v })} lang={lang} />
              <FilterSelect testid="filter-drinking-select" field="drinking" label={t("drinking", lang)} value={filters.drinking} options={HABITS} onChange={v => setFilters({ ...filters, drinking: v })} lang={lang} />
              <FilterSelect testid="filter-religion-select" field="religion" label={t("religion", lang)} value={filters.religion} options={RELIGIONS.filter(r => r !== "prefer_not")} onChange={v => setFilters({ ...filters, religion: v })} lang={lang} />
              <FilterSelect testid="filter-income-select" field="income" label={t("income", lang)} value={filters.income} options={INCOMES.filter(r => r !== "prefer_not" && r !== "custom")} onChange={v => setFilters({ ...filters, income: v })} lang={lang} />
              <FilterSelect testid="filter-language-select" field="language" label={t("language_filter", lang)} value={filters.language} options={LANGUAGES.map(l => l.code)} labelFn={c => { const l = LANGUAGES.find(x => x.code === c); return `${l.flag} ${l.name}`; }} onChange={v => setFilters({ ...filters, language: v })} lang={lang} />
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <NumInput testid="filter-min-height-input" label={`${t("height", lang)} · ${t("min", lang)}`} min="100" max="250" value={filters.min_height} onChange={v => setFilters({ ...filters, min_height: v })} />
              <NumInput testid="filter-max-height-input" label={`${t("height", lang)} · ${t("max", lang)}`} min="100" max="250" value={filters.max_height} onChange={v => setFilters({ ...filters, max_height: v })} />
              <NumInput testid="filter-min-weight-input" label={`${t("weight", lang)} · ${t("min", lang)}`} min="30" max="300" value={filters.min_weight} onChange={v => setFilters({ ...filters, min_weight: v })} />
              <NumInput testid="filter-max-weight-input" label={`${t("weight", lang)} · ${t("max", lang)}`} min="30" max="300" value={filters.max_weight} onChange={v => setFilters({ ...filters, max_weight: v })} />
              <NumInput testid="filter-max-date-price-input" label={t("max_date_price", lang)} min="0" value={filters.max_date_price} onChange={v => setFilters({ ...filters, max_date_price: v })} />
              <div className="min-w-[150px]"><label className="text-xs text-slate-400">{t("hobby_filter", lang)}</label>
                <Input data-testid="filter-hobby-input" value={filters.hobby} onChange={e => setFilters({ ...filters, hobby: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
              <div className="min-w-[150px]"><label className="text-xs text-slate-400">{t("job_title", lang)}</label>
                <Input data-testid="filter-job-input" value={filters.job} onChange={e => setFilters({ ...filters, job: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
              {filters.gender !== "male" && <FilterSelect testid="filter-bust-select" field="bust_size" label={t("bust_size", lang)} value={filters.bust_size} options={BUST} onChange={v => setFilters({ ...filters, bust_size: v })} lang={lang} />}
              {filters.gender !== "female" && <FilterSelect testid="filter-penis-select" field="penis_size" label={t("penis_size", lang)} value={filters.penis_size} options={SIZES} onChange={v => setFilters({ ...filters, penis_size: v })} lang={lang} />}
            </div>
            {isVip && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 space-y-3" data-testid="vip-filters-block">
                <div className="text-xs font-semibold text-red-300 flex items-center gap-1"><Crown size={12} className="fill-red-500 text-red-500" /> {t("vip_only", lang)}</div>
                <div className="flex flex-wrap gap-2">
                  {VIP_CATEGORIES.map(c => (
                    <button key={c.key} data-testid={`vip-filter-cat-${c.key}`} type="button"
                      onClick={() => setFilters(f => ({ ...f, vip_categories: f.vip_categories.includes(c.key) ? f.vip_categories.filter(x => x !== c.key) : [...f.vip_categories, c.key] }))}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filters.vip_categories.includes(c.key) ? "bg-red-500/20 border-red-500/50 text-red-200" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>{catTitle(c.key, lang)}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                  <NumInput testid="vip-filter-min-price" label={`${t("vip_price_coins", lang)} · ${t("min", lang)}`} min="0" value={filters.vip_min_price} onChange={v => setFilters({ ...filters, vip_min_price: v })} />
                  <NumInput testid="vip-filter-max-price" label={`${t("vip_price_coins", lang)} · ${t("max", lang)}`} min="0" value={filters.vip_max_price} onChange={v => setFilters({ ...filters, vip_max_price: v })} />
                  <div className="min-w-[150px]"><label className="text-xs text-slate-400">{t("vip_availability", lang)}</label>
                    <Input data-testid="vip-filter-date" type="date" value={filters.vip_date} onChange={e => setFilters({ ...filters, vip_date: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 items-center">
              <Toggle testid="filter-premium-only" label={`👑 ${t("premium_only", lang)}`} checked={filters.premium_only} onChange={v => setFilters({ ...filters, premium_only: v })} />
              <Toggle testid="filter-online-now" label={`🟢 ${t("online_now", lang)}`} checked={filters.online_now} onChange={v => setFilters({ ...filters, online_now: v })} />
              <Toggle testid="filter-with-photos" label={`📷 ${t("with_photos", lang)}`} checked={filters.with_photos} onChange={v => setFilters({ ...filters, with_photos: v })} />
              <Toggle testid="filter-verified-only" label={`✅ ${t("verified_only", lang)}`} checked={filters.verified_only} onChange={v => setFilters({ ...filters, verified_only: v })} />
              {isPremium && <Button data-testid="profile-filters-reset-button" variant="ghost" onClick={() => setFilters({ ...filters, ...EXTRA_DEFAULT })} className="text-slate-400 hover:text-white ms-auto">{t("reset", lang)}</Button>}
            </div>
            </fieldset>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-3xl bg-white/5 h-96 animate-pulse" />)}
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-24 text-slate-400" data-testid="browse-empty">{t("no_profiles", lang)}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {profiles.map(p => <ProfileCard key={p.id} p={p} onOpen={(p) => nav(`/profile/${p.id}`)} onLike={like} onGift={(p)=>open("gift",p)} onVideo={(p)=>open("video",p)} onDate={(p)=>open("date",p)} onMessage={()=>nav("/chats")} />)}
          </div>
        )}
      </div>

      <GiftModal open={modal==="gift"} onOpenChange={(v)=>!v&&setModal(null)} target={target}/>
      <VideoCallModal open={modal==="video"} onOpenChange={(v)=>!v&&setModal(null)} target={target}/>
      <InviteDateModal open={modal==="date"} onOpenChange={(v)=>!v&&setModal(null)} target={target}/>
    </div>
  );
}
