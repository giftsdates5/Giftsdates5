import React, { useEffect, useState, useRef } from "react";
import { api, fileUrl } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { CalendarHeart, Camera, Clock, Check, X, Car, Info, Coins } from "lucide-react";
import { MapsLink } from "../components/AddressPicker";
import AddressPicker from "../components/AddressPicker";

const STATUS_MAP = { escrow: "status_escrow", accepted: "status_accepted", confirmed: "status_confirmed", released: "status_released", cancelled: "status_cancelled", declined: "status_declined" };
const STATUS_COLOR = { escrow: "bg-amber-500/15 text-amber-300 border-amber-500/30", accepted: "bg-sky-500/15 text-sky-300 border-sky-500/30", confirmed: "bg-violet-500/15 text-violet-300 border-violet-500/30", released: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", cancelled: "bg-red-500/15 text-red-300 border-red-500/30", declined: "bg-red-500/15 text-red-300 border-red-500/30" };

export default function Dates() {
  const { lang, refreshUser, meta, user } = useApp();
  const pct = Math.round((meta?.cancel_refund_pct ?? 0.5) * 100);
  const [data, setData] = useState({ outgoing: [], incoming: [] });
  const [busyId, setBusyId] = useState(null);
  const [taxiFor, setTaxiFor] = useState(null); // { id, coins }
  const [meetFor, setMeetFor] = useState(null);
  const [meetLoc, setMeetLoc] = useState({});
  const inputRef = useRef();
  const uploadingFor = useRef(null);

  const load = () => api.get("/dates").then(r => setData(r.data));
  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, []);

  const cancel = async (b, isRecipient) => {
    const tcoins = b.taxi?.status === "sent" ? (b.taxi?.coins || 0) : 0;
    const base = b.coins + tcoins;
    if (isRecipient) {
      if (!window.confirm(t("cancel_recipient_warning", lang).replace("{total}", base))) return;
    } else {
      const r = Math.round(base * pct / 100), k = base - r;
      if (!window.confirm(t("cancel_warning", lang).replace("{p}", pct).replace("{r}", r).replace("{k}", k))) return;
    }
    setBusyId(b.id);
    try { const { data } = await api.post(`/dates/cancel/${b.id}`); await refreshUser(); await load(); toast.success(t("date_cancelled_partial", lang).replace("{r}", data.refund)); }
    catch (e) { const d = e.response?.data?.detail; toast.error(d === "CANCEL_LOCKED_24H" ? t("cancel_locked_24h", lang) : d || t("failed", lang)); }
    finally { setBusyId(null); }
  };

  const respond = async (id, accept) => {
    setBusyId(id);
    try { await api.post(`/dates/respond/${id}?accept=${accept}`); await refreshUser(); await load(); toast.success(t(accept ? "date_accepted_toast" : "date_declined_toast", lang)); }
    catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); }
    finally { setBusyId(null); }
  };

  const releaseHalf = async (id) => {
    if (!window.confirm(t("get_half_confirm", lang))) return;
    setBusyId(id);
    try { const { data } = await api.post(`/dates/release-half/${id}`); await refreshUser(); await load(); toast.success(t("half_released_toast", lang).replace("{n}", data.recipient)); }
    catch (e) { const d = e.response?.data?.detail; toast.error(d === "CLAIM_NOT_YET" ? t("claim_not_yet_24h", lang) : d === "DATE_NOT_YET" ? t("date_not_yet", lang) : d || t("failed", lang)); }
    finally { setBusyId(null); }
  };

  const requestTaxi = async (id, coins) => {
    if (!coins || coins < 1) { toast.error(t("fill_all", lang)); return; }
    setBusyId(id);
    try { await api.post(`/dates/taxi/request/${id}`, { coins: parseInt(coins) }); await load(); toast.success(t("taxi_requested_toast", lang)); setTaxiFor(null); }
    catch (e) { const d = e.response?.data?.detail; toast.error(d === "TAXI_PENDING" ? t("taxi_pending_err", lang) : d || t("failed", lang)); }
    finally { setBusyId(null); }
  };

  const sendTaxi = async (id) => {
    setBusyId(id);
    try { await api.post(`/dates/taxi/send/${id}`); await refreshUser(); await load(); toast.success(t("taxi_sent_toast", lang)); }
    catch (e) { toast.error(e.response?.data?.detail === "Insufficient coins" ? t("not_enough_coins", lang) : e.response?.data?.detail || t("failed", lang)); }
    finally { setBusyId(null); }
  };

  const declineTaxi = async (id) => {
    setBusyId(id);
    try { await api.post(`/dates/taxi/decline/${id}`); await load(); }
    catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); }
    finally { setBusyId(null); }
  };

  const shareMeet = async (id) => {
    if (!meetLoc.address) { toast.error(t("search_address", lang)); return; }
    setBusyId(id);
    try { await api.post(`/dates/meet-location/${id}`, { address: meetLoc.address, city: meetLoc.city || "", postal_code: meetLoc.postal_code || "", country: meetLoc.country || "", lat: meetLoc.lat ?? null, lng: meetLoc.lng ?? null }); await load(); toast.success(t("meet_location_shared_toast", lang)); setMeetFor(null); setMeetLoc({}); }
    catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); }
    finally { setBusyId(null); }
  };

  const startUpload = (bid) => { uploadingFor.current = bid; inputRef.current?.click(); };
  const handleFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const bid = uploadingFor.current;
    setBusyId(bid);
    try {
      const fd = new FormData(); fd.append("file", f);
      const up = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await api.post("/dates/confirm", { booking_id: bid, photo_url: up.data.path });
      await load();
      toast.success(t("photo_uploaded_unlock", lang));
    } catch (err) { const d = err.response?.data?.detail; toast.error(d === "DATE_NOT_YET" ? t("date_not_yet", lang) : d === "LOCATION_PENDING" ? t("location_pending_err", lang) : t("upload_failed", lang)); }
    finally { setBusyId(null); e.target.value = ""; }
  };

  const Row = ({ b, isIncoming }) => (
    <div className="glass rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center card-lift" data-testid={`date-row-${b.id}`}>
      {b.photo_url && <img src={fileUrl(b.photo_url)} alt="" className="w-full sm:w-24 h-24 rounded-xl object-cover"/>}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1"><CalendarHeart size={14} className="text-rose-400"/><span className="font-serif-luxe text-lg">{b.venue}</span></div>
        <div className="text-xs text-slate-400 flex items-center gap-2"><Clock size={11}/> {new Date(b.scheduled_at).toLocaleString()} · {b.city}</div>
        {(b.address || b.lat || b.postal_code) && <div className="text-xs text-slate-400 mt-0.5">{[b.address, b.postal_code, b.country].filter(Boolean).join(" · ")} <MapsLink loc={b} testid={`date-maps-link-${b.id}`} /></div>}
        {b.meet?.address && <div className="text-xs text-emerald-300 mt-0.5" data-testid={`meet-location-${b.id}`}>📍 {t("meet_location", lang)}: {[b.meet.address, b.meet.postal_code, b.meet.country].filter(Boolean).join(" · ")} <MapsLink loc={{ ...b.meet, venue: b.venue }} testid={`meet-maps-link-${b.id}`} /></div>}
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[b.status]}`}>{t(STATUS_MAP[b.status], lang)}</span>
          <span className="text-xs text-amber-300 font-mono-num">🪙 {b.coins}</span>
          {b.release_at && b.status === "confirmed" && <span className="text-xs text-slate-500">🔓 {t("unlocks_at", lang)}: {new Date(b.release_at).toLocaleString()}</span>}
        </div>
        {(() => {
          const taxi = b.taxi;
          const active = ["escrow", "accepted", "confirmed"].includes(b.status);
          if (isIncoming) {
            if (taxi?.status === "pending") return <div data-testid={`taxi-pending-${b.id}`} className="mt-2 text-xs text-amber-300 flex items-center gap-1"><Car size={12}/> {t("taxi_pending_recipient", lang)} · 🪙 {taxi.coins}</div>;
            if (taxi?.status === "sent") return (
              <div className="mt-2 text-xs" data-testid={`taxi-received-${b.id}`}>
                <div className="text-emerald-300 flex items-center gap-1"><Car size={12}/> {t("taxi_received", lang)} · 🪙 {taxi.coins}</div>
                {b.auto_confirmed && <div className="text-violet-300 mt-1 flex items-start gap-1" data-testid={`taxi-auto-confirm-note-${b.id}`}><Info size={11} className="mt-0.5 shrink-0"/> {t("taxi_auto_confirm_note", lang)}</div>}
              </div>
            );
            if (active && taxiFor?.id === b.id) return (
              <div className="mt-2 flex items-center gap-2" data-testid={`taxi-form-${b.id}`}>
                <Input data-testid={`taxi-coins-input-${b.id}`} type="number" min="1" value={taxiFor.coins} onChange={e => setTaxiFor({ ...taxiFor, coins: e.target.value })} placeholder={t("taxi_amount", lang)} className="bg-white/5 border-white/10 h-9 w-44" />
                <Button data-testid={`taxi-request-submit-${b.id}`} size="sm" disabled={busyId===b.id} onClick={() => requestTaxi(b.id, taxiFor.coins)} className="rose-btn text-white border-0 h-9">{t("request_taxi", lang)}</Button>
                <Button size="sm" variant="ghost" onClick={() => setTaxiFor(null)} className="text-slate-400 h-9">{t("cancel", lang)}</Button>
              </div>
            );
            if (active && (!taxi || taxi.status === "declined")) return <button data-testid={`taxi-request-btn-${b.id}`} onClick={() => setTaxiFor({ id: b.id, coins: "" })} className="mt-2 text-xs text-sky-300 hover:underline inline-flex items-center gap-1"><Car size={12}/> {t("request_taxi", lang)}</button>;
            return null;
          }
          if (taxi?.status === "pending") return (
            <div data-testid={`taxi-request-booker-${b.id}`} className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs">
              <div className="text-amber-300 flex items-center gap-1"><Car size={12}/> {t("taxi_pending_booker", lang)} · 🪙 {taxi.coins}</div>
              <div className="flex gap-2 mt-2">
                <Button data-testid={`taxi-send-btn-${b.id}`} size="sm" disabled={busyId===b.id} onClick={() => sendTaxi(b.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 h-8">{t("send_taxi", lang)} · 🪙 {taxi.coins}</Button>
                <Button data-testid={`taxi-decline-btn-${b.id}`} size="sm" variant="outline" disabled={busyId===b.id} onClick={() => declineTaxi(b.id)} className="bg-rose-500/10 border-rose-500/40 text-rose-300 h-8">{t("decline", lang)}</Button>
              </div>
            </div>
          );
          if (taxi?.status === "sent") return (
            <div className="mt-2 text-xs" data-testid={`taxi-sent-${b.id}`}>
              <div className="text-emerald-300 flex items-center gap-1"><Car size={12}/> {t("taxi_sent", lang)} · 🪙 {taxi.coins}</div>
              {b.auto_confirmed && <div className="text-violet-300 mt-1 flex items-start gap-1" data-testid={`taxi-auto-confirm-note-booker-${b.id}`}><Info size={11} className="mt-0.5 shrink-0"/> {t("taxi_auto_confirm_note", lang)}</div>}
            </div>
          );
          return null;
        })()}
        {isIncoming && b.vip && b.place === "own" && ["escrow", "accepted", "confirmed"].includes(b.status) && (
          <div className="mt-2" data-testid={`meet-share-block-${b.id}`}>
            {meetFor === b.id ? (
              <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
                <div className="text-[11px] text-emerald-200">{t("share_meet_location", lang)}</div>
                <AddressPicker value={meetLoc} onChange={setMeetLoc} />
                <div className="flex gap-2">
                  <Button data-testid={`meet-share-submit-${b.id}`} size="sm" disabled={busyId===b.id} onClick={() => shareMeet(b.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 h-8">{t("send", lang)}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setMeetFor(null); setMeetLoc({}); }} className="text-slate-400 h-8">{t("cancel", lang)}</Button>
                </div>
              </div>
            ) : (
              <button data-testid={`meet-share-btn-${b.id}`} onClick={() => { setMeetFor(b.id); setMeetLoc(b.meet || {}); }} className="text-xs text-emerald-300 hover:underline inline-flex items-center gap-1">📍 {b.meet ? t("update_meet_location", lang) : t("share_meet_location", lang)}</button>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {isIncoming && b.status === "escrow" && (
          <>
            <Button data-testid={`date-accept-btn-${b.id}`} disabled={busyId===b.id} onClick={() => respond(b.id, true)} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"><Check size={14} className="me-1"/> {t("accept", lang)}</Button>
            <Button data-testid={`date-decline-btn-${b.id}`} disabled={busyId===b.id} onClick={() => respond(b.id, false)} variant="outline" className="bg-rose-500/10 border-rose-500/40 text-rose-300 hover:bg-rose-500/20"><X size={14} className="me-1"/> {t("decline", lang)}</Button>
          </>
        )}
        {isIncoming && (b.status === "accepted" || (b.status === "confirmed" && !b.photo_url)) && (() => {
          const sched = new Date(b.scheduled_at), nowD = new Date();
          const metStarted = nowD >= sched;
          const after24 = nowD >= new Date(sched.getTime() + 24 * 3600 * 1000);
          return (
            <div className="flex flex-col gap-1.5" data-testid={`date-confirm-block-${b.id}`}>
              <div className="flex gap-2 flex-wrap">
                <Button data-testid={`date-confirm-btn-${b.id}`} disabled={busyId===b.id || !metStarted} title={!metStarted ? t("date_not_yet", lang) : ""} onClick={() => startUpload(b.id)} className="rose-btn text-white border-0"><Camera size={14} className="me-1"/> {t("confirm_photo", lang)}</Button>
                <Button data-testid={`date-release-half-btn-${b.id}`} disabled={busyId===b.id || !after24} title={!after24 ? t("claim_not_yet_24h", lang) : ""} onClick={() => releaseHalf(b.id)} variant="outline" className="gold-btn disabled:opacity-50"><Coins size={14} className="me-1"/> {t("get_half_now", lang)}</Button>
              </div>
              <span data-testid={`date-photo-note-${b.id}`} className="text-[11px] text-amber-300/85 flex items-start gap-1"><Info size={11} className="mt-0.5 shrink-0"/> {t("no_photo_half_note", lang)}</span>
            </div>
          );
        })()}
        {!isIncoming && (b.status === "escrow" || b.status === "accepted" || (b.status === "confirmed" && b.auto_confirmed)) && (() => {
          const sched = new Date(b.scheduled_at), lockEnd = new Date(sched.getTime() + 24 * 3600 * 1000), nowD = new Date();
          const locked = nowD >= sched && nowD < lockEnd;
          return (
            <div className="flex flex-col items-start gap-1">
              <Button data-testid={`date-cancel-btn-${b.id}`} disabled={busyId===b.id || locked} title={locked ? t("cancel_locked_24h", lang) : ""} onClick={() => cancel(b, false)} variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 disabled:opacity-50">{t("cancel", lang)}</Button>
              <span data-testid={`date-cancel-note-${b.id}`} className={`text-[11px] ${locked ? "text-rose-300/90" : "text-amber-300/80"}`}>{locked ? `🔒 ${t("cancel_locked_24h", lang)}` : `⚠️ ${t("cancel_note", lang).replace("{p}", pct)}`}</span>
            </div>
          );
        })()}
        {isIncoming && (b.status === "accepted" || (b.status === "confirmed" && b.auto_confirmed)) && (
          <div className="flex flex-col items-start gap-1">
            <Button data-testid={`date-recipient-cancel-btn-${b.id}`} disabled={busyId===b.id} onClick={() => cancel(b, true)} variant="outline" className="bg-rose-500/10 border-rose-500/40 text-rose-300 hover:bg-rose-500/20"><X size={14} className="me-1"/> {t("cancel_meeting", lang)}</Button>
            <span data-testid={`date-recipient-cancel-note-${b.id}`} className="text-[11px] text-violet-300/90">↩️ {t("cancel_recipient_note", lang)}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)]">
      <input ref={inputRef} data-testid="photo-verification-upload-input" type="file" accept="image/*" onChange={handleFile} className="hidden"/>
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <h1 className="font-serif-luxe text-4xl">{t("dates", lang)}</h1>
        <p className="text-xs text-slate-400 -mt-4">{t("photo_hint", lang)}</p>

        <section>
          <h2 className="text-sm font-mono uppercase tracking-widest text-rose-400 mb-3">{t("incoming_dates", lang)}</h2>
          {data.incoming.length === 0 ? <div className="glass rounded-xl p-6 text-sm text-slate-500">{t("none", lang)}</div> : <div className="space-y-3">{data.incoming.map(b => <Row key={b.id} b={b} isIncoming/>)}</div>}
        </section>
        <section>
          <h2 className="text-sm font-mono uppercase tracking-widest text-violet-400 mb-3">{t("outgoing_dates", lang)}</h2>
          {data.outgoing.length === 0 ? <div className="glass rounded-xl p-6 text-sm text-slate-500">{t("none", lang)}</div> : <div className="space-y-3">{data.outgoing.map(b => <Row key={b.id} b={b}/>)}</div>}
        </section>
      </div>
    </div>
  );
}
