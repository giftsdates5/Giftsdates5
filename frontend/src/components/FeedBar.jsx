import React, { useEffect, useRef, useState } from "react";
import { Plus, Video as VideoIcon, Trash2, Play, Circle as RecDot, Square, Upload } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { api, fileUrl } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

const MAX_CHARS = 80;
const MAX_SECONDS = 60;
const FB_W = "https://images.unsplash.com/photo-1581841064838-a470c740e8ee?crop=entropy&cs=srgb&fm=jpg&q=85&w=200";
const FB_M = "https://images.unsplash.com/photo-1545996124-0501ebae84d0?crop=entropy&cs=srgb&fm=jpg&q=85&w=200";
const avatarUrl = (it) => (it.user_avatar ? fileUrl(it.user_avatar) : (String(it.gender || "").toLowerCase().startsWith("m") ? FB_M : FB_W));

const Circle = ({ it, onClick }) => (
  <button data-testid={`feed-item-${it.id}`} onClick={onClick} className="flex flex-col items-center gap-1.5 shrink-0 w-[92px] group">
    {it.text && (
      <div className="px-2 py-1 rounded-lg bg-[#1A0A14] gold-hairline text-[10px] text-amber-100 leading-tight w-[92px] text-center whitespace-pre-wrap break-words">{it.text}</div>
    )}
    <div className={`w-16 h-16 rounded-full p-[2px] ${it.has_video ? "bg-gradient-to-tr from-rose-500 to-red-600" : "bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB]"}`}>
      <div className="w-full h-full rounded-full overflow-hidden bg-[#1A0A14] relative">
        <img src={avatarUrl(it)} alt="" className="w-full h-full object-cover" />
        {it.has_video && <span className="absolute bottom-0 right-0 bg-red-600 rounded-full p-0.5"><Play size={9} className="text-white fill-white" /></span>}
      </div>
    </div>
    <span className="text-[10px] text-slate-400 truncate w-full text-center">{it.user_name}{it.user_age ? `, ${it.user_age}` : ""}</span>
    {(it.user_city || it.user_country) && <span className="text-[9px] text-slate-500 truncate w-full text-center">{[it.user_city, it.user_country].filter(Boolean).join(", ")}</span>}
  </button>
);

export default function FeedBar() {
  const { user, lang, refreshUser } = useApp();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [compose, setCompose] = useState(false);
  const [view, setView] = useState(null);
  const [text, setText] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const [fCountry, setFCountry] = useState("");
  const [fCity, setFCity] = useState("");
  // recorder
  const [recOpen, setRecOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const streamRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const previewRef = useRef(null);
  const timerRef = useRef(null);

  const load = () => {
    const params = {};
    if (fCountry.trim()) params.country = fCountry.trim();
    if (fCity.trim()) params.city = fCity.trim();
    return api.get("/feed", { params }).then((r) => setItems(r.data)).catch(() => {});
  };
  useEffect(() => { const id = setTimeout(load, 300); return () => clearTimeout(id); }, [fCountry, fCity]); // eslint-disable-line
  useEffect(() => () => closeRecorder(), []); // eslint-disable-line

  const cost = (text.trim() ? 100 : 0) + (videoFile ? 150 : 0);

  const pickVideo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast.error(t("feed_not_video", lang)); return; }
    const url = URL.createObjectURL(f);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (v.duration > MAX_SECONDS + 0.5) { toast.error(t("feed_video_too_long", lang)); if (fileRef.current) fileRef.current.value = ""; return; }
      setVideoFile(f);
    };
    v.onerror = () => { URL.revokeObjectURL(url); toast.error(t("feed_not_video", lang)); };
    v.src = url;
  };

  const openRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      streamRef.current = stream;
      setRecOpen(true);
      setTimeout(() => { if (previewRef.current) { previewRef.current.srcObject = stream; previewRef.current.muted = true; previewRef.current.play().catch(() => {}); } }, 120);
    } catch { toast.error(t("feed_camera_error", lang)); }
  };

  const startRec = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
    const mr = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const type = mr.mimeType || "video/webm";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunksRef.current, { type });
      setVideoFile(new File([blob], `feed_${Date.now()}.${ext}`, { type }));
      closeRecorder();
    };
    recRef.current = mr;
    mr.start();
    setRecording(true); setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((s) => {
        const n = s + 1;
        if (n >= MAX_SECONDS) { setTimeout(stopRec, 0); return MAX_SECONDS; }
        return n;
      });
    }, 1000);
  };

  const stopRec = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
    try { if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop(); } catch { /* noop */ }
  };

  function closeRecorder() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((tr) => tr.stop()); streamRef.current = null; }
    setRecording(false); setRecOpen(false); setElapsed(0);
  }

  const submit = async () => {
    if (!text.trim() && !videoFile) { toast.error(t("feed_empty", lang)); return; }
    if (((user?.coins || 0) + (user?.withdrawable || 0)) < cost) { toast.error(t("feed_insufficient", lang), { action: { label: t("topup", lang), onClick: () => nav("/wallet") } }); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("text", text.trim());
      if (videoFile) fd.append("video", videoFile);
      await api.post("/feed", fd);
      toast.success(t("feed_posted", lang));
      setText(""); setVideoFile(null); if (fileRef.current) fileRef.current.value = "";
      setCompose(false);
      await Promise.all([load(), refreshUser()]);
    } catch (e) {
      const d = e.response?.data?.detail || "";
      if (d === "INSUFFICIENT_COINS") toast.error(t("feed_insufficient", lang), { action: { label: t("topup", lang), onClick: () => nav("/wallet") } });
      else if (d === "VIDEO_TOO_LARGE") toast.error(t("feed_video_large", lang));
      else toast.error(t("failed", lang));
    } finally { setBusy(false); }
  };

  const remove = async (it) => {
    try { await api.delete(`/feed/${it.id}`); toast.success(t("feed_deleted", lang)); setView(null); load(); }
    catch { toast.error(t("failed", lang)); }
  };

  const mmss = (s) => `0:${String(s).padStart(2, "0")}`;

  return (
    <div className="glass rounded-2xl p-4 mb-6" data-testid="feed-bar">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-serif-luxe text-lg gold-text">{t("feed_title", lang)}</h2>
        <div className="flex items-center gap-2">
          <input data-testid="feed-filter-country" value={fCountry} onChange={(e) => setFCountry(e.target.value)} placeholder={t("feed_filter_country", lang)} className="w-28 bg-white/5 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-400/40" />
          <input data-testid="feed-filter-city" value={fCity} onChange={(e) => setFCity(e.target.value)} placeholder={t("feed_filter_city", lang)} className="w-28 bg-white/5 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-400/40" />
          {(fCountry || fCity) && <button data-testid="feed-filter-clear" onClick={() => { setFCountry(""); setFCity(""); }} className="text-[11px] text-slate-400 hover:text-amber-300">{t("feed_filter_clear", lang)}</button>}
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        <button data-testid="feed-add-button" onClick={() => setCompose(true)} className="flex flex-col items-center gap-1.5 shrink-0 w-[92px]">
          <div className="w-16 h-16 mt-[22px] rounded-full border-2 border-dashed border-amber-400/50 flex items-center justify-center text-amber-300 hover:bg-white/5 transition-colors"><Plus size={22} /></div>
          <span className="text-[10px] text-slate-400">{t("feed_add", lang)}</span>
        </button>
        {items.map((it) => <Circle key={it.id} it={it} onClick={() => setView(it)} />)}
        {items.length === 0 && <div className="flex items-center text-sm text-slate-500 px-3">{t("feed_empty_list", lang)}</div>}
      </div>

      {/* Composer */}
      <Dialog open={compose} onOpenChange={(v) => { setCompose(v); if (!v) closeRecorder(); }}>
        <DialogContent className="bg-[#161018] border-white/10 text-white max-w-md" data-testid="feed-composer">
          <DialogHeader><DialogTitle className="font-serif-luxe text-2xl gold-text">{t("feed_add", lang)}</DialogTitle></DialogHeader>
          <div className="relative">
            <Textarea data-testid="feed-text-input" value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))} maxLength={MAX_CHARS} rows={2} placeholder={t("feed_placeholder", lang)} className="bg-white/5 border-white/15 text-white placeholder:text-slate-500" />
            <span className="absolute bottom-2 right-2 text-[10px] text-slate-500">{text.length}/{MAX_CHARS} · 🪙100</span>
          </div>

          {videoFile ? (
            <div className="rounded-xl bg-white/5 gold-hairline px-3 py-2.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm text-emerald-300"><VideoIcon size={16} /> {videoFile.name.slice(0, 22)} · 🪙150</span>
              <button data-testid="feed-video-remove" onClick={() => { setVideoFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-[11px] text-rose-300">{t("remove", lang)}</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <input ref={fileRef} data-testid="feed-video-input" type="file" accept="video/*" onChange={pickVideo} className="hidden" id="feed-video" />
              <label htmlFor="feed-video" className="flex flex-col items-center gap-1 rounded-xl bg-white/5 gold-hairline px-3 py-3 cursor-pointer hover:bg-white/10 transition-colors text-center">
                <Upload size={18} className="text-amber-300" />
                <span className="text-xs text-slate-200">{t("feed_video_add", lang)}</span>
              </label>
              <button data-testid="feed-record-button" onClick={openRecorder} className="flex flex-col items-center gap-1 rounded-xl bg-white/5 gold-hairline px-3 py-3 hover:bg-white/10 transition-colors text-center">
                <VideoIcon size={18} className="text-rose-400" />
                <span className="text-xs text-slate-200">{t("feed_record", lang)} · 🪙150</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-slate-400">{t("balance", lang)}: <span className="font-mono-num text-amber-300">🪙 {user?.coins}</span></span>
            <span data-testid="feed-cost" className="text-sm font-mono-num text-amber-300">{t("feed_total", lang)}: 🪙 {cost}</span>
          </div>
          <Button data-testid="feed-submit" onClick={submit} disabled={busy || cost === 0} className="rose-btn text-white border-0 h-11">{busy ? t("feed_posting", lang) : `${t("feed_post", lang)} · 🪙 ${cost}`}</Button>
        </DialogContent>
      </Dialog>

      {/* Recorder */}
      <Dialog open={recOpen} onOpenChange={(v) => { if (!v) closeRecorder(); }}>
        <DialogContent className="bg-[#161018] border-white/10 text-white max-w-md" data-testid="feed-recorder">
          <DialogHeader><DialogTitle className="font-serif-luxe text-xl gold-text flex items-center gap-2"><VideoIcon size={18} /> {t("feed_record", lang)}</DialogTitle></DialogHeader>
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video ref={previewRef} data-testid="feed-recorder-preview" playsInline muted className="w-full h-full object-cover" />
            {recording && <span className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-0.5 text-xs text-red-400"><RecDot size={10} className="fill-red-500 text-red-500 animate-pulse" /> {t("feed_recording", lang)} {mmss(elapsed)} / {mmss(MAX_SECONDS)}</span>}
          </div>
          <div className="flex justify-center">
            {!recording ? (
              <Button data-testid="feed-rec-start" onClick={startRec} className="rose-btn text-white border-0 h-11 px-6"><RecDot size={16} className="mr-2 fill-white" /> {t("feed_start_rec", lang)}</Button>
            ) : (
              <Button data-testid="feed-rec-stop" onClick={stopRec} className="bg-white text-black hover:bg-slate-200 h-11 px-6"><Square size={15} className="mr-2 fill-black" /> {t("feed_stop", lang)}</Button>
            )}
          </div>
          <p className="text-[11px] text-slate-500 text-center">{t("feed_video_too_long", lang)}</p>
        </DialogContent>
      </Dialog>

      {/* Viewer */}
      <Dialog open={!!view} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="bg-[#161018] border-white/10 text-white max-w-md" data-testid="feed-viewer">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <img src={avatarUrl(view)} alt="" className="w-10 h-10 rounded-full object-cover" />
                  <button onClick={() => { nav(`/profile/${view.user_id}`); setView(null); }} className="font-serif-luxe text-xl hover:text-amber-300">{view.user_name}</button>
                </DialogTitle>
              </DialogHeader>
              {view.video_path && <video data-testid="feed-video-player" src={fileUrl(view.video_path)} controls autoPlay className="w-full rounded-xl max-h-[60vh] bg-black" />}
              {view.text && <p className="text-slate-200 leading-relaxed">{view.text}</p>}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">{new Date(view.created_at).toLocaleString()}</span>
                {(view.user_id === user?.id || user?.is_admin) && (
                  <button data-testid={`feed-delete-${view.id}`} onClick={() => remove(view)} className="flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200"><Trash2 size={13} /> {t("delete", lang)}</button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
