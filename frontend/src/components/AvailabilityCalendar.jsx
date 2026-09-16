import React, { useState } from "react";
import { Calendar } from "./ui/calendar";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Clock } from "lucide-react";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

export const toKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const DEFAULT_WIN = { from: "18:00", to: "23:00" };
const hmMin = (s) => { const [h, m] = String(s || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const minHm = (x) => `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
export const genSlots = (w) => {
  const start = hmMin(w?.from || "18:00"), end = hmMin(w?.to || "23:00");
  const out = []; for (let s = start; s < end; s += 180) out.push({ from: minHm(s), to: minHm(Math.min(s + 180, end)) });
  return out;
};

function SlotPreview({ win, lang }) {
  const slots = genSlots(win);
  if (!slots.length) return null;
  return (
    <div className="mt-3" data-testid="slot-preview">
      <p className="text-[11px] text-slate-400 mb-1.5">{t("slot_hours_note", lang)}</p>
      <div className="flex flex-wrap gap-1.5">
        {slots.map(s => (
          <span key={s.from} className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 font-mono-num">
            {s.from}–{s.to}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AvailabilityCalendar({ value = [], onChange, timeWindow, onTimeWindow, slots = {}, onSlots }) {
  const { lang } = useApp();
  const [editDay, setEditDay] = useState(null);
  const selected = value.map(fromKey);
  const win = timeWindow || DEFAULT_WIN;
  const setWin = (k, v) => onTimeWindow({ ...win, [k]: v });
  const slot = editDay ? (slots[editDay] || win) : null;
  const setSlot = (k, v) => onSlots({ ...slots, [editDay]: { ...(slots[editDay] || win), [k]: v } });
  const clearSlot = () => { const s = { ...slots }; delete s[editDay]; onSlots(s); setEditDay(null); };
  const onSelectDays = (days) => {
    const keys = (days || []).map(toKey);
    onChange(keys);
    const s = Object.fromEntries(Object.entries(slots).filter(([k]) => keys.includes(k)));
    if (Object.keys(s).length !== Object.keys(slots).length) onSlots(s);
    if (editDay && !keys.includes(editDay)) setEditDay(null);
  };

  return (
    <div className="glass rounded-2xl p-6 mb-6" data-testid="profile-availability-section">
      <h2 className="font-serif-luxe text-2xl">{t("availability", lang)}</h2>
      <p className="text-xs text-slate-400 mt-1 mb-3">{t("availability_hint", lang)}</p>
      <div className="flex flex-wrap gap-6 items-start">
        <div data-testid="profile-availability-calendar" className="rounded-xl border border-white/10 bg-white/5">
          <Calendar mode="multiple" selected={selected} onSelect={onSelectDays} disabled={{ before: new Date() }}
            classNames={{ day_selected: "bg-rose-500 text-white hover:bg-rose-500 focus:bg-rose-500" }} />
        </div>
        <div className="flex-1 min-w-[240px] space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4" data-testid="profile-time-window">
            <Label className="text-xs text-slate-300 flex items-center gap-1"><Clock size={12} /> {t("time_window", lang)}</Label>
            <p className="text-[11px] text-slate-500 mt-1 mb-2">{t("time_window_hint", lang)}</p>
            <div className="flex items-center gap-2">
              <Input data-testid="profile-time-from" type="time" value={win.from} onChange={e => setWin("from", e.target.value)} className="bg-white/5 border-white/10 h-9 w-32" />
              <span className="text-slate-500">—</span>
              <Input data-testid="profile-time-to" type="time" value={win.to} onChange={e => setWin("to", e.target.value)} className="bg-white/5 border-white/10 h-9 w-32" />
            </div>
            <SlotPreview win={win} lang={lang} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-2">{t("availability", lang)} · <b className="text-white" data-testid="profile-availability-count">{value.length}</b></div>
            <div className="flex flex-wrap gap-1.5">
              {value.slice(0, 40).map(k => (
                <button key={k} type="button" data-testid={`profile-day-chip-${k}`} onClick={() => setEditDay(editDay === k ? null : k)}
                  className={`px-2 py-0.5 rounded-full border text-xs font-mono-num transition-colors ${editDay === k ? "bg-rose-500 text-white border-rose-500" : slots[k] ? "bg-violet-500/20 border-violet-500/40 text-violet-200" : "bg-rose-500/15 border-rose-500/30"}`}>
                  {k}{slots[k] ? ` · ${slots[k].from}–${slots[k].to}` : ""}
                </button>
              ))}
            </div>
          </div>
          {editDay && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4" data-testid="profile-day-slot-editor">
              <Label className="text-xs text-violet-300">{t("custom_time_for", lang).replace("{d}", editDay)}</Label>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Input data-testid="profile-slot-from" type="time" value={slot.from} onChange={e => setSlot("from", e.target.value)} className="bg-white/5 border-white/10 h-9 w-32" />
                <span className="text-slate-500">—</span>
                <Input data-testid="profile-slot-to" type="time" value={slot.to} onChange={e => setSlot("to", e.target.value)} className="bg-white/5 border-white/10 h-9 w-32" />
                {slots[editDay] && <Button data-testid="profile-slot-clear" size="sm" variant="ghost" onClick={clearSlot} className="text-slate-400 h-9">{t("use_default", lang)}</Button>}
              </div>
              <SlotPreview win={slot} lang={lang} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
