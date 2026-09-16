import React, { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { Search, Check, ShieldAlert, X } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

const FLAGS = ["free", "indoor", "outdoor", "casual", "romantic", "creative", "active", "food", "conversation", "entertainment"];
const BUDGETS = ["free", "low", "medium", "high"];
const DURATIONS = ["short", "medium", "long"];
const PAGE = 30;

export default function InviteDateModal({ open, onOpenChange, target }) {
  const { user, lang, refreshUser } = useApp();
  const tr = (k, vars) => { let s = t(k, lang); if (vars) Object.entries(vars).forEach(([n, v]) => (s = s.replace(`{${n}}`, v))); return s; };
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("");
  const [flags, setFlags] = useState({});
  const [selected, setSelected] = useState([]);
  const [limit, setLimit] = useState(PAGE);
  const floor = Math.max(150, target?.date_price || 0);
  const [coins, setCoins] = useState(floor);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const params = { search, category, budget, duration, ...Object.fromEntries(Object.entries(flags).filter(([, v]) => v)) };
    Object.keys(params).forEach(k => (params[k] === "" || params[k] === false) && delete params[k]);
    try { const r = await api.get("/date-ideas", { params }); setItems(r.data.items); setCats(r.data.categories); setLimit(PAGE); } catch {}
  }, [search, category, budget, duration, flags]);

  useEffect(() => { if (open) { setSelected([]); setCoins(floor); setAck(false); load(); } }, [open]); // eslint-disable-line
  useEffect(() => { if (open) { const id = setTimeout(load, 250); return () => clearTimeout(id); } }, [load, open]);

  const toggleSel = (idea) => {
    setSelected(s => s.find(x => x.id === idea.id) ? s.filter(x => x.id !== idea.id) : (s.length >= 3 ? (toast.error(tr("iv_max3")), s) : [...s, idea]));
  };

  const send = async () => {
    if (!selected.length) { toast.error(tr("iv_choose_min1")); return; }
    if (!ack) { toast.error(tr("iv_accept_safety")); return; }
    if (coins < floor) { toast.error(tr("iv_min_is", { n: floor })); return; }
    if (((user?.coins || 0) + (user?.withdrawable || 0)) < coins) { toast.error(tr("not_enough_coins")); return; }
    setBusy(true);
    try {
      await api.post("/invites", { recipient_id: target.id, idea_ids: selected.map(s => s.id), coins, safety_ack: true });
      await refreshUser();
      toast.success(tr("iv_sent_success"));
      onOpenChange(false);
    } catch (e) {
      const d = e.response?.data?.detail || "";
      toast.error(d.startsWith("MIN_COINS:") ? tr("iv_min_is", { n: d.split(":")[1] }) : d || tr("failed"));
    } finally { setBusy(false); }
  };

  const visible = items.slice(0, limit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#161320] border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="invite-date-modal">
        <DialogHeader><DialogTitle className="font-serif-luxe text-2xl">{tr("iv_title", { name: target?.name })}</DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">{tr("iv_subtitle")}</DialogDescription></DialogHeader>

        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90" data-testid="invite-safety-notice">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-300" />
          <span>{tr("iv_safety")}</span>
        </div>

        <div className="text-sm text-slate-300">{tr("iv_choose_up_to_3")} <span className="text-amber-300 font-semibold" data-testid="invite-selected-count">[{tr("iv_selected", { n: selected.length })}]</span></div>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map(s => <span key={s.id} className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-200 flex items-center gap-1">{s.name}<button onClick={() => toggleSel(s)}><X size={12} /></button></span>)}
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input data-testid="invite-search" value={search} onChange={e => setSearch(e.target.value)} placeholder={tr("iv_search_ph")} className="bg-white/5 border-white/10 ps-8 h-9" /></div>
          <select data-testid="invite-category" value={category} onChange={e => setCategory(e.target.value)} className="bg-white/5 border border-white/10 rounded-md h-9 text-sm px-2 text-slate-200">
            <option value="">{tr("iv_all_categories")}</option>
            {cats.map(c => <option key={c.key} value={c.key} className="bg-[#161320]">{c.label}</option>)}
          </select>
          <select data-testid="invite-budget" value={budget} onChange={e => setBudget(e.target.value)} className="bg-white/5 border border-white/10 rounded-md h-9 text-sm px-2 text-slate-200">
            <option value="">{tr("iv_any_budget")}</option>{BUDGETS.map(b => <option key={b} value={b} className="bg-[#161320]">{tr(`budget_${b}`)}</option>)}
          </select>
          <select data-testid="invite-duration" value={duration} onChange={e => setDuration(e.target.value)} className="bg-white/5 border border-white/10 rounded-md h-9 text-sm px-2 text-slate-200">
            <option value="">{tr("iv_any_duration")}</option>{DURATIONS.map(b => <option key={b} value={b} className="bg-[#161320]">{tr(`dur_${b}`)}</option>)}
          </select>
          {(category || budget || duration || search || Object.values(flags).some(Boolean)) &&
            <button data-testid="invite-clear-filters" onClick={() => { setSearch(""); setCategory(""); setBudget(""); setDuration(""); setFlags({}); }} className="text-xs text-slate-400 hover:text-rose-300">{tr("iv_clear")}</button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FLAGS.map(k => (
            <button key={k} data-testid={`invite-flag-${k}`} onClick={() => setFlags(f => ({ ...f, [k]: !f[k] }))}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${flags[k] ? "bg-rose-500/20 border-rose-500/50 text-rose-200" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"}`}>{tr(`flag_${k}`)}</button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1" data-testid="invite-ideas-list">
          {visible.map(i => {
            const on = selected.find(x => x.id === i.id);
            return (
              <button key={i.id} data-testid={`invite-idea-${i.id}`} onClick={() => toggleSel(i)}
                className={`text-left rounded-xl border p-3 transition-colors ${on ? "bg-rose-500/15 border-rose-500/50" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                <img src={i.category_image || "https://images.pexels.com/photos/3777884/pexels-photo-3777884.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"} alt="Men and women taking photos on a phone" loading="lazy" onError={e => (e.currentTarget.src = "https://images.pexels.com/photos/3777884/pexels-photo-3777884.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940")} className="w-full h-20 object-cover rounded-lg mb-2" data-testid={`invite-idea-img-${i.id}`} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{i.name}</span>
                  {on ? <Check size={16} className="text-rose-300" /> : <span className="text-[10px] text-slate-500">{tr("iv_add")}</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">{i.category_label}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">{i.free ? tr("budget_free") : i.budget_level}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">{i.environment}</span>
                </div>
              </button>
            );
          })}
          {items.length === 0 && <div className="text-sm text-slate-500 col-span-2 text-center py-6">{tr("iv_no_match")}</div>}
          {items.length > limit && (
            <button data-testid="invite-show-more" onClick={() => setLimit(l => l + PAGE)} className="col-span-2 text-xs text-rose-300 hover:text-rose-200 py-2 rounded-lg border border-white/10 bg-white/5">
              {tr("iv_show_more")} ({items.length - limit})
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 items-end pt-2 border-t border-white/10">
          <div><label className="text-xs text-slate-400">{tr("iv_coins_label", { n: floor })}</label>
            <Input data-testid="invite-coins" type="number" min={floor} step="50" value={coins} onChange={e => setCoins(parseInt(e.target.value || 0))} className="bg-white/5 border-white/10 mt-1" /></div>
          <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer" data-testid="invite-ack">
            <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} className="mt-0.5" />
            {tr("iv_ack_label")}
          </label>
        </div>
        <Button data-testid="invite-send-button" disabled={busy || !selected.length || !ack} onClick={send} className="rose-btn text-white border-0 w-full h-11">
          {tr("iv_send")} · 🪙 {coins}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
