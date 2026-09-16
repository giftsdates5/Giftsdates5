import React, { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { api } from "../lib/api";

const REASONS = [
  { value: "underage", label: "Underage user (under 18)" },
  { value: "illegal", label: "Illegal activity" },
  { value: "harassment", label: "Abuse or harassment" },
  { value: "hate", label: "Hate speech" },
  { value: "nonconsensual", label: "Non-consensual / intimate images" },
  { value: "impersonation", label: "Fake profile / impersonation" },
  { value: "scam", label: "Scam or fraud" },
  { value: "spam", label: "Spam or advertising" },
  { value: "offplatform", label: "Pushing off-platform contact" },
  { value: "other", label: "Other violation" },
];

export const ReportModal = ({ open, onOpenChange, target }) => {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason) { toast.error("Please select a reason"); return; }
    setBusy(true);
    try {
      await api.post("/reports", { target_id: target.id, reason, details });
      toast.success("Report submitted. Our safety team will review it.");
      setReason(""); setDetails("");
      onOpenChange(false);
    } catch (e) {
      const d = e.response?.data?.detail || "";
      if (d === "ALREADY_REPORTED") toast.error("You've already reported this user. Our team is reviewing it.");
      else toast.error("Could not submit report. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#161018] border-white/10 text-white max-w-md" data-testid="report-modal">
        <DialogHeader>
          <DialogTitle className="font-serif-luxe text-2xl flex items-center gap-2"><Flag size={20} className="text-rose-400" /> Report {target?.name}</DialogTitle>
          <DialogDescription className="text-slate-400">Reports are confidential. Help us keep GiftsDates safe by telling us what's wrong.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} className="space-y-1.5 max-h-64 overflow-y-auto pr-1" data-testid="report-reasons">
          {REASONS.map((r) => (
            <label key={r.value} htmlFor={`reason-${r.value}`} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5 cursor-pointer">
              <RadioGroupItem value={r.value} id={`reason-${r.value}`} data-testid={`report-reason-${r.value}`} className="border-white/30 text-rose-400" />
              <Label htmlFor={`reason-${r.value}`} className="text-sm text-slate-200 cursor-pointer font-normal">{r.label}</Label>
            </label>
          ))}
        </RadioGroup>
        <Textarea
          data-testid="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Add any details that will help us investigate (optional)"
          className="bg-white/5 border-white/15 text-white placeholder:text-slate-500 min-h-[80px]"
          maxLength={2000}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" data-testid="report-cancel" onClick={() => onOpenChange(false)} className="bg-white/5 border-white/15">Cancel</Button>
          <Button data-testid="report-submit" onClick={submit} disabled={busy} className="rose-btn text-white border-0">{busy ? "Submitting..." : "Submit report"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
