import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

export default function GiftModal({ open, onOpenChange, target, onSent, conversationId }) {
  const { user, meta, lang, refreshUser } = useApp();
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [customIcon, setCustomIcon] = useState("🎁");
  const [customCost, setCustomCost] = useState(100);
  const EMOJIS = ["🎁", "❤️", "🌷", "🧸", "🍓", "🍰", "☕", "🍷", "🎀", "👠", "👜", "💄", "🌴", "✈️", "🚗", "🏝️", "🎸", "🐱", "🐶", "🦋", "🌙", "⭐", "🔥", "💋"];
  const isCustom = selected?.id === "custom";
  const effectiveCost = isCustom ? Number(customCost) || 0 : selected?.cost;

  const send = async () => {
    if (!selected) return;
    if (isCustom && effectiveCost < 10) { toast.error(t("custom_gift_min", lang)); return; }
    if (user.coins < effectiveCost) { toast.error(t("not_enough_coins", lang)); return; }
    setBusy(true);
    try {
      const r = await api.post("/gifts/send", { target_id: target.id, gift_id: selected.id, message: msg, ...(conversationId ? { conversation_id: conversationId } : {}), ...(isCustom ? { custom_icon: customIcon, custom_cost: effectiveCost } : {}) });
      await refreshUser();
      toast.success(`${isCustom ? customIcon : selected.icon} sent to ${target.name}!`);
      if (r.data?.auto_matched) toast.success(t("gift_auto_matched", lang).replace("{name}", target.name), { duration: 6000 });
      onSent && onSent();
      onOpenChange(false); setSelected(null); setMsg("");
    } catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#161320] border-white/10 text-white max-w-lg">
        <DialogHeader><DialogTitle className="font-serif-luxe text-2xl">{t("choose_gift", lang)} · {target?.name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          {(meta?.gifts || []).map(g => (
            <button key={g.id} data-testid={`gift-option-${g.id}`} onClick={() => setSelected(g)}
              className={`p-4 rounded-2xl border transition-all ${selected?.id === g.id ? "border-rose-500 bg-rose-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
              <div className="text-4xl">{g.icon}</div>
              <div className="mt-1 text-xs text-slate-300">{t(g.name_key, lang)}</div>
              <div className="text-xs text-amber-300 font-mono-num">🪙 {g.cost}</div>
            </button>
          ))}
          <button data-testid="gift-option-custom" onClick={() => setSelected({ id: "custom" })}
            className={`p-4 rounded-2xl border transition-all ${isCustom ? "border-violet-500 bg-violet-500/15" : "border-dashed border-white/20 bg-white/5 hover:bg-white/10"}`}>
            <div className="text-4xl">{customIcon}</div>
            <div className="mt-1 text-xs text-slate-300">{t("gift_custom", lang)}</div>
            <div className="text-xs text-violet-300 font-mono-num">🪙 ?</div>
          </button>
        </div>
        {isCustom && (
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-3 space-y-3" data-testid="gift-custom-panel">
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map(e => <button key={e} type="button" data-testid={`gift-emoji-${e.codePointAt(0)}`} onClick={() => setCustomIcon(e)} className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center border ${customIcon === e ? "border-violet-400 bg-violet-500/25" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>{e}</button>)}
              <Input data-testid="gift-custom-emoji-input" value={customIcon} onChange={e => setCustomIcon(e.target.value.slice(-2) || "🎁")} className="w-14 h-9 text-center text-xl bg-white/5 border-white/10" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">{t("gift_custom_amount", lang)}</div>
              <Input data-testid="gift-custom-cost-input" type="number" min="10" step="10" value={customCost} onChange={e => setCustomCost(e.target.value)} className="bg-white/5 border-white/10 font-mono-num" />
            </div>
          </div>
        )}
        <Textarea data-testid="gift-message-input" placeholder={t("personal_message", lang)} value={msg} onChange={e => setMsg(e.target.value)} className="bg-white/5 border-white/10 mt-2" rows={2} />
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{t("balance", lang)}: <span className="font-mono-num text-amber-300">🪙 {user?.coins}</span></span>
        </div>
        {meta?.gift_auto_match_coins && <div data-testid="gift-auto-match-hint" className="text-[11px] text-violet-300">{t("gift_auto_match_hint", lang).replace("{n}", meta.gift_auto_match_coins)}</div>}
        <Button data-testid="gift-modal-send-button" disabled={!selected || busy} onClick={send} className="rose-btn text-white border-0 h-11">
          {selected ? `${t("send_gift", lang)} · 🪙 ${effectiveCost}` : t("choose_gift", lang)}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
