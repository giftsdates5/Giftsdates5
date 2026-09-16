import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

export default function VideoCallModal({ open, onOpenChange, target }) {
  const { user, meta, lang, refreshUser } = useApp();
  const rate = Math.max(target?.video_rate || 0, meta?.video_rate || 10);
  const [minutes, setMinutes] = useState(5);
  const [phase, setPhase] = useState("setup"); // setup | connecting | in_call | ended
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const timerRef = useRef();

  useEffect(() => {
    if (!open) { setPhase("setup"); setElapsed(0); clearInterval(timerRef.current); }
  }, [open]);

  const start = async () => {
    const cost = minutes * rate;
    if (user.coins < cost) { toast.error(t("not_enough_coins", lang)); return; }
    setPhase("connecting");
    try {
      await api.post("/videocalls/start", { target_id: target.id, minutes });
      await refreshUser();
      setTimeout(() => {
        setPhase("in_call");
        timerRef.current = setInterval(() => setElapsed(x => {
          if (x + 1 >= minutes * 60) { clearInterval(timerRef.current); setPhase("ended"); return minutes * 60; }
          return x + 1;
        }), 1000);
      }, 1200);
    } catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); setPhase("setup"); }
  };
  const end = () => { clearInterval(timerRef.current); setPhase("ended"); };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const cost = minutes * rate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0D0B12] border-white/10 text-white max-w-2xl p-0 overflow-hidden">
        {phase === "setup" && (
          <div className="p-6 space-y-4">
            <h3 className="font-serif-luxe text-2xl">{t("video_call", lang)} · {target?.name}</h3>
            <Label className="text-xs text-slate-400">{t("duration_min", lang)}</Label>
            <Input data-testid="videocall-minutes-input" type="number" min={1} max={60} value={minutes} onChange={e => setMinutes(parseInt(e.target.value || 1))} className="bg-white/5 border-white/10" />
            <div className="glass rounded-xl p-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">{t("rate", lang)}</span><span className="font-mono-num text-amber-300">🪙 {rate}/{t("minutes", lang)}</span></div>
              <div className="flex justify-between mt-1"><span className="text-slate-400">{t("cost", lang)}</span><span className="font-mono-num text-amber-300">🪙 {cost}</span></div>
              <div className="flex justify-between mt-1"><span className="text-slate-400">{t("balance", lang)}</span><span className="font-mono-num">🪙 {user?.coins}</span></div>
            </div>
            <Button data-testid="videocall-start-button" onClick={start} className="rose-btn text-white border-0 w-full h-11">{t("start_call", lang)}</Button>
          </div>
        )}
        {(phase === "connecting" || phase === "in_call") && (
          <div className="relative aspect-video bg-gradient-to-br from-rose-900/40 via-violet-900/40 to-amber-900/30 flex items-center justify-center">
            <div className="text-center">
              {phase === "connecting" && <p className="font-mono text-slate-300 animate-pulse">{t("connecting", lang)}</p>}
              {phase === "in_call" && (
                <>
                  <div className="w-32 h-32 rounded-full mx-auto bg-gradient-to-br from-rose-500 to-violet-500 flex items-center justify-center text-5xl font-serif-luxe">{target?.name?.[0]}</div>
                  <div className="mt-4 font-serif-luxe text-3xl">{target?.name}</div>
                  <div className="mt-1 text-amber-300 font-mono-num text-lg">{mm}:{ss}</div>
                  <div className="text-xs text-slate-400">🪙 {Math.min(minutes*60, elapsed) * rate/60 | 0} of {cost}</div>
                </>
              )}
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <Button data-testid="videocall-mute-button" onClick={() => setMuted(!muted)} size="icon" variant="outline" className="rounded-full h-12 w-12 bg-white/10 border-white/20">{muted ? <MicOff size={18} /> : <Mic size={18} />}</Button>
              <Button data-testid="videocall-camera-button" onClick={() => setCamOff(!camOff)} size="icon" variant="outline" className="rounded-full h-12 w-12 bg-white/10 border-white/20">{camOff ? <VideoOff size={18} /> : <VideoIcon size={18} />}</Button>
              <Button data-testid="videocall-end-button" onClick={end} size="icon" className="rounded-full h-14 w-14 bg-red-600 hover:bg-red-700 border-0"><PhoneOff size={20} /></Button>
            </div>
          </div>
        )}
        {phase === "ended" && (
          <div className="p-8 text-center space-y-3">
            <div className="text-5xl">📞</div>
            <div className="font-serif-luxe text-2xl">{t("call_ended", lang)}</div>
            <div className="text-sm text-slate-400">{mm}:{ss} · 🪙 {cost} charged</div>
            <Button data-testid="videocall-close-button" onClick={() => onOpenChange(false)} className="rose-btn text-white border-0">{t("close", lang)}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
