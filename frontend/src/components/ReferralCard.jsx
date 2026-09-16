import React, { useEffect, useState } from "react";
import { Users, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

export default function ReferralCard() {
  const { lang } = useApp();
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { api.get("/referrals").then(r => setData(r.data)).catch(() => {}); }, []);
  if (!data) return null;
  const link = `${window.location.origin}/auth?register=1&ref=${data.code}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true); toast.success(t("copy_link", lang)); setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="glass rounded-2xl p-5" data-testid="referral-card">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center"><Users className="text-violet-300" /></div>
        <div>
          <div className="font-serif-luxe text-xl">{t("referrals", lang)}</div>
          <div className="text-xs text-slate-400" data-testid="referral-hint">{data.package ? t("referral_hint_pkg", lang).replace("{n}", data.bonus).replace("{p}", data.package.name) : t("referral_hint", lang).replace("{n}", data.bonus)}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] font-mono text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 truncate" data-testid="referral-link">{link}</div>
        <Button data-testid="referral-copy-button" onClick={copy} variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">{copied ? <Check size={14} className="me-1" /> : <Copy size={14} className="me-1" />} {t("copy_link", lang)}</Button>
      </div>
      <div className="mt-3 flex gap-6 text-xs text-slate-400">
        <span>{t("referral_code", lang)}: <b className="text-white font-mono" data-testid="referral-code">{data.code}</b></span>
        <span>{t("invited", lang)}: <b className="text-white" data-testid="referral-invited-count">{data.invited.length}</b></span>
        <span>{t("earned", lang)}: <b className="text-amber-300" data-testid="referral-earned">🪙 {data.earned}</b></span>
      </div>
    </div>
  );
}
