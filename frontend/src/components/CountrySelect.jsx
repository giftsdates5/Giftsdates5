import React, { useState } from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Button } from "./ui/button";
import { COUNTRIES } from "../lib/countries";
import { t } from "../lib/i18n";

// Searchable country dropdown. "Global" (🌍) is always the first option.
export default function CountrySelect({ value, onChange, lang, testid = "country-select", placeholder }) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find((c) => c.name.toLowerCase() === (value || "").toLowerCase());
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid={testid}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white/5 border-white/10 mt-1 h-10 font-normal hover:bg-white/10"
        >
          <span className={`flex items-center gap-2 truncate ${selected ? "text-white" : "text-slate-400"}`}>
            {selected ? <span className="text-base leading-none">{selected.flag}</span> : <Globe size={15} className="text-slate-400" />}
            {selected ? selected.name : (placeholder || t("choose_country", lang))}
          </span>
          <ChevronsUpDown size={15} className="ms-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 bg-[#161320] border-white/10 text-white w-[--radix-popover-trigger-width] min-w-[240px]" align="start">
        <Command className="bg-transparent">
          <CommandInput data-testid={`${testid}-search`} placeholder={t("search_country", lang)} className="text-white" />
          <CommandList>
            <CommandEmpty>{t("no_results", lang)}</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((c) => (
                <CommandItem
                  key={c.name}
                  value={c.name}
                  data-testid={`${testid}-option-${c.name}`}
                  onSelect={() => { onChange(c.name); setOpen(false); }}
                  className="text-white aria-selected:bg-white/10 cursor-pointer"
                >
                  <span className="text-base leading-none me-2">{c.flag}</span>
                  <span className="flex-1">{c.name}</span>
                  {selected?.name === c.name && <Check size={15} className="ms-auto text-rose-400" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
