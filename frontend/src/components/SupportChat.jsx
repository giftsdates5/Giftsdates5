import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Headset, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, API } from "../lib/api";
import { useApp } from "../context/AppContext";

const SESSION_KEY = "gd_support_session";
const getSession = () => {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) { s = `sup_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; localStorage.setItem(SESSION_KEY, s); }
  return s;
};

export default function SupportChat() {
  const { lang } = useApp();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("chat"); // chat | agent
  const [cfg, setCfg] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const scrollRef = useRef(null);
  const sessionRef = useRef(getSession());

  const loadCfg = () => api.get("/support/config").then((r) => setCfg(r.data)).catch(() => {});
  useEffect(() => { if (open && !cfg) loadCfg(); }, [open]); // eslint-disable-line
  useEffect(() => {
    if (open && cfg && messages.length === 0) setMessages([{ role: "bot", text: cfg.welcome_message }]);
  }, [open, cfg]); // eslint-disable-line
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [messages, view]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }, { role: "bot", text: "" }]);
    setBusy(true);
    try {
      const res = await fetch(`${API}/support/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionRef.current, message: text, lang }),
      });
      if (!res.ok || !res.body) throw new Error("stream failed");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "bot", text: acc }; return c; });
      }
    } catch (e) {
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "bot", text: "Sorry, I couldn't reach the assistant. Please try again or contact an agent." }; return c; });
    } finally { setBusy(false); }
  };

  const submitTicket = async () => {
    if (!form.email || form.message.trim().length < 5) { toast.error("Please add your email and a short message"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/support/ticket", form);
      toast.success(data.is_open ? "Message sent! An agent will reply shortly." : "Message received! We'll reply by email.");
      setForm({ name: "", email: "", message: "" });
      setView("chat");
    } catch (e) {
      toast.error(e.response?.data?.detail === "MESSAGE_TOO_SHORT" ? "Please write a longer message" : "Could not send. Try again.");
    } finally { setBusy(false); }
  };

  const isOpen = cfg?.is_open;

  return (
    <>
      {!open && (
        <button data-testid="support-launcher" onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full rose-btn text-white border-0 shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Open support chat">
          <MessageCircle size={24} />
        </button>
      )}

      {open && (
        <div data-testid="support-panel" className="fixed bottom-5 right-5 z-[60] w-[92vw] max-w-[380px] h-[70vh] max-h-[560px] rounded-2xl overflow-hidden shadow-2xl gold-hairline bg-[#120810] flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#1A0A14]">
            <img src="/brand-logo.png" alt="" className="w-8 h-8 object-contain" />
            <div className="flex-1">
              <div className="font-serif-luxe text-lg gold-text leading-none">GiftsDates Help</div>
              <div className="text-[11px] mt-1 flex items-center gap-1.5 text-slate-400">
                <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? "bg-emerald-400" : "bg-slate-500"}`} />
                {cfg ? (isOpen ? "Agents online" : "Agents offline") : "…"}
              </div>
            </div>
            <button data-testid="support-close" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>

          {view === "chat" ? (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3" data-testid="support-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.role === "user" ? "bg-rose-500/90 text-white" : "bg-white/5 border border-white/10 text-slate-200"}`}>
                      {m.text || <span className="inline-flex gap-1"><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.15s]" /><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.3s]" /></span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-3 pb-2">
                <button data-testid="support-contact-agent" onClick={() => setView("agent")}
                  className="w-full flex items-center justify-center gap-2 text-xs text-amber-200 bg-amber-500/10 gold-hairline rounded-lg py-2 hover:bg-amber-500/15 transition-colors">
                  <Headset size={14} /> Contact an agent
                </button>
              </div>
              <div className="p-3 border-t border-white/10 flex items-end gap-2">
                <textarea data-testid="support-input" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={1} placeholder="Ask a question…"
                  className="flex-1 resize-none bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-400/40 max-h-24" />
                <button data-testid="support-send" onClick={send} disabled={busy || !input.trim()}
                  className="rose-btn text-white border-0 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"><Send size={16} /></button>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="support-agent-form">
              <button onClick={() => setView("chat")} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"><ArrowLeft size={14} /> Back to chat</button>
              <div className={`rounded-xl p-3 text-xs flex items-start gap-2 ${isOpen ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-200" : "bg-amber-500/10 gold-hairline text-amber-100"}`}>
                <Clock size={14} className="mt-0.5 shrink-0" />
                <span>{isOpen ? "Agents are online now — you'll usually get a quick reply." : (cfg?.offline_message || "Agents are offline. Leave a message and we'll reply by email.")}</span>
              </div>
              {cfg?.hours && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">Hours of operation ({cfg.timezone})</div>
                  <div className="space-y-0.5">
                    {cfg.hours.map((h) => (
                      <div key={h.day} className="flex justify-between text-xs text-slate-300">
                        <span>{h.day_name}</span>
                        <span className={h.enabled ? "" : "text-slate-500"}>{h.enabled ? `${h.open}–${h.close}` : "Closed"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <input data-testid="support-agent-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name (optional)"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-400/40" />
              <input data-testid="support-agent-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Your email"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-400/40" />
              <textarea data-testid="support-agent-message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} placeholder="How can we help?"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-400/40 resize-none" />
              <button data-testid="support-agent-submit" onClick={submitTicket} disabled={busy}
                className="w-full rose-btn text-white border-0 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50">{busy ? "Sending…" : "Send message"}</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
