import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { formatDistance } from "../lib/geolocate";
import { Heart, Sparkles, Crown, Lock, MapPin } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const FALLBACKS = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=srgb&fm=jpg&q=85",
  "https://images.unsplash.com/photo-1532074205216-d0e1f4b87368?crop=entropy&cs=srgb&fm=jpg&q=85",
  "https://images.unsplash.com/photo-1607746882042-944635dfe10e?crop=entropy&cs=srgb&fm=jpg&q=85",
  "https://images.unsplash.com/photo-1539125530496-3ca408f9c2d9?crop=entropy&cs=srgb&fm=jpg&q=85",
];
function hash(s){let h=0;for(let i=0;i<(s||"").length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return h;}

export default function Matches() {
  const { lang, user } = useApp();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [liked, setLiked] = useState(null);
  const load = () => { api.get("/matches").then(r => setItems(r.data)); api.get("/likes/received").then(r => setLiked(r.data)); };
  useEffect(load, []);
  const likeBack = async (u) => {
    try { await api.post("/likes", { target_id: u.id }); toast.success(t("its_a_match", lang)); load(); }
    catch (e) { const d = e.response?.data?.detail || ""; toast.error(d.startsWith("LIKE_LIMIT:") ? t("like_limit_reached", lang).replace("{n}", d.split(":")[1]) : t("failed", lang)); }
  };
  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)]">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {liked && liked.count > 0 && (
          <section data-testid="liked-you-strip" className="glass rounded-2xl p-4 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif-luxe text-lg flex items-center gap-2"><Sparkles size={16} className="text-amber-300" /> {t("liked_you", lang)} <span data-testid="liked-you-count" className="font-mono-num text-amber-300">{liked.count}</span></h2>
              {!liked.premium && <Button data-testid="liked-you-premium-cta" size="sm" onClick={() => nav("/wallet?premium=1")} className="rose-btn text-white border-0 h-8"><Crown size={14} className="me-1" /> {t("liked_you_unlock", lang)}</Button>}
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-1">
              {liked.items.map(u => (
                <div key={u.id} data-testid={`liked-you-item-${u.id}`} className="shrink-0 w-28 text-center">
                  <div className="relative">
                    <img src={u.photos?.[0] || FALLBACKS[Math.abs(hash(u.id))%FALLBACKS.length]} alt="" onClick={() => liked.premium && nav(`/profile/${u.id}`)}
                      className={`w-28 h-32 rounded-xl object-cover border border-white/10 ${liked.premium ? "cursor-pointer" : "blur-md brightness-50 select-none"}`} />
                    {!liked.premium && <Lock size={18} className="absolute inset-0 m-auto text-white/80" />}
                  </div>
                  {liked.premium ? (
                    <>
                      <div className="text-sm mt-1 truncate">{u.name}, {u.age}</div>
                      <Button data-testid={`liked-you-like-back-${u.id}`} size="sm" onClick={() => likeBack(u)} className="mt-1 h-7 w-full rose-btn text-white border-0 text-xs"><Heart size={12} className="me-1" /> {t("like_back", lang)}</Button>
                    </>
                  ) : <div className="text-xs mt-1 text-slate-500">{t("premium", lang)}</div>}
                </div>
              ))}
            </div>
          </section>
        )}
        <h1 className="font-serif-luxe text-4xl mb-8 flex items-center gap-3"><Heart className="fill-rose-500 text-rose-500"/> {t("matches", lang)}</h1>
        {items.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-slate-400">{t("like_to_match", lang)}</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(m => (
              <button key={m.conversation_id} data-testid={`match-open-${m.user.id}`} onClick={() => nav(`/chats?c=${m.conversation_id}`)} className="glass rounded-2xl p-4 flex items-center gap-4 card-lift text-left">
                <img src={m.user.photos?.[0] || FALLBACKS[Math.abs(hash(m.user.id))%FALLBACKS.length]} className="w-16 h-16 rounded-full object-cover" alt=""/>
                <div>
                  <div className="font-serif-luxe text-xl">{m.user.name}, {m.user.age}</div>
                  <div className="text-xs text-slate-400">{m.user.city}, {m.user.country}</div>
                  {m.user.distance_km != null && (
                    <span data-testid={`match-distance-${m.user.id}`} className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-[10px] text-sky-200">
                      <MapPin size={9} /> {formatDistance(m.user.distance_km, t, lang)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
