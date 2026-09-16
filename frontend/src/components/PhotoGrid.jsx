import React, { useRef, useState } from "react";
import { Plus, Trash2, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

export default function PhotoGrid() {
  const { user, meta, lang, refreshUser } = useApp();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const photos = user?.photos || [];
  const max = meta?.max_photos || 12;

  const upload = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files).slice(0, max - photos.length)) {
        const fd = new FormData(); fd.append("file", f);
        await api.post("/profile/photos", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      await refreshUser(); toast.success(t("photos", lang));
    } catch (e) { toast.error(e.response?.data?.detail || t("upload_failed", lang)); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  };
  const remove = async (path) => {
    try { await api.delete("/profile/photos", { data: { path } }); await refreshUser(); } catch { toast.error(t("failed", lang)); }
  };
  const primary = async (path) => {
    try { await api.post("/profile/photos/primary", { path }); await refreshUser(); } catch { toast.error(t("failed", lang)); }
  };

  return (
    <div data-testid="profile-photo-grid">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 uppercase tracking-widest font-mono">{t("photos", lang)} · {photos.length}/{max}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {photos.map((p, i) => (
          <div key={p} data-testid={`profile-photo-${i}`} className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10">
            <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
            {i === 0 && <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/80 text-black font-semibold">{t("primary", lang)}</span>}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              {i !== 0 && <button data-testid={`profile-photo-primary-${i}`} onClick={() => primary(p)} title={t("make_primary", lang)} className="p-1.5 rounded-full bg-amber-500 text-black"><Star size={12} /></button>}
              <button data-testid={`profile-photo-delete-${i}`} onClick={() => remove(p)} className="p-1.5 rounded-full bg-rose-600 text-white"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
        {photos.length < max && (
          <button data-testid="profile-photo-add-button" disabled={busy} onClick={() => inputRef.current?.click()} className="aspect-[3/4] rounded-xl border border-dashed border-white/20 hover:border-rose-400/60 hover:bg-white/5 flex flex-col items-center justify-center gap-1 text-slate-400 text-xs transition-colors">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} {t("add_photo", lang)}
          </button>
        )}
      </div>
      <input ref={inputRef} data-testid="profile-photo-file-input" type="file" accept="image/*" multiple className="hidden" onChange={e => upload(e.target.files)} />
    </div>
  );
}
