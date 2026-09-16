import React from "react";
import { t } from "./i18n";

export function presence(u, lang) {
  if (!u?.last_seen) return { online: false, label: "", key: "offline" };
  const mins = (Date.now() - new Date(u.last_seen).getTime()) / 60000;
  if (mins < 5) return { online: true, label: t("online", lang), key: "online" };
  if (mins < 60) return { online: false, label: t("seen_recently", lang), key: "recent" };
  if (mins < 60 * 24) return { online: false, label: t("seen_today", lang), key: "today" };
  return { online: false, label: `${t("last_seen", lang)} ${new Date(u.last_seen).toLocaleDateString(lang)}`, key: "old" };
}

export function PresenceDot({ u, lang, className = "", testid }) {
  const p = presence(u, lang);
  if (!u?.last_seen) return null;
  return <span data-testid={testid} title={p.label} className={`inline-block w-2.5 h-2.5 rounded-full border border-black/40 ${p.online ? "bg-emerald-400 pulse-dot" : p.key === "recent" ? "bg-amber-400" : "bg-slate-500"} ${className}`} />;
}
