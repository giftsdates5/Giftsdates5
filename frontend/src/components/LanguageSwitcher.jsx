import React from "react";
import { LANGUAGES } from "../lib/i18n";
import { useApp } from "../context/AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export default function LanguageSwitcher() {
  const { lang, setLanguage } = useApp();
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[1];
  return (
    <Select value={lang} onValueChange={setLanguage}>
      <SelectTrigger data-testid="nav-language-switcher-select" className="w-[140px] bg-white/5 border-white/10 hover:bg-white/10 text-slate-100">
        <SelectValue>
          <span className="flex items-center gap-2"><span className="text-lg leading-none">{current.flag}</span><span className="text-sm">{current.name}</span></span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-[#161320] border-white/10 text-slate-100">
        {LANGUAGES.map(l => (
          <SelectItem key={l.code} value={l.code} data-testid={`lang-option-${l.code}`} className="focus:bg-rose-500/20">
            <span className="flex items-center gap-2"><span className="text-lg">{l.flag}</span>{l.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
