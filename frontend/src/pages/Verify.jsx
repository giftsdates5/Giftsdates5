import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, IdCard, Camera, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { api, fileUrl } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

function UploadBox({ kind, icon: Icon, label, path, onUploaded }) {
  const { lang } = useApp();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try { const fd = new FormData(); fd.append("file", file); const { data } = await api.post(`/verification/upload?kind=${kind}`, fd, { headers: { "Content-Type": "multipart/form-data" } }); onUploaded(data); toast.success(t("uploaded", lang)); }
    catch (e) { toast.error(e.response?.data?.detail || t("upload_failed", lang)); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  return (
    <div data-testid={`verify-${kind}-box`} className={`glass rounded-2xl p-5 border ${path ? "border-emerald-500/40" : "border-white/10"}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><Icon className={path ? "text-emerald-300" : "text-slate-300"} /></div>
        <div className="font-serif-luxe text-lg">{label}</div>
        {path && <CheckCircle2 size={18} className="text-emerald-300 ms-auto" />}
      </div>
      {path ? <img src={fileUrl(path)} alt="" className="w-full aspect-[4/3] object-cover rounded-xl border border-white/10 mb-3" /> :
        <div className="w-full aspect-[4/3] rounded-xl border border-dashed border-white/15 flex items-center justify-center text-slate-500 text-sm mb-3">{label}</div>}
      <Button data-testid={`verify-${kind}-upload-button`} disabled={busy} onClick={() => ref.current?.click()} variant="outline" className="w-full bg-white/5 border-white/10 hover:bg-white/10">
        {busy ? <Loader2 size={14} className="animate-spin me-1" /> : <Camera size={14} className="me-1" />} {path ? t("uploaded", lang) + " · ✎" : t("upload", lang)}
      </Button>
      <input ref={ref} data-testid={`verify-${kind}-file-input`} type="file" accept="image/*" capture={kind === "selfie" ? "user" : undefined} className="hidden" onChange={e => upload(e.target.files?.[0])} />
    </div>
  );
}

export default function Verify() {
  const { lang, refreshUser } = useApp();
  const nav = useNavigate();
  const [v, setV] = useState(null);
  useEffect(() => { api.get("/verification").then(r => setV(r.data)).catch(() => setV({ status: "none" })); }, []);
  if (!v) return <div className="aurora-bg min-h-[calc(100vh-4rem)]" />;
  const done = v.status === "pending" || v.status === "verified";

  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)]" data-testid="verify-page">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-serif-luxe text-4xl sm:text-5xl flex items-center gap-3"><ShieldCheck className="text-amber-300" /> {t("verify_identity", lang)}</h1>
        <p className="text-slate-400 mt-2 mb-6 text-sm">{t("verify_intro", lang)}</p>
        {v.status === "verified" && <div data-testid="verify-status-verified" className="glass rounded-2xl p-4 mb-6 border border-emerald-500/40 text-emerald-300 flex items-center gap-2"><CheckCircle2 size={18} /> {t("verification_verified", lang)}</div>}
        {v.status === "pending" && <div data-testid="verify-status-pending" className="glass rounded-2xl p-4 mb-6 border border-amber-500/40 text-amber-300 flex items-center gap-2"><Clock size={18} /> {t("verification_pending", lang)}</div>}
        {v.status === "rejected" && <div data-testid="verify-status-rejected" className="glass rounded-2xl p-4 mb-6 border border-rose-500/40 text-rose-300">{t("status_rejected", lang)}{v.reason ? ` — ${v.reason}` : ""}</div>}
        {v.status !== "verified" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <UploadBox kind="id" icon={IdCard} label={t("id_document", lang)} path={v.id_path} onUploaded={(d) => { setV(d); refreshUser(); }} />
            <UploadBox kind="selfie" icon={Camera} label={t("selfie_with_id", lang)} path={v.selfie_path} onUploaded={(d) => { setV(d); refreshUser(); }} />
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <Button data-testid="verify-continue-button" onClick={() => nav("/browse")} className="rose-btn text-white border-0 h-11 px-8">{done ? t("continue", lang) : t("skip_for_now", lang)}</Button>
        </div>
      </div>
    </div>
  );
}
