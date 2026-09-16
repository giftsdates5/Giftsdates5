import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Sparkles, Crown, Gift } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

const PRIZES = [
  { label: "10", icon: "🪙" }, { label: "20", icon: "🪙" }, { label: "30", icon: "🪙" },
  { label: "40", icon: "🪙" }, { label: "50", icon: "🪙" }, { label: "60", icon: "🪙" },
  { label: "100", icon: "🪙" }, { label: "PREMIUM", icon: "👑" },
];
const COLORS = ["#f43f5e", "#9f1239", "#fb7185", "#9f1239", "#f43f5e", "#9f1239", "#fb7185", "#f59e0b"];
const SEG = 45;
const GRAD = `conic-gradient(from -22.5deg, ${COLORS.map((c, i) => `${c} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(", ")})`;

export default function SpinPage() {
  const { lang, refreshUser, refreshSpin } = useApp();
  const [status, setStatus] = useState(null);
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { api.get("/spin/status").then(r => setStatus(r.data)).catch(() => {}); }, []);

  const spin = async () => {
    if (spinning) return;
    setSpinning(true);
    try {
      const { data } = await api.post("/spin/claim");
      const p = data.prize;
      const target = 360 * 6 + (360 - (p.index || 0) * SEG);
      setRot(target);
      setTimeout(async () => { setResult(p); setSpinning(false); await refreshUser(); await refreshSpin(); }, 4300);
    } catch (e) {
      setSpinning(false);
      toast.error(e.response?.data?.detail || t("failed", lang));
      if ((e.response?.data?.detail || "").includes("Already")) setStatus({ eligible: false });
    }
  };

  const prizeText = (p) => p.type === "premium" ? t("spin_premium_prize", lang) : t("spin_coins_prize", lang).replace("{n}", p.coins);

  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)]">
      <div className="max-w-lg mx-auto px-4 py-12 text-center" data-testid="spin-page">
        <h1 className="font-serif-luxe text-4xl flex items-center justify-center gap-2"><Sparkles className="text-amber-300" /> {t("sp_title", lang)}</h1>
        <p className="text-sm text-slate-400 mt-2">{t("sp_subtitle", lang)}</p>

        <div className="relative mx-auto my-8" style={{ width: 320, height: 320 }} data-testid="spin-wheel">
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-20" style={{ width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "22px solid #fbbf24" }} />
          <div className="absolute inset-0 rounded-full border-4 border-amber-400/60 shadow-[0_0_40px_rgba(245,158,11,0.35)]" style={{ background: GRAD, transform: `rotate(${rot}deg)`, transition: "transform 4.2s cubic-bezier(0.16,1,0.3,1)" }}>
            {PRIZES.map((p, i) => (
              <div key={i} className="absolute inset-0" style={{ transform: `rotate(${i * SEG}deg)` }}>
                <div className="absolute left-1/2 top-2 -translate-x-1/2 w-14 text-center leading-none">
                  <div className="text-base">{p.icon}</div>
                  <div className={`font-bold ${p.label === "PREMIUM" ? "text-[9px]" : "text-xs"} text-white drop-shadow`}>{p.label}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#141019] border-4 border-amber-400/70 z-10 flex items-center justify-center"><Crown size={18} className="text-amber-300" /></div>
        </div>

        {result ? (
          <div data-testid="spin-result" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
            <div className="text-xs uppercase tracking-widest text-amber-300">{t("spin_you_won", lang)}</div>
            <div className="font-serif-luxe text-3xl mt-1">{result.type === "premium" ? "👑 " : "🪙 "}{prizeText(result)}</div>
          </div>
        ) : status && !status.eligible ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300" data-testid="spin-not-eligible">
            {t("sp_already", lang)}{status.last ? ` ${t("sp_last_win", lang)}: ${status.last.type === "premium" ? t("spin_premium_prize", lang) : "🪙" + status.last.coins}` : ""}
          </div>
        ) : (
          <Button data-testid="spin-go-btn" onClick={spin} disabled={spinning || !status} className="rose-btn text-white border-0 h-12 px-8 text-base">
            <Gift size={18} className="me-2" /> {spinning ? t("spin_spinning", lang) : t("spin_go", lang)}
          </Button>
        )}
      </div>
    </div>
  );
}
