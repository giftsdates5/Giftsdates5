import React, { useState } from "react";
import { Crown, Plus, X, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { api, fileUrl } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { VIP_CATEGORIES, VIP_PLACES, PRICE_KEYS, svcLabel, catTitle, placeLabel, priceLabel } from "../lib/vipCatalog";
import CountrySelect from "./CountrySelect";
import CityField from "./CityField";

export default function VipEditor() {
  const { user, refreshUser, lang } = useApp();
  const nav = useNavigate();
  const isVip = user?.is_vip || (user?.vip_until && new Date(user.vip_until) > new Date());
  const v = user?.vip || {};
  const [services, setServices] = useState(v.services || []);
  const [prices, setPrices] = useState(v.prices || { hour: "", h2: "", h3: "" });
  const [places, setPlaces] = useState(v.places || []);
  const [wants, setWants] = useState(v.client_wants || "");
  const [slots, setSlots] = useState(v.availability || []);
  const [ns, setNs] = useState({ date: "", from: "18:00", to: "23:00" });
  const [photos, setPhotos] = useState(v.photos || []);
  const [privatePhotos, setPrivatePhotos] = useState(v.private_photos || []);
  const [nickname, setNickname] = useState(v.nickname || "");
  const [postMode, setPostMode] = useState(v.post_mode === "separate" ? "separate" : "together");
  const [sepAge, setSepAge] = useState(v.age || "");
  const [sepCity, setSepCity] = useState(v.city || "");
  const [sepCountry, setSepCountry] = useState(v.country || "");
  const [sepGender, setSepGender] = useState(v.gender || "");
  const [sepBio, setSepBio] = useState(v.bio || "");
  const [showOnMain, setShowOnMain] = useState(v.show_on_main !== false);
  const [published, setPublished] = useState(v.published !== false);
  const [busy, setBusy] = useState(false);
  const photoRef = React.useRef(null);
  const privateRef = React.useRef(null);
  const goBuyVip = () => { toast.info(t("vip_upsell", lang)); nav("/wallet?vip=1"); };
  const addPhoto = async (e, isPrivate = false) => {
    const f = e.target.files?.[0]; if (!f) return;
    const list = isPrivate ? privatePhotos : photos;
    if (list.length >= 12) { toast.error(t("vip_max_photos", lang)); return; }
    const fd = new FormData(); fd.append("photo", f);
    try {
      const { data } = await api.post(`/vip/photo?private=${isPrivate}`, fd);
      setPhotos(data.photos); setPrivatePhotos(data.private_photos);
    }
    catch (er) { toast.error(er.response?.data?.detail === "MAX_PHOTOS" ? t("vip_max_photos", lang) : "Ошибка"); }
    finally { const ref = isPrivate ? privateRef : photoRef; if (ref.current) ref.current.value = ""; }
  };
  const delPhoto = async (p, isPrivate = false) => {
    try { const { data } = await api.delete(`/vip/photo?path=${encodeURIComponent(p)}&private=${isPrivate}`); setPhotos(data.photos); setPrivatePhotos(data.private_photos); } catch { toast.error("Ошибка"); }
  };
  const makeCover = async (p) => {
    const reordered = [p, ...photos.filter((x) => x !== p)];
    setPhotos(reordered);
    try { await api.post("/vip/photos/reorder", { photos: reordered }); toast.success(t("vip_cover_updated", lang)); } catch { toast.error("Ошибка"); }
  };

  const toggle = (arr, set, val) => set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  const addSlot = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ns.date) || ns.from >= ns.to) { toast.error("Укажите дату и корректное время"); return; }
    setSlots([...slots, { ...ns }].sort((a, b) => (a.date + a.from).localeCompare(b.date + b.from)));
  };
  const onTogglePublish = (val) => {
    if (!isVip) { goBuyVip(); return; }
    setPublished(val);
  };
  const save = async () => {
    setBusy(true);
    try {
      await api.put("/vip/profile", {
        services, places, client_wants: wants,
        price_hour: Number(prices.hour) || 0, price_2h: Number(prices.h2) || 0, price_3h: Number(prices.h3) || 0,
        availability: slots, published: isVip ? published : false,
        nickname, post_mode: postMode,
        age: Number(sepAge) || null, city: sepCity, country: sepCountry, gender: sepGender, bio: sepBio,
        show_on_main: showOnMain,
      });
      await refreshUser();
      toast.success(t("vip_saved_toast", lang));
    } catch (e) { toast.error(e.response?.data?.detail || "Ошибка"); } finally { setBusy(false); }
  };

  return (
    <div className="glass rounded-2xl p-6 mb-6 border border-rose-500/30 space-y-5" data-testid="vip-editor">
      <div className={`rounded-2xl p-4 border ${isVip ? "border-amber-500/30 bg-amber-500/5" : "border-amber-500/40 bg-amber-500/10"}`} data-testid="vip-publish-box">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Crown className="text-amber-300 shrink-0" size={22} />
            <div>
              <div className="text-sm font-semibold text-amber-100">{t("vip_publish_toggle", lang)}</div>
              <div className="text-xs text-slate-400">{isVip ? (published ? t("vip_live", lang) : t("vip_hidden", lang)) : t("vip_preview_note", lang)}</div>
            </div>
          </div>
          <Switch data-testid="vip-publish-switch" checked={isVip && published} onCheckedChange={onTogglePublish} />
        </div>
        {!isVip && (
          <Button data-testid="vip-buy-publish-cta" onClick={goBuyVip} className="rose-btn text-white border-0 mt-3 w-full sm:w-auto"><Sparkles size={16} className="me-1" /> {t("vip_buy_publish", lang)}</Button>
        )}
      </div>

      <h2 className="font-serif-luxe text-2xl gold-text flex items-center gap-2"><Crown size={22} className="text-amber-300" /> {t("vip_editor_title", lang)}</h2>
      <p className="text-xs text-slate-400">{t("vip_editor_note", lang)}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-amber-200">{t("vip_nickname", lang)}</label>
          <Input data-testid="vip-nickname-input" value={nickname} maxLength={40} onChange={(e) => setNickname(e.target.value)} placeholder={t("vip_nickname_ph", lang)} className="bg-white/5 border-white/10 mt-1" />
          <p className="text-[11px] text-slate-500 mt-1 flex items-start gap-1"><Lock size={11} className="mt-0.5 shrink-0 text-amber-300" /> {t("vip_nickname_note", lang)}</p>
        </div>
        <div>
          <label className="text-sm font-semibold text-amber-200">{t("vip_post_mode", lang)}</label>
          <div className="mt-1 grid grid-cols-2 gap-2" data-testid="vip-post-mode">
            {[{ v: "together", l: "vip_post_together" }, { v: "separate", l: "vip_post_separate" }].map((o) => (
              <button key={o.v} type="button" data-testid={`vip-post-mode-${o.v}`} onClick={() => setPostMode(o.v)}
                className={`text-xs px-3 py-2 rounded-lg border transition-colors ${postMode === o.v ? "bg-amber-500/20 border-amber-500/50 text-amber-200" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>{t(o.l, lang)}</button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{t("vip_post_mode_note", lang)}</p>
        </div>
      </div>

      {postMode === "separate" && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-4" data-testid="vip-separate-block">
          <div className="flex items-start gap-2 text-[11px] text-amber-200/90">
            <Lock size={13} className="mt-0.5 shrink-0 text-amber-300" />
            <span>{t("vip_separate_intro", lang)}</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400">{t("age", lang)}</label>
              <Input data-testid="vip-sep-age" type="number" min="18" max="99" value={sepAge} onChange={(e) => setSepAge(e.target.value)} className="bg-white/5 border-white/10 mt-1 font-mono-num" />
            </div>
            <div>
              <label className="text-xs text-slate-400">{t("country", lang)}</label>
              <CountrySelect testid="vip-sep-country" value={sepCountry} onChange={setSepCountry} lang={lang} />
            </div>
            <div>
              <label className="text-xs text-slate-400">{t("city", lang)}</label>
              <CityField testid="vip-sep-city" value={sepCity} onChange={setSepCity} lang={lang} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">{t("gender", lang)}</label>
            <div className="mt-1 flex flex-wrap gap-2" data-testid="vip-sep-gender">
              {["female", "male", "trans_woman", "trans_man", "non_binary"].map((g) => (
                <button key={g} type="button" data-testid={`vip-sep-gender-${g}`} onClick={() => setSepGender(g)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${sepGender === g ? "bg-amber-500/20 border-amber-500/50 text-amber-200" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>{t(g, lang)}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">{t("vip_separate_bio", lang)}</label>
            <Textarea data-testid="vip-sep-bio" rows={2} maxLength={1000} value={sepBio} onChange={(e) => setSepBio(e.target.value)} placeholder={t("vip_separate_bio_ph", lang)} className="bg-white/5 border-white/10 mt-1" />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
            <div>
              <div className="text-sm font-semibold text-amber-100">{t("vip_show_on_main", lang)}</div>
              <div className="text-[11px] text-slate-400">{t("vip_show_on_main_note", lang)}</div>
            </div>
            <Switch data-testid="vip-show-on-main-switch" checked={showOnMain} onCheckedChange={setShowOnMain} />
          </div>
        </div>
      )}


      <div data-testid="vip-photos">
        <div className="text-sm font-semibold text-amber-200 mb-2">{t("vip_public_photos", lang)}</div>
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p} className="relative w-20 h-20 rounded-lg overflow-hidden gold-hairline group">
              <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
              {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-amber-500/80 text-[9px] text-black text-center">{t("vip_cover", lang)}</span>}
              {i !== 0 && <button data-testid="vip-photo-cover" onClick={() => makeCover(p)} className="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] text-amber-200 text-center opacity-0 group-hover:opacity-100">{t("vip_make_cover", lang)}</button>}
              <button data-testid="vip-photo-del" onClick={() => delPhoto(p, false)} className="absolute top-0 right-0 bg-black/70 text-rose-300 p-0.5"><X size={12} /></button>
            </div>
          ))}
          {photos.length < 12 && (
            <>
              <input ref={photoRef} data-testid="vip-photo-input" type="file" accept="image/*" onChange={(e) => addPhoto(e, false)} className="hidden" id="vip-photo" />
              <label htmlFor="vip-photo" className="w-20 h-20 rounded-lg border-2 border-dashed border-amber-400/50 flex items-center justify-center text-amber-300 cursor-pointer hover:bg-white/5"><Plus size={20} /></label>
            </>
          )}
        </div>
      </div>

      <div data-testid="vip-private-photos">
        <div className="text-sm font-semibold text-rose-200 mb-1 flex items-center gap-1.5"><Lock size={14} className="text-rose-300" /> {t("vip_private_photos", lang)}</div>
        <p className="text-[11px] text-slate-500 mb-2">{t("vip_private_photos_note", lang)}</p>
        <div className="flex flex-wrap gap-2">
          {privatePhotos.map((p) => (
            <div key={p} className="relative w-20 h-20 rounded-lg overflow-hidden border border-rose-500/40 group">
              <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
              <button data-testid="vip-private-photo-del" onClick={() => delPhoto(p, true)} className="absolute top-0 right-0 bg-black/70 text-rose-300 p-0.5"><X size={12} /></button>
            </div>
          ))}
          {privatePhotos.length < 12 && (
            <>
              <input ref={privateRef} data-testid="vip-private-photo-input" type="file" accept="image/*" onChange={(e) => addPhoto(e, true)} className="hidden" id="vip-private-photo" />
              <label htmlFor="vip-private-photo" className="w-20 h-20 rounded-lg border-2 border-dashed border-rose-400/50 flex items-center justify-center text-rose-300 cursor-pointer hover:bg-white/5"><Plus size={20} /></label>
            </>
          )}
        </div>
      </div>

      {VIP_CATEGORIES.map((cat) => (
        <div key={cat.key} data-testid={`vip-cat-${cat.key}`}>
          <div className="text-sm font-semibold text-amber-200 mb-2">{catTitle(cat.key, lang)}</div>
          <div className="flex flex-wrap gap-2">
            {cat.items.map((it) => (
              <button key={it} data-testid={`vip-svc-${it}`} onClick={() => toggle(services, setServices, it)}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${services.includes(it) ? "bg-rose-500/20 border-rose-500/50 text-rose-200" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>{svcLabel(it, lang)}</button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <div className="text-sm font-semibold text-amber-200 mb-2">{t("vip_prices", lang)}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRICE_KEYS.map((p) => (
            <div key={p.k}>
              <label className="text-xs text-slate-400">{priceLabel(p.k, lang)}</label>
              <Input data-testid={`vip-price-${p.k}`} type="number" min="0" step="50" value={prices[p.k] ?? ""} onChange={(e) => setPrices({ ...prices, [p.k]: e.target.value })} className="bg-white/5 border-white/10 mt-1 font-mono-num" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-amber-200 mb-2">{t("vip_place", lang)}</div>
        <div className="flex gap-2 flex-wrap">
          {VIP_PLACES.map((p) => (
            <button key={p.v} data-testid={`vip-place-${p.v}`} onClick={() => toggle(places, setPlaces, p.v)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${places.includes(p.v) ? "bg-amber-500/20 border-amber-500/50 text-amber-200" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>{placeLabel(p.v, lang)}</button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-amber-200 mb-2">{t("vip_calendar", lang)}</div>
        <div className="flex flex-wrap items-end gap-2 mb-2">
          <Input data-testid="vip-slot-date" type="date" value={ns.date} onChange={(e) => setNs({ ...ns, date: e.target.value })} className="bg-white/5 border-white/10 w-40" />
          <Input data-testid="vip-slot-from" type="time" value={ns.from} onChange={(e) => setNs({ ...ns, from: e.target.value })} className="bg-white/5 border-white/10 w-28" />
          <span className="text-slate-500">–</span>
          <Input data-testid="vip-slot-to" type="time" value={ns.to} onChange={(e) => setNs({ ...ns, to: e.target.value })} className="bg-white/5 border-white/10 w-28" />
          <Button data-testid="vip-slot-add" onClick={addSlot} variant="outline" className="bg-white/5 border-white/15"><Plus size={15} /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {slots.map((s, i) => (
            <span key={i} data-testid={`vip-slot-${i}`} className="text-xs bg-white/5 gold-hairline rounded-lg px-2.5 py-1 flex items-center gap-2 text-slate-200">
              {s.date} · {s.from}–{s.to}
              <button onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="text-rose-300"><X size={12} /></button>
            </span>
          ))}
          {slots.length === 0 && <span className="text-xs text-slate-500">{t("vip_no_slots", lang)}</span>}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-amber-200 mb-2">{t("vip_wants", lang)}</div>
        <Textarea data-testid="vip-wants" rows={3} maxLength={1000} value={wants} onChange={(e) => setWants(e.target.value)} placeholder={t("vip_wants_ph", lang)} className="bg-white/5 border-white/10" />
      </div>

      <Button data-testid="vip-save" onClick={save} disabled={busy} className="rose-btn text-white border-0 h-11 w-full">{busy ? "…" : t("vip_save_btn", lang)}</Button>
    </div>
  );
}
