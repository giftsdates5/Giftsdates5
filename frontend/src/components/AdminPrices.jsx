import React, { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

const inp = "bg-white/5 border-white/10 mt-1 h-9";
const num = (v) => (v === "" ? "" : Number(v));

export default function AdminPrices() {
  const { lang } = useApp();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/admin/settings").then(r => setS({ ...r.data, commission_pct: Math.round(r.data.commission * 100) })).catch(() => {}); }, []);
  if (!s) return null;

  const upd = (k, v) => setS({ ...s, [k]: v });
  const updList = (list, i, k, v) => upd(list, s[list].map((x, j) => j === i ? { ...x, [k]: v } : x));
  const rm = (list, i) => upd(list, s[list].filter((_, j) => j !== i));

  const save = async () => {
    setBusy(true);
    try {
      const payload = { gifts: s.gifts, coin_packages: s.coin_packages, premium_amount: Number(s.premium_amount), video_rate: Number(s.video_rate),
        date_min_coins: Number(s.date_min_coins), referral_bonus: Number(s.referral_bonus), commission: Number(s.commission_pct) / 100, free_daily_likes: Number(s.free_daily_likes),
        custom_coins_per_usd: Number(s.custom_coins_per_usd), custom_bonus_pct: Number(s.custom_bonus_pct), custom_min_usd: Number(s.custom_min_usd), coins_per_usd: Number(s.coins_per_usd), min_withdraw_usd: Number(s.min_withdraw_usd), referral_package_id: s.referral_package_id || null, cancel_refund_pct: Number(s.cancel_refund_pct ?? 0.5), gift_auto_match_coins: Number(s.gift_auto_match_coins ?? 100) };
      const { data } = await api.put("/admin/settings", payload);
      setS({ ...data, commission_pct: Math.round(data.commission * 100) }); toast.success(t("saved", lang));
    } catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6" data-testid="admin-prices-tab">
      <div className="glass rounded-2xl p-5 grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div><Label className="text-xs text-slate-400">{t("premium_price", lang)}</Label><Input data-testid="admin-premium-amount" type="number" step="0.01" value={s.premium_amount} onChange={e => upd("premium_amount", num(e.target.value))} className={inp} /></div>
        <div><Label className="text-xs text-slate-400">{t("video_rate_label", lang)}</Label><Input data-testid="admin-video-rate" type="number" value={s.video_rate} onChange={e => upd("video_rate", num(e.target.value))} className={inp} /></div>
        <div><Label className="text-xs text-slate-400">{t("date_min_label", lang)}</Label><Input data-testid="admin-date-min" type="number" value={s.date_min_coins} onChange={e => upd("date_min_coins", num(e.target.value))} className={inp} /></div>
        <div><Label className="text-xs text-slate-400">{t("referral_bonus_label", lang)}</Label><Input data-testid="admin-referral-bonus" type="number" value={s.referral_bonus} onChange={e => upd("referral_bonus", num(e.target.value))} className={inp} /></div>
        <div><Label className="text-xs text-slate-400">{t("referral_package_label", lang)}</Label>
          <select data-testid="admin-referral-package" value={s.referral_package_id || ""} onChange={e => upd("referral_package_id", e.target.value || null)} className="mt-1 h-9 w-full rounded-md bg-white/5 border border-white/10 px-2 text-sm">
            <option value="" className="bg-[#161320]">{t("any_package", lang)}</option>
            {s.coin_packages.map(p => <option key={p.id} value={p.id} className="bg-[#161320]">{p.name}</option>)}
          </select></div>
        <div><Label className="text-xs text-slate-400">{t("commission_label", lang)}</Label><Input data-testid="admin-commission" type="number" min="0" max="99" value={s.commission_pct} onChange={e => upd("commission_pct", num(e.target.value))} className={inp} /></div>
        <div><Label className="text-xs text-slate-400">{t("free_likes_label", lang)}</Label><Input data-testid="admin-free-likes" type="number" min="0" value={s.free_daily_likes} onChange={e => upd("free_daily_likes", num(e.target.value))} className={inp} /></div>
        <div><Label className="text-xs text-slate-400">{t("payout_rate_label", lang)}</Label><Input data-testid="admin-coins-per-usd" type="number" min="1" value={s.coins_per_usd} onChange={e => upd("coins_per_usd", num(e.target.value))} className={inp} /></div>
        <div><Label className="text-xs text-slate-400">{t("min_withdraw_label", lang)}</Label><Input data-testid="admin-min-withdraw" type="number" min="0" step="1" value={s.min_withdraw_usd} onChange={e => upd("min_withdraw_usd", num(e.target.value))} className={inp} /></div>
        <div><Label className="text-xs text-slate-400">{t("cancel_refund_label", lang)}</Label><Input data-testid="admin-cancel-refund" type="number" min="0" max="100" value={Math.round((s.cancel_refund_pct ?? 0.5) * 100)} onChange={e => upd("cancel_refund_pct", num(e.target.value) / 100)} className={inp} /></div>
        <div><Label className="text-xs text-slate-400">{t("gift_auto_match_label", lang)}</Label><Input data-testid="admin-gift-auto-match" type="number" min="1" value={s.gift_auto_match_coins ?? 100} onChange={e => upd("gift_auto_match_coins", num(e.target.value))} className={inp} /></div>
        <div className="sm:col-span-2 lg:col-span-3"><Label className="text-xs text-slate-400">{t("custom_coins_settings", lang)}</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input data-testid="admin-custom-per-usd" type="number" min="1" value={s.custom_coins_per_usd} onChange={e => upd("custom_coins_per_usd", num(e.target.value))} className={inp} />
            <Input data-testid="admin-custom-bonus" type="number" min="0" step="0.5" value={s.custom_bonus_pct} onChange={e => upd("custom_bonus_pct", num(e.target.value))} className={inp} />
            <Input data-testid="admin-custom-min" type="number" min="0.5" step="0.5" value={s.custom_min_usd} onChange={e => upd("custom_min_usd", num(e.target.value))} className={inp} />
          </div></div>
      </div>

      <div className="glass rounded-2xl p-5" data-testid="admin-gifts-list">
        <div className="flex items-center justify-between mb-3"><h3 className="font-serif-luxe text-xl">{t("gifts_catalog", lang)}</h3>
          <Button data-testid="admin-gift-add" size="sm" variant="outline" onClick={() => upd("gifts", [...s.gifts, { id: `gift_${Date.now()}`, name_key: "", icon: "🎁", cost: 100 }])} className="bg-white/5 border-white/10"><Plus size={14} className="me-1" /> {t("add", lang)}</Button></div>
        <div className="space-y-2">
          {s.gifts.map((g, i) => (
            <div key={g.id} className="grid grid-cols-[60px_1fr_1fr_120px_40px] gap-2 items-center" data-testid={`admin-gift-row-${g.id}`}>
              <Input data-testid={`admin-gift-icon-${g.id}`} value={g.icon} onChange={e => updList("gifts", i, "icon", e.target.value)} className={`${inp} text-center text-lg`} />
              <Input data-testid={`admin-gift-id-${g.id}`} value={g.id} onChange={e => updList("gifts", i, "id", e.target.value)} className={`${inp} font-mono text-xs`} />
              <Input data-testid={`admin-gift-name-${g.id}`} placeholder="name_key / Name" value={g.name_key} onChange={e => updList("gifts", i, "name_key", e.target.value)} className={inp} />
              <Input data-testid={`admin-gift-cost-${g.id}`} type="number" value={g.cost} onChange={e => updList("gifts", i, "cost", num(e.target.value))} className={inp} />
              <button data-testid={`admin-gift-remove-${g.id}`} onClick={() => rm("gifts", i)} className="text-rose-400 hover:text-rose-300 flex justify-center"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-5" data-testid="admin-packages-list">
        <div className="flex items-center justify-between mb-3"><h3 className="font-serif-luxe text-xl">{t("coin_packages", lang)}</h3>
          <Button data-testid="admin-package-add" size="sm" variant="outline" onClick={() => upd("coin_packages", [...s.coin_packages, { id: `coins_${Date.now()}`, coins: 100, amount: 9.99, bonus: 0, name: "New Pack" }])} className="bg-white/5 border-white/10"><Plus size={14} className="me-1" /> {t("add", lang)}</Button></div>
        <div className="grid grid-cols-[1fr_1fr_100px_100px_100px_40px] gap-2 text-[10px] uppercase tracking-widest text-slate-500 mb-1 px-1"><span>id</span><span>{t("name", lang)}</span><span>{t("coins", lang)}</span><span>{t("bonus", lang)}</span><span>{t("price_usd", lang)}</span><span /></div>
        <div className="space-y-2">
          {s.coin_packages.map((p, i) => (
            <div key={p.id} className="grid grid-cols-[1fr_1fr_100px_100px_100px_40px] gap-2 items-center" data-testid={`admin-package-row-${p.id}`}>
              <Input data-testid={`admin-package-id-${p.id}`} value={p.id} onChange={e => updList("coin_packages", i, "id", e.target.value)} className={`${inp} font-mono text-xs`} />
              <Input data-testid={`admin-package-name-${p.id}`} value={p.name} onChange={e => updList("coin_packages", i, "name", e.target.value)} className={inp} />
              <Input data-testid={`admin-package-coins-${p.id}`} type="number" value={p.coins} onChange={e => updList("coin_packages", i, "coins", num(e.target.value))} className={inp} />
              <Input data-testid={`admin-package-bonus-${p.id}`} type="number" value={p.bonus} onChange={e => updList("coin_packages", i, "bonus", num(e.target.value))} className={inp} />
              <Input data-testid={`admin-package-amount-${p.id}`} type="number" step="0.01" value={p.amount} onChange={e => updList("coin_packages", i, "amount", num(e.target.value))} className={inp} />
              <button data-testid={`admin-package-remove-${p.id}`} onClick={() => rm("coin_packages", i)} className="text-rose-400 hover:text-rose-300 flex justify-center"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      <Button data-testid="admin-prices-save" disabled={busy} onClick={save} className="rose-btn text-white border-0 h-11 px-8">{t("save", lang)}</Button>
    </div>
  );
}
