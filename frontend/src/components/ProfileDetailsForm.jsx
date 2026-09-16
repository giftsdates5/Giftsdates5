import React from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { LANGUAGES, t } from "../lib/i18n";

export const INTENTS = ["serious", "marriage", "casual", "just_sex", "friendship", "travel", "sponsor"];
export const INCOMES = ["low", "mid", "high", "vip", "custom", "prefer_not"];
export const KIDS = ["none", "have", "want", "no_want"];
export const HABITS = ["never", "sometimes", "often"];
export const RELIGIONS = ["christian", "muslim", "jewish", "buddhist", "hindu", "spiritual", "atheist", "other", "prefer_not"];
export const BUST = ["A", "B", "C", "D", "E", "F+"];
export const SIZES = ["s", "m", "l", "xl"];

export const GENDERS = ["female", "male", "trans_woman", "trans_man", "non_binary"];
export const ORIENTATIONS = ["straight", "gay", "lesbian", "bisexual", "pansexual", "omnisexual", "polysexual", "asexual", "demisexual", "sapiosexual", "aromantic", "transgender", "queer", "fluid", "questioning", "prefer_not"];
export const genderLabel = (g, lang) => t(g, lang);

export const optLabel = (field, v, lang) => {
  if (!v) return "";
  if (v === "prefer_not") return t("prefer_not", lang);
  if (field === "income" && v === "custom") return t("income_custom", lang);
  if (field === "gender") return t(v, lang);
  const prefix = { relationship_intent: "intent_", income: "income_", kids: "kids_", smoking: "habit_", drinking: "habit_", religion: "rel_", penis_size: "size_", orientation: "or_" }[field];
  return prefix ? t(prefix + v, lang) : v;
};

const NONE = "__none";
export function Field({ label, children }) {
  return <div><Label className="text-xs text-slate-400">{label}</Label>{children}</div>;
}
export function Sel({ testid, field, value, options, onChange, lang }) {
  return (
    <Select value={value || NONE} onValueChange={v => onChange(v === NONE ? "" : v)}>
      <SelectTrigger data-testid={testid} className="bg-white/5 border-white/10 mt-1"><SelectValue /></SelectTrigger>
      <SelectContent className="bg-[#161320] border-white/10 text-white max-h-72">
        <SelectItem value={NONE}>{t("not_specified", lang)}</SelectItem>
        {options.map(o => <SelectItem key={o} value={o}>{optLabel(field, o, lang)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function ProfileDetailsForm({ f, setF, lang, gender }) {
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const toggleLang = (code) => {
    const cur = f.languages_spoken || [];
    set("languages_spoken")(cur.includes(code) ? cur.filter(c => c !== code) : [...cur, code]);
  };
  const intents = Array.isArray(f.relationship_intent) ? f.relationship_intent : (f.relationship_intent ? [f.relationship_intent] : []);
  const toggleIntent = (v) => {
    set("relationship_intent")(intents.includes(v) ? intents.filter(x => x !== v) : [...intents, v]);
  };
  return (
    <>
      <div className="glass rounded-2xl p-6 space-y-4 mb-6" data-testid="profile-details-section">
        <h2 className="font-serif-luxe text-2xl">{t("details", lang)}</h2>
        <Field label={`${t("relationship_intent", lang)} (${t("select_multiple", lang)})`}>
          <div className="flex flex-wrap gap-2 mt-2" data-testid="profile-intent-chips">
            {INTENTS.map(o => {
              const on = intents.includes(o);
              return <button type="button" key={o} data-testid={`profile-intent-chip-${o}`} onClick={() => toggleIntent(o)} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${on ? "bg-rose-500/20 border-rose-500/50 text-rose-200" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"}`}>{optLabel("relationship_intent", o, lang)}</button>;
            })}
          </div>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("orientation", lang)}><Sel testid="profile-orientation-select" field="orientation" value={f.orientation} options={ORIENTATIONS} onChange={set("orientation")} lang={lang} /></Field>
          <Field label={t("job_title", lang)}><Input data-testid="profile-job-input" value={f.job_title || ""} onChange={e => set("job_title")(e.target.value)} className="bg-white/5 border-white/10 mt-1" /></Field>
          <Field label={t("height", lang)}><Input data-testid="profile-height-input" type="number" min="100" max="250" value={f.height || ""} onChange={e => set("height")(e.target.value ? parseInt(e.target.value) : null)} className="bg-white/5 border-white/10 mt-1" /></Field>
          <Field label={t("weight", lang)}><Input data-testid="profile-weight-input" type="number" min="30" max="300" value={f.weight || ""} onChange={e => set("weight")(e.target.value ? parseInt(e.target.value) : null)} className="bg-white/5 border-white/10 mt-1" /></Field>
          <Field label={t("income", lang)}><Sel testid="profile-income-select" field="income" value={f.income} options={INCOMES} onChange={set("income")} lang={lang} /></Field>
          {f.income === "custom" && <Field label={t("income_custom_value", lang)}><Input data-testid="profile-income-custom-input" value={f.income_custom || ""} onChange={e => set("income_custom")(e.target.value)} placeholder="$7,500 / mo" className="bg-white/5 border-white/10 mt-1" /></Field>}
          <Field label={t("religion", lang)}><Sel testid="profile-religion-select" field="religion" value={f.religion} options={RELIGIONS} onChange={set("religion")} lang={lang} /></Field>
        </div>
        <Field label={`${t("hobbies", lang)} (${t("comma_separated", lang)})`}>
          <Input data-testid="profile-hobbies-input" value={(f.hobbies || []).join(", ")} onChange={e => set("hobbies")(e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Yoga, Travel, Wine" className="bg-white/5 border-white/10 mt-1" />
        </Field>
        <Field label={t("languages_spoken", lang)}>
          <div className="flex flex-wrap gap-2 mt-2" data-testid="profile-languages-chips">
            {LANGUAGES.map(l => {
              const on = (f.languages_spoken || []).includes(l.code);
              return <button type="button" key={l.code} data-testid={`profile-lang-chip-${l.code}`} onClick={() => toggleLang(l.code)} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${on ? "bg-rose-500/20 border-rose-500/50 text-rose-200" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"}`}>{l.flag} {l.name}</button>;
            })}
          </div>
        </Field>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4 mb-6" data-testid="profile-lifestyle-section">
        <h2 className="font-serif-luxe text-2xl">{t("lifestyle", lang)}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label={t("kids", lang)}><Sel testid="profile-kids-select" field="kids" value={f.kids} options={KIDS} onChange={set("kids")} lang={lang} /></Field>
          <Field label={t("smoking", lang)}><Sel testid="profile-smoking-select" field="smoking" value={f.smoking} options={HABITS} onChange={set("smoking")} lang={lang} /></Field>
          <Field label={t("drinking", lang)}><Sel testid="profile-drinking-select" field="drinking" value={f.drinking} options={HABITS} onChange={set("drinking")} lang={lang} /></Field>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4 mb-6 border border-rose-500/20" data-testid="profile-intimate-section">
        <h2 className="font-serif-luxe text-2xl">{t("intimate", lang)}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {gender !== "male" && <Field label={t("bust_size", lang)}><Sel testid="profile-bust-select" field="bust_size" value={f.bust_size} options={BUST} onChange={set("bust_size")} lang={lang} /></Field>}
          {gender !== "female" && <Field label={t("penis_size", lang)}><Sel testid="profile-penis-select" field="penis_size" value={f.penis_size} options={SIZES} onChange={set("penis_size")} lang={lang} /></Field>}
        </div>
      </div>
    </>
  );
}
