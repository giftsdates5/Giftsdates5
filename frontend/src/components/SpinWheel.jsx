import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { Gift, Crown, Sparkles } from "lucide-react";

const PRIZES = [
  { label: "10", icon: "🪙" }, { label: "20", icon: "🪙" }, { label: "30", icon: "🪙" },
  { label: "40", icon: "🪙" }, { label: "50", icon: "🪙" }, { label: "60", icon: "🪙" },
  { label: "100", icon: "🪙" }, { label: "PREMIUM", icon: "👑" },
];
const COLORS = ["#f43f5e", "#9f1239", "#fb7185", "#9f1239", "#f43f5e", "#9f1239", "#fb7185", "#f59e0b"];
const SEG = 45;
const GRAD = `conic-gradient(from -22.5deg, ${COLORS.map((c, i) => `${c} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(", ")})`;

function readStored() {
  try {
    const p = JSON.parse(localStorage.getItem("gd_spin_prize") || "null");
    return p && localStorage.getItem("gd_spin_token") ? p : null;
  } catch { return null; }
}

export const SpinWheel = ({ onClaim, triggerVariant = "outline", triggerClass = "" }) => {
  const { lang } = useApp();
  const [open, setOpen] = useState(false);
  const stored = readStored();
  const [result, setResult] = useState(stored);
  const [spinning, setSpinning] = useState(false);
  const [rot, setRot] = useState(stored ? 360 - stored.index * SEG : 0);

  const prizeText = (p) => p.type === "premium"
    ? t("spin_premium_prize", lang)
    : t("spin_coins_prize", lang).replace("{n}", p.coins);

  const doSpin = async () => {
    if (spinning || result) return;
    setSpinning(true);
    try {
      const { data } = await api.post("/spin");
      const target = 360 * 6 + (360 - data.index * SEG);
      setRot(target);
      setTimeout(() => {
        const prize = { type: data.type, coins: data.coins, premium_days: data.premium_days, label: data.label, index: data.index };
        localStorage.setItem("gd_spin_token", data.token);
        localStorage.setItem("gd_spin_prize", JSON.stringify(prize));
        setResult(prize);
        setSpinning(false);
      }, 4300);
    } catch {
      setSpinning(false);
    }
  };

  const claim = () => { setOpen(false); onClaim && onClaim(); };

  return (
    <>
      <Button data-testid="spin-open-btn" onClick={() => setOpen(true)} variant={triggerVariant}
        className={`h-12 px-6 text-base bg-amber-500/15 border-amber-500/40 text-amber-200 hover:bg-amber-500/25 ${triggerClass}`}>
        <Gift size={16} className="me-2" /> {t("spin_win_btn", lang)}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#141019] border-white/10 text-white sm:max-w-md" data-testid="spin-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif-luxe text-2xl flex items-center gap-2">
              <Sparkles size={20} className="text-amber-300" /> {t("spin_title", lang)}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400 -mt-1">{t("spin_sub", lang)}</p>

          <div className="relative mx-auto my-4" style={{ width: 300, height: 300 }} data-testid="spin-wheel">
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-20"
              style={{ width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "22px solid #fbbf24" }} />
            <div className="absolute inset-0 rounded-full border-4 border-amber-400/60 shadow-[0_0_40px_rgba(245,158,11,0.35)] pointer-events-none"
              style={{ background: GRAD, transform: `rotate(${rot}deg)`, transition: "transform 4.2s cubic-bezier(0.16,1,0.3,1)" }}>
              {PRIZES.map((p, i) => (
                <div key={i} className="absolute inset-0" style={{ transform: `rotate(${i * SEG}deg)` }}>
                  <div className="absolute left-1/2 top-2 -translate-x-1/2 w-14 text-center leading-none">
                    <div className="text-base">{p.icon}</div>
                    <div className={`font-bold ${p.label === "PREMIUM" ? "text-[9px]" : "text-xs"} text-white drop-shadow`}>{p.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#141019] border-4 border-amber-400/70 z-10 flex items-center justify-center">
              <Crown size={18} className="text-amber-300" />
            </div>
          </div>

          {!result ? (
            <Button data-testid="spin-go-btn" onClick={doSpin} disabled={spinning}
              className="w-full rose-btn text-white border-0 h-12 text-base">
              {spinning ? t("spin_spinning", lang) : t("spin_go", lang)}
            </Button>
          ) : (
            <div data-testid="spin-result" className="text-center space-y-3">
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                <div className="text-xs uppercase tracking-widest text-amber-300">{t("spin_you_won", lang)}</div>
                <div className="font-serif-luxe text-3xl mt-1">
                  {result.type === "premium" ? "👑 " : "🪙 "}{prizeText(result)}
                </div>
              </div>
              <Button data-testid="spin-claim-btn" onClick={claim} className="w-full rose-btn text-white border-0 h-12 text-base">
                {t("spin_claim", lang)}
              </Button>
            </div>
          )}
          <p className="text-center text-[11px] text-slate-500">{t("spin_locked_note", lang)}</p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SpinWheel;
