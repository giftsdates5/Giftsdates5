import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { api, fileUrl } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

export default function AdminVerifications() {
  const { lang } = useApp();
  const [items, setItems] = useState([]);
  const load = () => api.get("/admin/verifications").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const verify = async (uid, approve) => {
    const reason = approve ? "" : (window.prompt(t("reason", lang)) || "");
    try { await api.post(`/admin/verifications/${uid}/verify`, { approve, reason }); toast.success(approve ? t("approve", lang) : t("reject", lang)); load(); }
    catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); }
  };
  return (
    <div className="glass rounded-2xl p-5" data-testid="admin-verifications">
      <h3 className="font-serif-luxe text-xl mb-3">{t("verify_identity", lang)} · {t("status_pending", lang)} ({items.length})</h3>
      {items.length === 0 ? <div className="text-sm text-slate-500 py-4 text-center">—</div> : items.map(u => (
        <div key={u.id} data-testid={`admin-verification-${u.id}`} className="py-4 border-t border-white/5 grid sm:grid-cols-[1fr_180px_180px_auto] gap-3 items-center">
          <div>
            <div className="text-sm">{u.name}, {u.age} <span className="text-slate-500">· {u.email}</span></div>
            <div className="text-xs text-slate-400">{u.city}, {u.country} · {u.verification?.submitted_at && new Date(u.verification.submitted_at).toLocaleString()}</div>
          </div>
          <a href={fileUrl(u.verification.id_path)} target="_blank" rel="noreferrer"><img src={fileUrl(u.verification.id_path)} alt="ID" className="w-full aspect-[4/3] object-cover rounded-lg border border-white/10" /></a>
          <a href={fileUrl(u.verification.selfie_path)} target="_blank" rel="noreferrer"><img src={fileUrl(u.verification.selfie_path)} alt="Selfie" className="w-full aspect-[4/3] object-cover rounded-lg border border-white/10" /></a>
          <div className="flex flex-col gap-2">
            <Button data-testid={`admin-verification-approve-${u.id}`} size="sm" onClick={() => verify(u.id, true)} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">{t("approve", lang)}</Button>
            <Button data-testid={`admin-verification-reject-${u.id}`} size="sm" variant="outline" onClick={() => verify(u.id, false)} className="bg-rose-500/10 border-rose-500/40 text-rose-300">{t("reject", lang)}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
