import React from "react";
import { Globe } from "lucide-react";
import { Input } from "./ui/input";
import { GLOBAL } from "../lib/countries";
import { t } from "../lib/i18n";

// City input with a "Global" quick toggle. When Global is on, the city value is "Global".
export default function CityField({ value, onChange, lang, testid = "city-input", required = false }) {
  const isGlobal = (value || "").toLowerCase() === GLOBAL.toLowerCase();
  return (
    <div className="mt-1 space-y-2">
      <Input
        data-testid={testid}
        required={required}
        value={isGlobal ? "" : (value || "")}
        disabled={isGlobal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isGlobal ? t("city_global", lang) : ""}
        className="bg-white/5 border-white/10 disabled:opacity-60"
      />
      <button
        type="button"
        data-testid={`${testid}-global-toggle`}
        onClick={() => onChange(isGlobal ? "" : GLOBAL)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors ${isGlobal ? "bg-sky-500/20 border-sky-500/50 text-sky-200" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"}`}
      >
        <Globe size={13} /> {t("city_global", lang)}
      </button>
    </div>
  );
}
