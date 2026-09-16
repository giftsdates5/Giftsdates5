import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Coins, Lock, Wallet as WalletIcon, Crown, ArrowUpRight, ArrowDownRight, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import PayoutAccountCard from "../components/PayoutAccountCard";
import ReferralCard from "../components/ReferralCard";

export default function Wallet() {
  const { user, lang, meta, refreshUser, spinEligible } = useApp();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [wallet, setWallet] = useState({ transactions: [], withdrawals: [], payout_account: null, withdraw_commission: 0.3, coins_per_usd: 10, min_withdraw_usd: 50 });
  const [topOpen, setTopOpen] = useState(false);
  const [wdOpen, setWdOpen] = useState(false);
  const [premOpen, setPremOpen] = useState(sp.get("premium") === "1" || sp.get("vip") === "1");
  const [wdForm, setWdForm] = useState({ amount: 100 });
  const [customUsd, setCustomUsd] = useState(20);
  const cc = meta?.custom_coins || { per_usd: 10, bonus_pct: 2, min_usd: 1 };
  const customBase = Math.floor((Number(customUsd) || 0) * cc.per_usd);
  const customBonus = Math.floor(customBase * cc.bonus_pct / 100);

  const load = () => api.get("/wallet").then(r => setWallet(r.data));
  useEffect(() => { load(); }, []);

  const buy = async (pkg, usd) => {
    try {
      const { data } = await api.post("/payments/checkout", { package_id: pkg, origin_url: window.location.origin, usd_amount: usd });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error(e.response?.data?.detail || t("payment_init_failed", lang)); }
  };
  const buyCoins = async (tier) => {
    try { await api.post("/premium/buy-with-coins", { tier }); await refreshUser(); toast.success(tier === "vip" ? "VIP Premium активирован на 30 дней" : tier === "premium_lite" ? "Premium-lite активирован на 30 дней" : "Premium активирован на 30 дней"); }
    catch (e) { toast.error(e.response?.data?.detail === "Insufficient coins" ? "Недостаточно монет" : (e.response?.data?.detail || t("failed", lang))); }
  };
  const toggleAutoRenew = async (enabled) => {
    try { await api.post("/premium/auto-renew", { enabled }); await refreshUser(); toast.success(enabled ? t("autorenew_on_toast", lang) : t("autorenew_off_toast", lang)); }
    catch { toast.error(t("failed", lang)); }
  };
  const verified = wallet.payout_account?.status === "verified";
  const fee = Math.round(wdForm.amount * wallet.withdraw_commission * 100) / 100;
  const net = Math.round((wdForm.amount - fee) * 100) / 100;
  const netUsd = net / wallet.coins_per_usd;
  const minCoins = Math.ceil(wallet.min_withdraw_usd * wallet.coins_per_usd / (1 - wallet.withdraw_commission));
  const belowMin = netUsd < wallet.min_withdraw_usd;
  const withdraw = async () => {
    try { await api.post("/wallet/withdraw", { amount: wdForm.amount }); await refreshUser(); await load(); toast.success(t("withdrawal_requested", lang)); setWdOpen(false); }
    catch (e) {
      const d = e.response?.data?.detail || "";
      toast.error(d.startsWith("MIN_WITHDRAW:") ? t("min_withdraw_err", lang).replace("{n}", d.split(":")[1]) : d || t("failed", lang));
    }
  };
  const isPremium = user?.premium_until && new Date(user.premium_until) > new Date();

  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <h1 className="font-serif-luxe text-4xl flex items-center gap-3"><WalletIcon /> {t("wallet", lang)}</h1>
          <div className="flex gap-2">
            {wallet.is_admin && <Button data-testid="wallet-admin-link" onClick={() => nav("/admin")} variant="outline" className="bg-amber-500/10 border-amber-500/40 text-amber-300"><ShieldCheck size={16} className="me-1"/> {t("admin", lang)}</Button>}
            <Button data-testid="wallet-topup-stripe-button" onClick={() => setTopOpen(true)} className="rose-btn text-white border-0"><Coins size={16} className="me-1"/> {t("topup", lang)}</Button>
            <Button data-testid="wallet-withdraw-open-button" onClick={() => setWdOpen(true)} variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">{t("withdraw", lang)}</Button>
          </div>
        </div>

        {spinEligible && (
          <button data-testid="wallet-spin-cta" onClick={() => nav("/spin")} className="w-full flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-rose-500/10 p-4 text-left hover:from-amber-500/25 transition-colors">
            <span className="w-11 h-11 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center flex-shrink-0"><Sparkles size={20} className="text-amber-300" /></span>
            <div className="flex-1">
              <div className="font-serif-luxe text-lg text-amber-200">{t("sp_title", lang)}</div>
              <div className="text-xs text-slate-300">{t("sp_wallet_cta", lang)}</div>
            </div>
            <ArrowUpRight size={18} className="text-amber-300" />
          </button>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          <Card icon={Coins} title={t("balance", lang)} value={`🪙 ${(user?.coins ?? 0) + (user?.withdrawable ?? 0)}`} sub={(user?.withdrawable > 0) ? t("spendable_note", lang) : undefined} tone="amber" testid="wallet-balance-coins"/>
          <Card icon={Lock} title={t("escrow", lang)} value={`🪙 ${user?.escrow ?? 0}`} tone="violet" testid="wallet-escrow-coins"/>
          <Card icon={WalletIcon} title={t("withdrawable", lang)} value={`🪙 ${user?.withdrawable ?? 0}`} sub={`≈ $${((user?.withdrawable||0)*(1-wallet.withdraw_commission)/wallet.coins_per_usd).toFixed(2)} ${t("you_receive", lang).toLowerCase()} (−${Math.round(wallet.withdraw_commission*100)}%) · ${wallet.coins_per_usd} 🪙 = $1`} tone="emerald" testid="wallet-withdrawable-coins"/>
        </div>
        <p className="text-xs text-slate-400 -mt-4" data-testid="withdraw-only-note">{t("withdraw_only_note", lang)}</p>

        <PayoutAccountCard key={wallet.payout_account?.submitted_at || "new"} account={wallet.payout_account} onSaved={load} />
        <ReferralCard />

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center"><Crown className="text-amber-300"/></div>
              <div>
                <div className="font-serif-luxe text-xl">{t("premium", lang)}</div>
                {isPremium ? <>
                  <div className="text-xs text-emerald-300">{t("premium_active", lang)} · {new Date(user.premium_until).toLocaleDateString()}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5" data-testid="premium-autorenew-status">{user.premium_auto_renew === false ? `⛔ ${t("premium_autorenew_off", lang).replace("{d}", new Date(user.premium_until).toLocaleDateString())}` : `🔁 ${t("premium_autorenew_on", lang)}`}</div>
                </> : <div className="text-xs text-slate-400">${meta?.premium?.amount}{t("per_month", lang)} · {t("premium_perks_short", lang)}</div>}
              </div>
            </div>
            {!isPremium
              ? <Button data-testid="wallet-buy-premium-button" onClick={() => setPremOpen(true)} className="rose-btn text-white border-0">{t("buy_premium", lang)}</Button>
              : (user.premium_auto_renew === false
                  ? <Button data-testid="premium-enable-autorenew" onClick={() => toggleAutoRenew(true)} variant="outline" className="gold-btn">{t("enable_autorenew", lang)}</Button>
                  : <Button data-testid="premium-cancel-autorenew" onClick={() => toggleAutoRenew(false)} variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300">{t("cancel_autorenew", lang)}</Button>)}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-serif-luxe text-xl mb-3">{t("transactions", lang)}</h3>
          {wallet.transactions.length === 0 ? <div className="text-sm text-slate-500 py-6 text-center">{t("no_transactions", lang)}</div> : (
            <div className="divide-y divide-white/5">
              {wallet.transactions.map(tx => (
                <div key={tx.id} className="py-3 flex items-center gap-3" data-testid={`tx-row-${tx.id}`}>
                  <div className="text-2xl">{tx.type === "gift" ? tx.gift_icon : tx.type === "referral_bonus" ? "🎁" : "📞"}</div>
                  <div className="flex-1">
                    <div className="text-sm capitalize">{tx.type}</div>
                    <div className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleString()}</div>
                  </div>
                  <div className={`font-mono-num text-sm flex items-center gap-1 ${tx.from_id === user.id ? "text-red-300" : "text-emerald-300"}`}>
                    {tx.from_id === user.id ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                    🪙 {tx.from_id === user.id ? tx.cost : tx.net}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top-up dialog */}
      <Dialog open={topOpen} onOpenChange={setTopOpen}>
        <DialogContent className="bg-[#161320] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle className="font-serif-luxe text-2xl">{t("topup", lang)}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {(meta?.coin_packages || []).map(p => (
              <button key={p.id} data-testid={`topup-package-${p.id}`} onClick={() => buy(p.id)} className="w-full glass rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all">
                <div className="text-left">
                  <div className="font-serif-luxe text-lg">🪙 {p.coins}{p.bonus ? ` + ${p.bonus} bonus` : ""}</div>
                  <div className="text-xs text-slate-400">{p.name}</div>
                </div>
                <div className="text-amber-300 font-mono-num">${p.amount}</div>
              </button>
            ))}
            <div className="glass rounded-xl p-4 border border-violet-500/30" data-testid="topup-custom">
              <div className="flex items-center justify-between mb-2">
                <div className="font-serif-luxe text-lg">{t("custom_amount", lang)}</div>
                <div className="text-xs text-slate-400">{t("custom_hint", lang).replace("{n}", cc.per_usd).replace("{p}", cc.bonus_pct)}</div>
              </div>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <Input data-testid="topup-custom-usd-input" type="number" min={cc.min_usd} step="1" value={customUsd} onChange={e => setCustomUsd(e.target.value)} className="bg-white/5 border-white/10 ps-7 font-mono-num" />
                </div>
                <div className="text-sm font-mono-num text-amber-300 whitespace-nowrap" data-testid="topup-custom-coins">🪙 {customBase}{customBonus ? ` + ${customBonus}` : ""}</div>
                <Button data-testid="topup-custom-buy-button" disabled={!(Number(customUsd) >= cc.min_usd)} onClick={() => buy("custom", Number(customUsd))} className="rose-btn text-white border-0">{t("buy", lang)}</Button>
              </div>
            </div>
            <div data-testid="payment-methods-note" className="text-[11px] text-slate-400 flex items-start gap-2 pt-1">
              <span className="flex gap-1 text-base leading-none">💳 🅿️ 📱</span><span>{t("payment_methods_note", lang)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium dialog */}
      <Dialog open={premOpen} onOpenChange={setPremOpen}>
        <DialogContent className="bg-[#161320] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle className="font-serif-luxe text-2xl">{t("buy_premium", lang)}</DialogTitle></DialogHeader>
          <div className="glass rounded-xl p-5 text-center space-y-3 border border-sky-500/40" data-testid="premium-lite-purchase-card">
            <Crown size={40} className="mx-auto text-sky-400 fill-sky-500"/>
            <div className="font-serif-luxe text-2xl text-sky-200">{t("premium_lite", lang)} · ${meta?.premium_lite?.amount || 14.99}<span className="text-sm text-slate-400"> {t("per_month", lang)}</span></div>
            <ul className="text-sm text-slate-300 text-left space-y-1">
              <li>✓ {t("perk_unlimited_likes", lang)}</li>
              <li>✓ {t("perk_advanced_filters", lang)}</li>
              <li>✓ {t("perk_see_likes", lang)}</li>
              <li>✓ {t("perk_premium_placement", lang)}</li>
              <li className="text-slate-500">✗ {t("perk_no_vip_content", lang)}</li>
            </ul>
            <Button data-testid="premium-lite-subscribe-confirm" onClick={() => buy("premium_lite_monthly")} className="w-full h-11 bg-sky-600 hover:bg-sky-500 text-white border-0">{t("buy_premium_lite", lang)} · ${meta?.premium_lite?.amount || 14.99}</Button>
            <Button data-testid="premium-lite-buy-coins" onClick={() => buyCoins("premium_lite")} variant="outline" className="w-full bg-sky-500/10 border-sky-500/40 text-sky-200 h-10">🪙 {meta?.premium_lite_coins || 150}</Button>
          </div>
          <div className="glass rounded-xl p-5 text-center space-y-3 border border-amber-500/40 mt-3">
            <Crown size={40} className="mx-auto text-amber-300"/>
            <div className="font-serif-luxe text-2xl">{t("premium", lang)} · ${meta?.premium?.amount}<span className="text-sm text-slate-400"> {t("per_month", lang)}</span></div>
            <ul className="text-sm text-slate-300 text-left space-y-1">
              <li>✓ {t("perk_unlimited_likes", lang)}</li>
              <li>✓ {t("perk_top_placement", lang)}</li>
              <li>✓ {t("perk_advanced_filters", lang)}</li>
              <li>✓ {t("perk_see_likes", lang)}</li>
              <li>✓ {t("perk_free_msg_1", lang)}</li>
              <li>✓ {t("perk_free_automatch_1", lang)}</li>
            </ul>
            <Button data-testid="premium-subscribe-confirm" onClick={() => buy("premium_monthly")} className="rose-btn text-white border-0 w-full h-11">{t("buy_premium", lang)}</Button>
            <Button data-testid="premium-buy-coins" onClick={() => buyCoins("premium")} variant="outline" className="w-full bg-amber-500/10 border-amber-500/40 text-amber-200 h-10">🪙 {meta?.premium_coins || 300}</Button>
            <p data-testid="premium-autorenew-note" className="text-[11px] text-slate-400 leading-snug">{t("premium_autorenew_note", lang)}</p>
          </div>
          <div className="glass rounded-xl p-5 text-center space-y-3 border border-rose-500/40 mt-3" data-testid="vip-purchase-card">
            <Crown size={40} className="mx-auto text-rose-400 fill-rose-500"/>
            <div className="font-serif-luxe text-2xl gold-text">VIP · ${meta?.vip?.amount || 49.99}<span className="text-sm text-slate-400"> {t("per_month", lang)}</span></div>
            <ul className="text-sm text-slate-300 text-left space-y-1">
              <li className="text-rose-200 font-semibold">★ {t("perk_private_content", lang)}</li>
              <li>✓ {t("perk_unlimited_likes", lang)}</li>
              <li>✓ {t("perk_top_placement", lang)}</li>
              <li>✓ {t("perk_advanced_filters", lang)}</li>
              <li>✓ {t("perk_see_likes", lang)}</li>
              <li>✓ {t("perk_free_msg_3", lang)}</li>
              <li>✓ {t("perk_free_automatch_3", lang)}</li>
              <li>✓ {t("perk_priority_support", lang)}</li>
            </ul>
            <Button data-testid="vip-subscribe-confirm" onClick={() => buy("vip_monthly")} className="rose-btn text-white border-0 w-full h-11">VIP · ${meta?.vip?.amount || 49.99}</Button>
            <Button data-testid="vip-buy-coins" onClick={() => buyCoins("vip")} variant="outline" className="w-full bg-rose-500/10 border-rose-500/40 text-rose-200 h-10">🪙 {meta?.vip_coins || 500}</Button>
            <p className="text-[11px] text-slate-400 leading-snug">{t("premium_autorenew_note", lang)}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw dialog */}
      <Dialog open={wdOpen} onOpenChange={setWdOpen}>
        <DialogContent className="bg-[#161320] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle className="font-serif-luxe text-2xl">{t("withdraw", lang)}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!verified && <div data-testid="withdraw-verify-warning" className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">⚠️ {t("verify_bank_first", lang)}</div>}
            <div><Label className="text-xs text-slate-400">{t("withdraw_amount", lang)}</Label>
              <Input data-testid="withdraw-amount-input" type="number" min="100" max={user?.withdrawable} value={wdForm.amount} onChange={e => setWdForm({ amount: parseFloat(e.target.value||0) })} className="bg-white/5 border-white/10 mt-1"/></div>
            {verified && <div className="text-xs text-slate-400">{t("bank", lang)}: {wallet.payout_account.bank_name} ····{wallet.payout_account.iban.slice(-4)}</div>}
            <div className="glass rounded-lg p-3 text-sm space-y-1 font-mono-num" data-testid="withdraw-breakdown">
              <div className="flex justify-between text-slate-400"><span>{t("commission", lang)} {Math.round(wallet.withdraw_commission*100)}%</span><span className="text-rose-300">− 🪙 {fee}</span></div>
              <div className="flex justify-between"><span>{t("you_receive", lang)}</span><span className={belowMin ? "text-rose-300" : "text-emerald-300"}>🪙 {net} ≈ ${netUsd.toFixed(2)}</span></div>
              <div data-testid="withdraw-min-note" className={`text-xs ${belowMin ? "text-rose-300" : "text-slate-500"}`}>{t("min_withdraw_note", lang).replace("{n}", wallet.min_withdraw_usd).replace("{c}", minCoins)}</div>
            </div>
            <Button data-testid="wallet-withdraw-submit-button" disabled={!verified || belowMin} onClick={withdraw} className="rose-btn text-white border-0 w-full h-11">{t("withdraw", lang)}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Card({ icon: Icon, title, value, sub, tone, testid }) {
  const tones = {
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    violet: "bg-violet-500/10 border-violet-500/30 text-violet-300",
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  };
  return (
    <div className={`glass rounded-2xl p-5 border ${tones[tone]}`} data-testid={testid}>
      <div className="flex items-center gap-2 text-xs uppercase font-mono tracking-widest">
        <Icon size={14}/> {title}
      </div>
      <div className="mt-2 font-serif-luxe text-3xl">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1 font-mono-num">{sub}</div>}
    </div>
  );
}
