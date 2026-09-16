import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Heart, Gift, Video, CalendarHeart, MapPin, Crown, MessageCircle, BadgeCheck, Trophy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { api, fileUrl } from "../lib/api";
import { useApp } from "../context/AppContext";
import { LANGUAGES, t } from "../lib/i18n";
import { optLabel } from "../components/ProfileDetailsForm";
import GiftModal from "../components/GiftModal";
import { ReportModal } from "../components/ReportModal";
import VipSection from "../components/VipSection";
import { GiftPremiumModal } from "../components/GiftPremiumModal";
import { Crown as CrownGift } from "lucide-react";
import { Flag } from "lucide-react";
import { presence, PresenceDot } from "../lib/presence";
const FALLBACKS = ["https://images.unsplash.com/photo-1581841064838-a470c740e8ee?crop=entropy&cs=srgb&fm=jpg&q=85&w=200", "https://images.unsplash.com/photo-1545996124-0501ebae84d0?crop=entropy&cs=srgb&fm=jpg&q=85&w=200", "https://images.unsplash.com/photo-1601117830731-1a36c879f666?crop=entropy&cs=srgb&fm=jpg&q=85&w=200"];
import VideoCallModal from "../components/VideoCallModal";
import DateBookingModal from "../components/DateBookingModal";
import InviteDateModal from "../components/InviteDateModal";

const FALLBACK_WOMAN = "https://images.unsplash.com/photo-1581841064838-a470c740e8ee?crop=entropy&cs=srgb&fm=jpg&q=85&w=900";
const FALLBACK_MAN = "https://images.unsplash.com/photo-1545996124-0501ebae84d0?crop=entropy&cs=srgb&fm=jpg&q=85&w=900";
const genderFallback = (g) => (String(g || "").toLowerCase().startsWith("m") ? FALLBACK_MAN : FALLBACK_WOMAN);
const FALLBACK = FALLBACK_WOMAN;

function Row({ label, value, testid }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-white/5 text-sm" data-testid={testid}>
      <span className="text-slate-400">{label}</span><span className="text-right">{value}</span>
    </div>
  );
}

export default function ProfileView() {
  const { id } = useParams();
  const { lang, user, meta } = useApp();
  const nav = useNavigate();
  const location = useLocation();
  const previewGuest = new URLSearchParams(location.search).get("preview") === "guest";
  const [p, setP] = useState(null);
  const [idx, setIdx] = useState(0);
  const [modal, setModal] = useState(null);

  const load = () => api.get(`/profiles/${id}`).then(r => setP(r.data)).catch(() => { toast.error(t("failed_load", lang)); nav("/browse"); });
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const like = async () => {
    try {
      const { data } = await api.post("/likes", { target_id: p.id });
      toast.success(data.matched ? `💘 ${t("match", lang)} · ${p.name}` : `💗 ${t("liked", lang)}`);
      load();
    } catch (e) {
      const d = e.response?.data?.detail || "";
      if (d.startsWith("LIKE_LIMIT:")) toast.error(t("like_limit_reached", lang).replace("{n}", d.split(":")[1]), { duration: 6000, action: { label: t("premium", lang), onClick: () => nav("/wallet?premium=1") } });
      else toast.error(t("failed", lang));
    }
  };

  if (!p) return <div className="aurora-bg min-h-[calc(100vh-4rem)]" />;
  const isSelf = user?.id === p.id;
  const fb = genderFallback(p.gender);
  const photos = p.photos?.length ? p.photos.map(fileUrl) : [fb];
  const langNames = (p.languages_spoken || []).map(c => LANGUAGES.find(l => l.code === c)?.name || c).join(", ");

  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)]" data-testid="profile-view-page">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button data-testid="profile-view-back" onClick={() => nav(-1)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"><ArrowLeft size={16} /> {t("back", lang)}</button>
        <div className="grid lg:grid-cols-[minmax(0,420px)_1fr] gap-8">
          <div>
            <div className={`relative aspect-[3/4] rounded-3xl overflow-hidden border ${p.is_vip ? "border-red-500/50" : p.is_premium ? "border-amber-400/50" : p.is_premium_lite ? "border-sky-400/50" : "border-white/10"}`}>
              <img data-testid="profile-view-main-photo" src={photos[Math.min(idx, photos.length - 1)]} alt={p.name} onError={(e) => { e.currentTarget.src = fb; }} className="w-full h-full object-cover" />
              {p.is_vip ? (
                <span data-testid="profile-view-vip-badge" className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/90 text-white text-[10px] font-semibold uppercase"><Crown size={10} className="fill-white" /> VIP</span>
              ) : p.is_premium ? (
                <span data-testid="profile-view-premium-badge" className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-[10px] font-semibold uppercase"><Crown size={10} /> {t("premium", lang)}</span>
              ) : p.is_premium_lite ? (
                <span data-testid="profile-view-lite-badge" className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/90 text-white text-[10px] font-semibold uppercase"><Crown size={10} className="fill-white" /> {t("premium_lite", lang)}</span>
              ) : null}
            </div>
            {photos.length > 1 && (
              <div className="grid grid-cols-6 gap-2 mt-3" data-testid="profile-view-thumbs">
                {photos.map((src, i) => <button key={i} data-testid={`profile-view-thumb-${i}`} onClick={() => setIdx(i)} className={`aspect-[3/4] rounded-lg overflow-hidden border ${i === idx ? "border-rose-400" : "border-white/10 opacity-70 hover:opacity-100"}`}><img src={src} alt="" className="w-full h-full object-cover" /></button>)}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="font-serif-luxe text-4xl sm:text-5xl flex items-center gap-3" data-testid="profile-view-name">{p.name}, {p.age} {p.verified && <BadgeCheck className="text-amber-300" size={24} />}</h1>
              <p className="text-slate-400 flex items-center gap-1 mt-1"><MapPin size={14} /> {p.city}, {p.country} {p.last_seen && <span className="ms-2 inline-flex items-center gap-1.5 text-xs" data-testid="profile-view-presence"><PresenceDot u={p} lang={lang} />{presence(p, lang).label}</span>}</p>
              {(Array.isArray(p.relationship_intent) ? p.relationship_intent : (p.relationship_intent ? [p.relationship_intent] : [])).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2" data-testid="profile-view-intent">
                  {(Array.isArray(p.relationship_intent) ? p.relationship_intent : [p.relationship_intent]).map(iv => (
                    <span key={iv} className="inline-block px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-sm text-rose-200">{optLabel("relationship_intent", iv, lang)}</span>
                  ))}
                </div>
              )}
            </div>

            {isSelf && (
              <div data-testid="profile-view-preview-badge" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/15 text-xs text-slate-300 w-fit">{previewGuest ? <EyeOff size={13} /> : <Eye size={13} />} {t(previewGuest ? "preview_nonvip_note" : "preview_mode_note", lang)}</div>
            )}
            {!isSelf && (
            <button data-testid="profile-view-report-button" onClick={() => setModal("report")} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-300 transition-colors">
              <Flag size={13} /> Report this user
            </button>
            )}
            {!p.vip_listing && !isSelf && (<>
            <button data-testid="profile-view-gift-premium-button" onClick={() => setModal("giftpremium")} className="ms-4 inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 transition-colors">
              <CrownGift size={13} /> {t("gift_premium", lang)}
            </button>

            <div className="flex flex-wrap gap-2">
              <Button data-testid="profile-view-like-button" onClick={like} disabled={p.liked_by_me} className="rose-btn text-white border-0 h-11"><Heart size={16} className="me-1 fill-white" /> {p.liked_by_me ? t("liked", lang) : t("like", lang)}</Button>
              {p.conversation_id && <Button data-testid="profile-view-chat-button" onClick={() => nav("/chats")} variant="outline" className="h-11 bg-white/5 border-white/15"><MessageCircle size={16} className="me-1" /> {t("open_chat", lang)}</Button>}
              <Button data-testid="profile-view-gift-button" onClick={() => setModal("gift")} variant="outline" className="h-11 bg-amber-500/10 border-amber-500/40 text-amber-300"><Gift size={16} className="me-1" /> {t("gift", lang)}</Button>
              <Button data-testid="profile-view-video-button" onClick={() => setModal("video")} variant="outline" className="h-11 bg-violet-500/10 border-violet-500/40 text-violet-300"><Video size={16} className="me-1" /> {t("video_call", lang)}{p.video_rate ? <span className="ms-2 font-mono-num" data-testid="profile-view-video-rate">🪙 {p.video_rate}/{t("minutes", lang)}</span> : null}</Button>
              <Button data-testid="profile-view-date-button" onClick={() => setModal("date")} variant="outline" className="h-11 bg-white/5 border-white/15"><CalendarHeart size={16} className="me-1" /> Invite on a Date{p.date_price ? <span className="ms-2 font-mono-num text-amber-300" data-testid="profile-view-date-price">🪙 {p.date_price}</span> : null}</Button>
            </div>

            {meta?.gift_auto_match_coins && (
              <div data-testid="profile-view-auto-match-note" className="flex items-start gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 text-xs text-violet-200">
                <Gift size={14} className="mt-0.5 shrink-0 text-violet-300" />
                <span>{t("gift_auto_match_hint", lang).replace("{n}", meta.gift_auto_match_coins)}</span>
              </div>
            )}
            </>)}

            {p.vip_listing && (
              <div data-testid="profile-view-vip-listing-badge" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-xs text-red-200 w-fit">
                <Crown size={13} className="fill-red-500 text-red-500" /> {t("vip_listing_badge", lang)}
              </div>
            )}

            {p.bio && <div className="glass rounded-2xl p-5"><h3 className="font-serif-luxe text-xl mb-2">{t("about_me", lang)}</h3><p className="text-sm text-slate-300 whitespace-pre-line" data-testid="profile-view-bio">{p.bio}</p></div>}

            {p.gifts_count > 0 && (
              <div className="glass rounded-2xl p-5" data-testid="profile-view-top-givers">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif-luxe text-xl flex items-center gap-2"><Trophy size={18} className="text-amber-300" /> {t("top_givers", lang)}</h3>
                  <span className="text-xs text-slate-400">{t("gifts_received_total", lang)}: <span data-testid="profile-view-gifts-total" className="font-mono-num text-amber-300">🪙 {p.gifts_total}</span> · {p.gifts_count}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {p.top_givers.map((g, i) => (
                    <button key={g.id} data-testid={`top-giver-${g.id}`} onClick={() => nav(`/profile/${g.id}`)} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center hover:bg-white/10 transition-colors">
                      <div className="relative inline-block">
                        <img src={g.photo || FALLBACKS[i]} alt="" className={`w-14 h-14 rounded-full object-cover mx-auto border-2 ${["border-amber-400", "border-slate-300", "border-amber-700"][i]}`} />
                        <span className="absolute -top-1 -right-1 text-base">{["🥇", "🥈", "🥉"][i]}</span>
                      </div>
                      <div className="text-sm mt-2 truncate">{g.name}</div>
                      <div className="text-xs font-mono-num text-amber-300">🪙 {g.total}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(p.job_title || p.height || p.weight || p.income || p.religion || langNames || p.hobbies?.length > 0 || p.orientation || p.gender) && (
            <div className="glass rounded-2xl p-5" data-testid="profile-view-details">
              <h3 className="font-serif-luxe text-xl mb-2">{t("details", lang)}</h3>
              <Row label={t("gender", lang)} value={optLabel("gender", p.gender, lang)} testid="pv-gender" />
              <Row label={t("orientation", lang)} value={optLabel("orientation", p.orientation, lang)} testid="pv-orientation" />
              <Row label={t("job_title", lang)} value={p.job_title} testid="pv-job" />
              <Row label={t("height", lang)} value={p.height && `${p.height} cm`} testid="pv-height" />
              <Row label={t("weight", lang)} value={p.weight && `${p.weight} kg`} testid="pv-weight" />
              <Row label={t("income", lang)} value={p.income === "custom" ? p.income_custom : optLabel("income", p.income, lang)} testid="pv-income" />
              <Row label={t("religion", lang)} value={optLabel("religion", p.religion, lang)} testid="pv-religion" />
              <Row label={t("languages_spoken", lang)} value={langNames} testid="pv-langs" />
              {p.hobbies?.length > 0 && <div className="pt-3"><div className="text-xs text-slate-400 mb-2">{t("hobbies", lang)}</div><div className="flex flex-wrap gap-1.5" data-testid="pv-hobbies">{p.hobbies.map(h => <span key={h} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs">{h}</span>)}</div></div>}
            </div>
            )}

            {(p.kids || p.smoking || p.drinking) && (
              <div className="glass rounded-2xl p-5" data-testid="profile-view-lifestyle">
                <h3 className="font-serif-luxe text-xl mb-2">{t("lifestyle", lang)}</h3>
                <Row label={t("kids", lang)} value={optLabel("kids", p.kids, lang)} testid="pv-kids" />
                <Row label={t("smoking", lang)} value={optLabel("smoking", p.smoking, lang)} testid="pv-smoking" />
                <Row label={t("drinking", lang)} value={optLabel("drinking", p.drinking, lang)} testid="pv-drinking" />
              </div>
            )}
            {(p.bust_size || p.penis_size) && (
              <div className="glass rounded-2xl p-5 border border-rose-500/20" data-testid="profile-view-intimate">
                <h3 className="font-serif-luxe text-xl mb-2">{t("intimate", lang)}</h3>
                <Row label={t("bust_size", lang)} value={p.bust_size} testid="pv-bust" />
                <Row label={t("penis_size", lang)} value={optLabel("penis_size", p.penis_size, lang)} testid="pv-penis" />
              </div>
            )}
          </div>
        </div>
      </div>
      <GiftModal open={modal === "gift"} onOpenChange={(v) => !v && setModal(null)} target={p} />
      <VideoCallModal open={modal === "video"} onOpenChange={(v) => !v && setModal(null)} target={p} />
      <InviteDateModal open={modal === "date"} onOpenChange={(v) => !v && setModal(null)} target={p} />
      <ReportModal open={modal === "report"} onOpenChange={(v) => !v && setModal(null)} target={p} />
      <GiftPremiumModal open={modal === "giftpremium"} onOpenChange={(v) => !v && setModal(null)} target={p} />
      <div className="max-w-5xl mx-auto px-4"><VipSection userId={p.id} name={p.name} preview={previewGuest ? "nonvip" : undefined} /></div>
    </div>
  );
}
