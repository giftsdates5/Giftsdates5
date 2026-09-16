import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Send, ShieldAlert, Gift, Camera, Lock } from "lucide-react";
import { toast } from "sonner";
import GiftModal from "../components/GiftModal";
import { fileUrl } from "../lib/api";
import { presence, PresenceDot } from "../lib/presence";

const FALLBACKS = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=srgb&fm=jpg&q=85",
  "https://images.unsplash.com/photo-1532074205216-d0e1f4b87368?crop=entropy&cs=srgb&fm=jpg&q=85",
  "https://images.unsplash.com/photo-1607746882042-944635dfe10e?crop=entropy&cs=srgb&fm=jpg&q=85",
  "https://images.unsplash.com/photo-1539125530496-3ca408f9c2d9?crop=entropy&cs=srgb&fm=jpg&q=85",
];
const hash = (s) => { let h = 0; for (let i = 0; i < (s || "").length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return h; };
export const photoOf = (u) => u?.photos?.[0] || FALLBACKS[Math.abs(hash(u?.id)) % FALLBACKS.length];
const Avatar = ({ u, size = "w-10 h-10", testid, onClick }) => (
  <img data-testid={testid} src={photoOf(u)} alt={u?.name || ""} onClick={onClick}
    className={`${size} rounded-full object-cover border border-white/10 shrink-0 ${onClick ? "cursor-pointer hover:ring-2 hover:ring-rose-400/60 transition-shadow" : ""}`} />
);

export default function Chats() {
  const { user, lang, logout } = useApp();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(sp.get("c") || null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [giftOpen, setGiftOpen] = useState(false);
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const endRef = useRef();
  const reload = () => active && api.get(`/conversations/${active}/messages`).then(r => setMsgs(r.data));
  const sendPhoto = async (f) => {
    if (!f || !active) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", f);
    try { await api.post(`/conversations/${active}/photo`, fd, { headers: { "Content-Type": "multipart/form-data" } }); reload(); }
    catch (e) { toast.error(e.response?.data?.detail === "MEDIA_LOCKED" ? t("photos_locked", lang) : t("failed", lang)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const thanks = async (mid, r) => { try { await api.post("/gifts/thanks", { message_id: mid, reaction: r }); reload(); } catch { toast.error(t("failed", lang)); } };

  useEffect(() => { api.get("/matches").then(r => { setConvs(r.data); if (!active && r.data[0]) setActive(r.data[0].conversation_id); }); }, []);
  useEffect(() => {
    if (!active) return;
    const load = () => api.get(`/conversations/${active}/messages`).then(r => setMsgs(r.data));
    load(); const iv = setInterval(load, 4000); return () => clearInterval(iv);
  }, [active]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || !active) return;
    try { await api.post("/conversations/messages", { conversation_id: active, text }); setText(""); const r = await api.get(`/conversations/${active}/messages`); setMsgs(r.data); }
    catch (e) {
      const d = e.response?.data?.detail || "";
      if (d.startsWith("PHONE_BLOCKED:")) { const [, a, b] = d.split(":"); toast.error(t("phone_blocked", lang).replace("{a}", a).replace("{b}", b), { duration: 6000 }); }
      else if (d.startsWith("BLOCKED:")) { toast.error(t("account_blocked", lang).replace("{d}", new Date(d.slice(8)).toLocaleDateString()), { duration: 8000 }); logout(); nav("/auth"); }
      else toast.error(t("failed", lang));
    }
  };
  const partner = convs.find(c => c.conversation_id === active)?.user;
  const canMedia = convs.find(c => c.conversation_id === active)?.can_share_media;
  const pres = presence(partner, lang);

  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-8rem)]">
        <div className="glass rounded-2xl p-3 overflow-auto scrollbar-thin">
          <h3 className="font-serif-luxe text-xl px-2 pb-2">{t("chats", lang)}</h3>
          {convs.length === 0 && <div className="text-xs text-slate-500 p-3">{t("no_matches_yet", lang)}</div>}
          {convs.map(c => (
            <button key={c.conversation_id} data-testid={`chat-item-${c.user.id}`} onClick={() => { setActive(c.conversation_id); setSp({ c: c.conversation_id }); }}
              className={`w-full text-left p-2 rounded-xl flex items-center gap-2 ${active===c.conversation_id ? "bg-rose-500/15 border border-rose-500/30" : "hover:bg-white/5"}`}>
              <div className="relative"><Avatar u={c.user} testid={`chat-avatar-${c.user.id}`} /><PresenceDot u={c.user} lang={lang} className="absolute bottom-0 right-0" testid={`chat-presence-${c.user.id}`} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.user.name}</div>
                <div className="text-xs text-slate-400 truncate">{c.user.city}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="glass rounded-2xl flex flex-col">
          {partner && (
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <button data-testid="chat-header-person" onClick={() => nav(`/profile/${partner.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl -m-1 p-1 hover:bg-white/5 transition-colors cursor-pointer">
                <Avatar u={partner} testid="chat-header-avatar" />
                <div className="min-w-0">
                  <div data-testid="chat-header-name" className="font-serif-luxe text-lg leading-tight hover:text-rose-300 truncate">{partner.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5"><PresenceDot u={partner} lang={lang} testid="chat-header-presence" />{pres.label || partner.city}</div>
                </div>
              </button>
              {partner.photos?.length > 1 && (
                <div className="ml-auto flex gap-1" data-testid="chat-header-photos">
                  {partner.photos.slice(1, 5).map((p, i) => <img key={i} src={p} alt="" onClick={() => nav(`/profile/${partner.id}`)} className="w-8 h-8 rounded-lg object-cover border border-white/10 cursor-pointer hover:scale-110 transition-transform" />)}
                </div>
              )}
            </div>
          )}
          <div className="flex-1 p-4 overflow-auto space-y-2 scrollbar-thin">
            <div data-testid="chat-safety-notice" className="sticky top-0 z-10 mb-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-200 flex items-start gap-2">
              <ShieldAlert size={13} className="mt-0.5 shrink-0" /> <span>{t("chat_safety_notice", lang)}</span>
            </div>
            {msgs.map(m => (
              <div key={m.id} className={`flex items-end gap-2 ${m.from_id === user.id ? "justify-end" : "justify-start"}`}>
                {m.from_id !== user.id && <Avatar u={partner} size="w-7 h-7" testid={`chat-msg-avatar-${m.id}`} onClick={() => nav(`/profile/${partner.id}`)} />}
                <div data-testid={`chat-message-${m.id}`} className={`max-w-[70%] ${m.type === "image" ? "p-1 rounded-2xl bg-white/5" : "px-3 py-2 rounded-2xl"} text-sm ${m.type === "image" ? "" : m.type === "gift" ? "border border-amber-400/40 bg-amber-500/10 text-amber-100" : m.from_id===user.id ? "rose-btn text-white" : "bg-white/10 text-slate-100"}`}>
                  {m.type === "gift" ? (
                    <div data-testid={`chat-gift-${m.id}`} className="text-center">
                      <div className="text-4xl leading-none">{m.gift_icon}</div>
                      <div className="text-[11px] mt-1 text-amber-300 font-mono-num">{m.from_id === user.id ? t("gift_sent_you", lang) : t("gift_received_chat", lang)} · 🪙 {m.gift_cost}</div>
                      {m.text && <div className="mt-1 text-xs text-slate-200 italic">“{m.text}”</div>}
                      {m.from_id !== user.id && !m.thanks && (
                        <div className="mt-2 flex justify-center gap-1">
                          {["❤️", "😘", "🥰"].map(r => <button key={r} type="button" data-testid={`chat-gift-thanks-${m.id}-${r.codePointAt(0)}`} onClick={() => thanks(m.id, r)} className="px-2 py-1 rounded-full bg-white/10 hover:bg-rose-500/30 text-xs transition-colors">{t("thanks", lang)} {r}</button>)}
                        </div>
                      )}
                      {m.thanks && <div data-testid={`chat-gift-thanked-${m.id}`} className="mt-1 text-[10px] text-slate-400">{t("thanked", lang)} {m.thanks}</div>}
                    </div>
                  ) : m.type === "thanks" ? <span data-testid={`chat-thanks-${m.id}`}>{t("thanks", lang)} {m.reaction}</span>
                  : m.type === "image" ? <img data-testid={`chat-image-${m.id}`} src={fileUrl(m.image_path)} alt="" className="max-h-64 rounded-xl object-cover cursor-zoom-in" onClick={() => window.open(fileUrl(m.image_path), "_blank")} /> : m.text}
                </div>
              </div>
            ))}
            <div ref={endRef}/>
          </div>
          {active && (
            <div className="p-3 border-t border-white/10">
              <div className="flex gap-2">
                <Button data-testid="chat-gift-button" variant="outline" onClick={() => setGiftOpen(true)} className="border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20" title={t("send_gift", lang)}><Gift size={16}/></Button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid="chat-photo-input" onChange={e => sendPhoto(e.target.files?.[0])} />
                <Button data-testid="chat-photo-button" variant="outline" disabled={uploading} onClick={() => canMedia ? fileRef.current?.click() : toast.info(t("photos_locked", lang))} title={canMedia ? t("send_photo", lang) : t("photos_locked", lang)}
                  className={canMedia ? "border-sky-400/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20" : "border-white/10 bg-white/5 text-slate-500"}>{canMedia ? <Camera size={16}/> : <Lock size={16}/>}</Button>
                <Input data-testid="chat-message-input" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key==='Enter' && send()} placeholder={t("message_placeholder", lang)} className="bg-white/5 border-white/10"/>
                <Button data-testid="chat-message-send-button" onClick={send} className="rose-btn text-white border-0"><Send size={16}/></Button>
              </div>
              <div data-testid="chat-rule-hint" className="mt-2 text-[11px] text-slate-500 flex items-center gap-1"><ShieldAlert size={11}/> {t("chat_rule_hint", lang)}</div>
            </div>
          )}
        </div>
      </div>
      {partner && <GiftModal open={giftOpen} onOpenChange={setGiftOpen} target={partner} conversationId={active} onSent={reload} />}
    </div>
  );
}
