import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CalendarHeart, MapPin, Clock, Coins, ShieldAlert, Flag, Camera, Car, Check, X, MessageCircle, Send, CalendarPlus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api, fileUrl } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import AddressPicker, { MapsLink } from "../components/AddressPicker";
import LegacyDates from "./Dates";

const FALLBACK = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80";
const TERMINAL = ["COMPLETED", "COMPLETED_AUTO", "CANCELLED", "CANCELLED_TRANSPORTATION", "REFUNDED"];
const CHAT_STATUSES = ["DATE_CONFIRMED", "DATE_COMPLETED_PENDING_VERIFICATION", "PHOTO_VERIFICATION_PENDING", "COMPLETED", "COMPLETED_AUTO", "REPORTED", "UNDER_ADMIN_REVIEW"];

function DateChat({ did, meId, lang }) {
  const tr = (k) => t(k, lang);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = React.useRef(null);
  const load = useCallback(() => { api.get(`/invites/${did}/messages`).then(r => setMsgs(r.data.messages || [])).catch(() => {}); }, [did]);
  useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  const send = async () => {
    const t2 = text.trim(); if (!t2) return;
    setBusy(true);
    try { const r = await api.post(`/invites/${did}/messages`, { text: t2 }); setMsgs(m => [...m, r.data.message]); setText(""); }
    catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); }
    finally { setBusy(false); }
  };
  return (
    <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3" data-testid={`date-chat-${did}`}>
      <div className="text-xs font-semibold text-sky-200 mb-2 flex items-center gap-1"><MessageCircle size={13} />{tr("id_chat")}</div>
      <div className="max-h-48 overflow-y-auto space-y-1.5 mb-2" data-testid={`date-chat-messages-${did}`}>
        {msgs.length === 0 && <div className="text-[11px] text-slate-500 py-2">{tr("id_chat_empty")}</div>}
        {msgs.map(m => {
          const mine = m.from_id === meId;
          return <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <span className={`text-xs px-2.5 py-1.5 rounded-2xl max-w-[80%] break-words ${mine ? "bg-rose-500/25 text-rose-50" : "bg-white/10 text-slate-200"}`}>{m.text}</span>
          </div>;
        })}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2">
        <Input data-testid={`date-chat-input-${did}`} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={tr("id_chat_ph")} className="bg-white/5 border-white/10 h-9" />
        <Button data-testid={`date-chat-send-${did}`} disabled={busy || !text.trim()} onClick={send} className="rose-btn text-white border-0 h-9"><Send size={14} /></Button>
      </div>
    </div>
  );
}

function Countdown({ to, label }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return <span className="font-mono-num text-amber-300">{label} {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(ss).padStart(2, "0")}</span>;
}

const REASONS = [
  ["reason_no_show", "No-show"], ["reason_cancelled_last", "Cancelled last minute"], ["reason_misleading", "Misleading profile"],
  ["reason_rude", "Rude or disrespectful"], ["reason_uncomfortable", "Made me uncomfortable"], ["reason_harassment", "Harassment"],
  ["reason_money", "Asked for money"], ["reason_scam", "Suspicious / scam"], ["reason_unsafe", "Unsafe situation"], ["reason_other", "Other"],
];

function DateCard({ d, reload }) {
  const { lang, user } = useApp();
  const tr = (k, vars) => { let s = t(k, lang); if (vars) Object.entries(vars).forEach(([n, v]) => (s = s.replace(`{${n}}`, v))); return s; };
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [choose, setChoose] = useState("");
  const [loc, setLoc] = useState({});
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState(""); const [time, setTime] = useState("19:00");
  const [taxi, setTaxi] = useState(""); const [pickup, setPickup] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reasons, setReasons] = useState([]); const [details, setDetails] = useState(""); const [evidence, setEvidence] = useState("");
  const [showVerify, setShowVerify] = useState(false); const [vfile, setVfile] = useState(null); const [vok, setVok] = useState(false);
  const isInv = d.role === "inviter";
  const w = d.windows || {};
  const nowMs = Date.now();
  const reportOpen = w.report_open && nowMs >= new Date(w.report_open).getTime() && nowMs <= new Date(w.report_close).getTime();
  const canVerify = w.verify_at && nowMs >= new Date(w.verify_at).getTime();
  const chatEnabled = CHAT_STATUSES.includes(d.status);
  const [slots, setSlots] = useState([]);
  const [showChat, setShowChat] = useState(false);
  useEffect(() => {
    if (isInv && d.status === "DATE_ACTIVITY_SELECTED" && date) {
      api.get(`/invites/${d.id}/slots`, { params: { day: date } }).then(r => setSlots(r.data.slots || [])).catch(() => setSlots([]));
    } else setSlots([]);
  }, [date, d.status, d.id, isInv]);

  const _calEvent = () => {
    const loc = d.location || {};
    const title = `GiftsDates: ${d.chosen_idea?.name || "Date"} · ${d.other?.name || ""}`.trim();
    const place = [loc.venue, loc.address, loc.city, loc.country].filter(Boolean).join(", ");
    const s = loc.scheduled_start ? new Date(loc.scheduled_start) : null;
    const e = loc.scheduled_end ? new Date(loc.scheduled_end) : (s ? new Date(s.getTime() + 3 * 3600 * 1000) : null);
    return { title, place, s, e };
  };
  const _fmtCal = (dt) => dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const googleCalUrl = () => {
    const { title, place, s, e } = _calEvent();
    if (!s || !e) return "#";
    const p = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${_fmtCal(s)}/${_fmtCal(e)}`, details: `Your GiftsDates date. Coordinate in the app: ${window.location.origin}/dates`, location: place });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  };
  const downloadIcs = () => {
    const { title, place, s, e } = _calEvent();
    if (!s || !e) return;
    const esc = (x) => (x || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GiftsDates//EN", "BEGIN:VEVENT", `UID:${d.id}@giftsdates`, `DTSTAMP:${_fmtCal(new Date())}`, `DTSTART:${_fmtCal(s)}`, `DTEND:${_fmtCal(e)}`, `SUMMARY:${esc(title)}`, `LOCATION:${esc(place)}`, `DESCRIPTION:${esc("Your GiftsDates date. Coordinate in the app.")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `giftsdates-${d.id}.ics`; a.click(); URL.revokeObjectURL(url);
  };
  const showCal = !!d.location?.scheduled_start && !["CANCELLED", "CANCELLED_TRANSPORTATION", "REFUNDED"].includes(d.status);

  const statusLabel = () => { const l = t(`ds_${d.status}`, lang); return l === `ds_${d.status}` ? d.status_label : l; };
  const stepText = () => {
    const o = d.other?.name || "…";
    const rk = isInv ? `dni_${d.status}` : `dnr_${d.status}`;
    let s = t(rk, lang);
    if (s === rk) s = t(`dn_${d.status}`, lang);
    if (s === `dn_${d.status}`) return d.next_step;
    return s.replace("{o}", o);
  };

  const act = async (fn) => { setBusy(true); try { await fn(); await reload(); } catch (e) { toast.error(e.response?.data?.detail || tr("failed")); } finally { setBusy(false); } };
  const post = (path, body) => api.post(`/invites/${d.id}${path}`, body);

  const submitReport = () => act(async () => {
    if (details.trim().length < 10) { throw { response: { data: { detail: tr("id_report_min") } } }; }
    await post("/report", { reasons, details, evidence }); toast.success(tr("id_report_submitted")); setShowReport(false);
  });
  const submitVerify = () => act(async () => {
    if (!vfile || !vok) { throw { response: { data: { detail: tr("id_verify_required") } } }; }
    const fd = new FormData(); fd.append("file", vfile); fd.append("confirm", "true"); fd.append("note", "");
    await api.post(`/invites/${d.id}/verify`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    toast.success(tr("id_verify_sent")); setShowVerify(false);
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-[#161320] p-4" data-testid={`date-card-${d.id}`}>
      <div className="flex gap-3">
        <img src={d.other?.photo ? fileUrl(d.other.photo) : FALLBACK} onError={e => e.currentTarget.src = FALLBACK} alt=""
          onClick={() => nav(`/profile/${d.other?.id}`)} data-testid={`date-card-photo-${d.id}`}
          className="w-16 h-16 rounded-xl object-cover cursor-pointer flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-serif-luxe text-lg truncate">{d.other?.name}{d.other?.age ? `, ${d.other.age}` : ""}</h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 uppercase tracking-wide" data-testid={`date-status-${d.id}`}>{statusLabel()}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5" data-testid={`date-next-${d.id}`}>➜ {stepText()}</p>
          {d.chosen_idea && <div className="text-sm text-rose-200 mt-1"><CalendarHeart size={13} className="inline me-1" />{d.chosen_idea.name}</div>}
          {!d.chosen_idea && d.options && <div className="text-xs text-slate-300 mt-1">{tr("id_options")}: {d.options.map(o => o.name).join(" · ")}</div>}
          {d.location?.venue && <div className="text-xs text-slate-400 mt-1"><MapPin size={12} className="inline me-1" />{[d.location.venue, d.location.address, d.location.city].filter(Boolean).join(", ")} <MapsLink loc={d.location} testid={`date-maps-${d.id}`} /></div>}
          {d.location?.scheduled_start && <div className="text-xs text-slate-400"><Clock size={12} className="inline me-1" />{new Date(d.location.scheduled_start).toLocaleString()} (3h)</div>}
          {d.transportation?.status && <div className="text-xs text-sky-300 mt-0.5"><Car size={12} className="inline me-1" />{d.transportation.type}: {d.transportation.status}{d.transportation.taxi_amount ? ` · 🪙${d.transportation.taxi_amount}` : ""}{d.transportation.pickup_address ? ` · ${d.transportation.pickup_address}` : ""}</div>}
          <div className="text-xs text-amber-300/90 mt-0.5"><Coins size={12} className="inline me-1" />🪙 {d.total_hold || d.coins}{d.gift ? ` + ${tr("id_gift")} ${d.gift.icon || ""}` : ""}</div>
          {reportOpen && <div className="text-[11px] mt-1"><Countdown to={w.report_close} label={tr("id_report_closes")} /></div>}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {d.status === "INVITATION_SENT" && !isInv && (
          <div className="w-full space-y-2" data-testid={`date-choose-${d.id}`}>
            <div className="flex flex-wrap gap-2">{d.options.map(o => (
              <button key={o.idea_id} data-testid={`date-choose-opt-${o.idea_id}`} onClick={() => setChoose(o.idea_id)}
                className={`text-xs px-3 py-1.5 rounded-full border ${choose === o.idea_id ? "bg-rose-500/20 border-rose-500/50 text-rose-200" : "bg-white/5 border-white/10 text-slate-300"}`}>{o.name}</button>))}</div>
            <Button data-testid={`date-choose-confirm-${d.id}`} disabled={busy || !choose} onClick={() => act(() => post("/choose", { idea_id: choose }))} className="rose-btn text-white border-0 h-9">{tr("id_confirm_choice")}</Button>
          </div>
        )}
        {d.status === "DATE_ACTIVITY_SELECTED" && isInv && (
          <div className="w-full space-y-2 rounded-lg border border-white/10 p-2" data-testid={`date-location-${d.id}`}>
            <div className="text-xs text-amber-200">{tr("id_choose_location")}</div>
            <Input data-testid={`date-venue-${d.id}`} value={venue} onChange={e => setVenue(e.target.value)} placeholder={tr("id_venue_ph")} className="bg-white/5 border-white/10 h-9" />
            <AddressPicker value={loc} onChange={setLoc} />
            <div className="flex gap-2"><Input data-testid={`date-date-${d.id}`} type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white/5 border-white/10 h-9" />
              <Input data-testid={`date-time-${d.id}`} type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-white/5 border-white/10 h-9" /></div>
            {date ? (
              <div data-testid={`date-slots-${d.id}`}>
                <div className="text-[11px] text-slate-400 mb-1">{tr("id_pick_slot")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {slots.map(s => (
                    <button key={s.time} type="button" data-testid={`date-slot-${d.id}-${s.time}`} disabled={!s.available} onClick={() => setTime(s.time)}
                      className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${time === s.time ? "bg-rose-500/25 border-rose-500/60 text-rose-100" : s.available ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10" : "bg-white/5 border-white/5 text-slate-600 line-through cursor-not-allowed"}`}>
                      {s.time}{!s.available ? ` · ${tr("id_slot_busy")}` : ""}
                    </button>
                  ))}
                </div>
              </div>
            ) : <div className="text-[11px] text-slate-500">{tr("id_slot_none")}</div>}
            <Button data-testid={`date-location-submit-${d.id}`} disabled={busy || !venue || !date} onClick={() => act(() => post("/location", { venue, address: loc.address, city: loc.city, country: loc.country, postal_code: loc.postal_code, lat: loc.lat, lng: loc.lng, scheduled_start: new Date(`${date}T${time}:00`).toISOString() }))} className="rose-btn text-white border-0 h-9">{tr("id_propose_location")}</Button>
          </div>
        )}
        {d.status === "LOCATION_PROPOSED" && !isInv && (
          <div className="w-full space-y-2" data-testid={`date-confirm-loc-${d.id}`}>
            <div className="flex gap-2">
              <Button data-testid={`date-confirm-location-${d.id}`} disabled={busy} onClick={() => act(() => post("/location/confirm"))} className="rose-btn text-white border-0 h-9"><Check size={14} className="me-1" />{tr("id_confirm_location")}</Button>
            </div>
            <div className="flex gap-2 items-center"><Input data-testid={`date-taxi-amount-${d.id}`} type="number" min="1" value={taxi} onChange={e => setTaxi(e.target.value)} placeholder={tr("id_taxi_amount_ph")} className="bg-white/5 border-white/10 h-9 max-w-[160px]" />
              <Button data-testid={`date-taxi-request-${d.id}`} disabled={busy || !taxi} onClick={() => act(() => post("/taxi/request", { amount: parseInt(taxi) }))} variant="outline" className="h-9 bg-white/5 border-white/15"><Car size={14} className="me-1" />{tr("id_request_taxi")}</Button></div>
          </div>
        )}
        {d.status === "TAXI_REQUESTED" && isInv && (
          <div className="w-full flex flex-wrap gap-2" data-testid={`date-transport-${d.id}`}>
            <Button data-testid={`date-taxi-confirm-${d.id}`} disabled={busy} onClick={() => act(() => post("/taxi/confirm"))} className="rose-btn text-white border-0 h-9">{tr("id_confirm_pay_taxi")} 🪙{d.transportation?.taxi_amount}</Button>
            <Button data-testid={`date-pickup-offer-${d.id}`} disabled={busy} onClick={() => act(() => post("/pickup/offer"))} variant="outline" className="h-9 bg-white/5 border-white/15">{tr("id_offer_pickup")}</Button>
            <Button data-testid={`date-transport-refuse-${d.id}`} disabled={busy} onClick={() => act(() => post("/transport/refuse"))} variant="outline" className="h-9 bg-rose-500/10 border-rose-500/40 text-rose-300">{tr("id_refuse")}</Button>
          </div>
        )}
        {d.status === "PICKUP_ADDRESS_PENDING" && !isInv && (
          <div className="w-full flex gap-2 items-center" data-testid={`date-pickup-addr-${d.id}`}>
            <Input data-testid={`date-pickup-input-${d.id}`} value={pickup} onChange={e => setPickup(e.target.value)} placeholder={tr("id_pickup_ph")} className="bg-white/5 border-white/10 h-9" />
            <Button data-testid={`date-pickup-submit-${d.id}`} disabled={busy || !pickup} onClick={() => act(() => post("/pickup/address", { pickup_address: pickup }))} className="rose-btn text-white border-0 h-9">{tr("id_send")}</Button>
          </div>
        )}
        {d.status === "PICKUP_ADDRESS_SELECTED" && isInv && (
          <div className="w-full flex flex-wrap gap-2">
            <Button data-testid={`date-pickup-confirm-${d.id}`} disabled={busy} onClick={() => act(() => post("/pickup/confirm"))} className="rose-btn text-white border-0 h-9">{tr("id_confirm_pickup")}</Button>
            <Button data-testid={`date-pay-taxi-instead-${d.id}`} disabled={busy} onClick={() => act(() => post("/taxi/confirm"))} variant="outline" className="h-9 bg-white/5 border-white/15">{tr("id_pay_taxi_instead")}</Button>
          </div>
        )}
        {!TERMINAL.includes(d.status) && d.status !== "PHOTO_VERIFICATION_PENDING" && (
          <Button data-testid={`date-cancel-${d.id}`} disabled={busy} onClick={() => act(() => post("/cancel"))} variant="ghost" className="h-9 text-slate-400 hover:text-rose-300">{tr("id_cancel")}</Button>
        )}
        {reportOpen && <Button data-testid={`date-report-${d.id}`} onClick={() => setShowReport(v => !v)} variant="outline" className="h-9 bg-rose-500/10 border-rose-500/40 text-rose-300"><Flag size={14} className="me-1" />{tr("id_report_this")}</Button>}
        {canVerify && ["DATE_CONFIRMED", "DATE_COMPLETED_PENDING_VERIFICATION"].includes(d.status) &&
          <Button data-testid={`date-verify-${d.id}`} onClick={() => setShowVerify(v => !v)} variant="outline" className="h-9 bg-emerald-500/10 border-emerald-500/40 text-emerald-300"><Camera size={14} className="me-1" />{tr("id_send_photo_conf")}</Button>}
        {chatEnabled && <Button data-testid={`date-chat-toggle-${d.id}`} onClick={() => setShowChat(v => !v)} variant="outline" className="h-9 bg-sky-500/10 border-sky-500/40 text-sky-300"><MessageCircle size={14} className="me-1" />{tr("id_chat")}</Button>}
        {showCal && <>
          <a data-testid={`date-cal-google-${d.id}`} href={googleCalUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center h-9 px-3 rounded-md text-sm bg-white/5 border border-white/15 text-slate-200 hover:bg-white/10"><CalendarPlus size={14} className="me-1" />{tr("id_cal_google")}</a>
          <Button data-testid={`date-cal-ics-${d.id}`} onClick={downloadIcs} variant="outline" className="h-9 bg-white/5 border-white/15"><CalendarPlus size={14} className="me-1" />{tr("id_cal_ics")}</Button>
        </>}
      </div>

      {showReport && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 space-y-2" data-testid={`report-form-${d.id}`}>
          <div className="text-xs font-semibold text-rose-200 flex items-center gap-1"><ShieldAlert size={13} />{tr("id_report_title")}</div>
          <div className="flex flex-wrap gap-1.5">{REASONS.map(([k, v]) => (
            <button key={k} onClick={() => setReasons(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v])}
              className={`text-[11px] px-2 py-1 rounded-full border ${reasons.includes(v) ? "bg-rose-500/20 border-rose-500/50 text-rose-200" : "bg-white/5 border-white/10 text-slate-400"}`}>{tr(k)}</button>))}</div>
          <textarea data-testid={`report-details-${d.id}`} value={details} onChange={e => setDetails(e.target.value)} placeholder={tr("id_report_details_ph")} className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-sm text-slate-200 min-h-[70px]" />
          <Input data-testid={`report-evidence-${d.id}`} value={evidence} onChange={e => setEvidence(e.target.value)} placeholder={tr("id_report_evidence_ph")} className="bg-white/5 border-white/10 h-9" />
          <Button data-testid={`report-submit-${d.id}`} disabled={busy} onClick={submitReport} className="rose-btn text-white border-0 h-9">{tr("id_submit_report")}</Button>
        </div>
      )}
      {showVerify && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2" data-testid={`verify-form-${d.id}`}>
          <div className="text-xs text-emerald-200">{tr("id_verify_hint")}</div>
          <input data-testid={`verify-file-${d.id}`} type="file" accept="image/*" onChange={e => setVfile(e.target.files[0])} className="text-xs text-slate-300" />
          <label className="flex items-start gap-2 text-xs text-slate-300"><input type="checkbox" checked={vok} onChange={e => setVok(e.target.checked)} className="mt-0.5" />{tr("id_verify_confirm")}</label>
          <Button data-testid={`verify-submit-${d.id}`} disabled={busy} onClick={submitVerify} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 h-9">{tr("id_verify_send")}</Button>
        </div>
      )}
      {showChat && chatEnabled && <DateChat did={d.id} meId={user?.id} lang={lang} />}
    </div>
  );
}

export default function InviteDates() {
  const { lang } = useApp();
  const [tab, setTab] = useState("invites");
  const [data, setData] = useState({ incoming: [], outgoing: [] });
  const load = useCallback(async () => { try { const r = await api.get("/invites"); setData(r.data); } catch {} }, []);
  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id); }, [load]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-serif-luxe text-3xl mb-4 flex items-center gap-2"><CalendarHeart className="text-rose-400" /> {t("dates", lang)}</h1>
      <div className="flex gap-2 mb-5">
        <button data-testid="tab-invites" onClick={() => setTab("invites")} className={`text-sm px-4 py-2 rounded-full border ${tab === "invites" ? "bg-rose-500/20 border-rose-500/50 text-rose-200" : "bg-white/5 border-white/10 text-slate-300"}`}>{t("id_tab_invitations", lang)}</button>
        <button data-testid="tab-vip" onClick={() => setTab("vip")} className={`text-sm px-4 py-2 rounded-full border ${tab === "vip" ? "bg-amber-500/20 border-amber-500/50 text-amber-200" : "bg-white/5 border-white/10 text-slate-300"}`}>{t("id_tab_vip", lang)}</button>
      </div>

      {tab === "vip" ? <LegacyDates embedded /> : (
        <div className="grid md:grid-cols-2 gap-6">
          <section data-testid="incoming-dates">
            <h2 className="text-lg font-semibold mb-3 text-slate-200">{t("id_incoming", lang)}</h2>
            <div className="space-y-3">
              {data.incoming.map(d => <DateCard key={d.id} d={d} reload={load} />)}
              {!data.incoming.length && <p className="text-sm text-slate-500">{t("id_no_incoming", lang)}</p>}
            </div>
          </section>
          <section data-testid="outgoing-dates">
            <h2 className="text-lg font-semibold mb-3 text-slate-200">{t("id_outgoing", lang)}</h2>
            <div className="space-y-3">
              {data.outgoing.map(d => <DateCard key={d.id} d={d} reload={load} />)}
              {!data.outgoing.length && <p className="text-sm text-slate-500">{t("id_no_outgoing", lang)}</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
