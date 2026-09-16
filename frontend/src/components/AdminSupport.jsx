import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { api } from "../lib/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AdminSupport() {
  const [cfg, setCfg] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [s, t] = await Promise.all([api.get("/admin/support/settings"), api.get("/admin/support/tickets?status=all")]);
    // normalise hours into day order 0..6
    const hours = [...Array(7)].map((_, d) => s.data.hours.find((h) => h.day === d) || { day: d, enabled: false, open: "09:00", close: "18:00" });
    setCfg({ ...s.data, hours });
    setTickets(t.data);
  };
  useEffect(() => { load(); }, []);

  const setHour = (day, key, val) => setCfg((c) => ({ ...c, hours: c.hours.map((h) => (h.day === day ? { ...h, [key]: val } : h)) }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/admin/support/settings", {
        agent_enabled: cfg.agent_enabled, timezone: cfg.timezone, hours: cfg.hours,
        offline_message: cfg.offline_message, welcome_message: cfg.welcome_message,
      });
      toast.success("Support settings saved");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail === "INVALID_TIMEZONE" ? "Invalid timezone (e.g. Europe/London, America/New_York, UTC)" : "Save failed");
    } finally { setSaving(false); }
  };

  const resolve = async (id) => {
    try { await api.post(`/admin/support/tickets/${id}/resolve`); toast.success("Resolved"); load(); }
    catch { toast.error("Failed"); }
  };

  if (!cfg) return <div className="text-sm text-slate-500 py-6 text-center">Loading…</div>;

  return (
    <div className="space-y-8" data-testid="admin-support">
      {/* Hours */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className="font-serif-luxe text-xl">Hours of operation</h3>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input data-testid="support-agent-enabled" type="checkbox" checked={cfg.agent_enabled} onChange={(e) => setCfg({ ...cfg, agent_enabled: e.target.checked })} className="w-4 h-4 accent-rose-500" />
            Live agent enabled
          </label>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-slate-400">Timezone</span>
          <input data-testid="support-timezone" value={cfg.timezone} onChange={(e) => setCfg({ ...cfg, timezone: e.target.value })}
            placeholder="UTC" className="bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/40 w-52" />
          <span className="text-xs text-slate-500">e.g. Europe/London, America/New_York</span>
        </div>
        <div className="space-y-2">
          {cfg.hours.map((h) => (
            <div key={h.day} data-testid={`support-hours-${h.day}`} className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 w-36">
                <input type="checkbox" checked={h.enabled} onChange={(e) => setHour(h.day, "enabled", e.target.checked)} className="w-4 h-4 accent-rose-500" data-testid={`support-day-${h.day}-enabled`} />
                <span className="text-sm">{DAYS[h.day]}</span>
              </label>
              <input type="time" value={h.open} disabled={!h.enabled} onChange={(e) => setHour(h.day, "open", e.target.value)}
                data-testid={`support-day-${h.day}-open`} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-sm text-white outline-none disabled:opacity-40" />
              <span className="text-slate-500">–</span>
              <input type="time" value={h.close} disabled={!h.enabled} onChange={(e) => setHour(h.day, "close", e.target.value)}
                data-testid={`support-day-${h.day}-close`} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-sm text-white outline-none disabled:opacity-40" />
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <h3 className="font-serif-luxe text-xl">Bot messages</h3>
        <div>
          <div className="text-xs text-slate-400 mb-1">Welcome message</div>
          <textarea data-testid="support-welcome" value={cfg.welcome_message} onChange={(e) => setCfg({ ...cfg, welcome_message: e.target.value })} rows={2}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/40 resize-none" />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">Offline message (shown when agents are closed)</div>
          <textarea data-testid="support-offline" value={cfg.offline_message} onChange={(e) => setCfg({ ...cfg, offline_message: e.target.value })} rows={2}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-amber-400/40 resize-none" />
        </div>
        <Button data-testid="support-save" onClick={save} disabled={saving} className="rose-btn text-white border-0">{saving ? "Saving…" : "Save settings"}</Button>
      </div>

      {/* Tickets */}
      <div className="glass rounded-2xl p-5" data-testid="admin-support-tickets">
        <h3 className="font-serif-luxe text-xl mb-3">Support messages ({tickets.filter((t) => t.status === "open").length} open)</h3>
        {tickets.length === 0 ? <div className="text-sm text-slate-500 py-4 text-center">—</div> : tickets.map((t) => (
          <div key={t.id} data-testid={`support-ticket-${t.id}`} className="py-3 border-t border-white/5 flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-[240px]">
              <div className="text-sm">{t.name || "Guest"} <span className="text-slate-500">· {t.email}</span></div>
              <div className="text-sm text-slate-300 mt-1 whitespace-pre-line">{t.message}</div>
              <div className="text-xs text-slate-500 mt-1">{new Date(t.created_at).toLocaleString()} · <span className="uppercase">{t.status}</span>{t.created_while_open ? "" : " · sent after-hours"}</div>
            </div>
            {t.status === "open" && <Button data-testid={`support-ticket-resolve-${t.id}`} size="sm" onClick={() => resolve(t.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">Resolve</Button>}
          </div>
        ))}
      </div>
    </div>
  );
}
