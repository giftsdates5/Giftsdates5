import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Video, Gift, ArrowRight, Info } from "lucide-react";
import { Button } from "../components/ui/button";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import SpinWheel from "../components/SpinWheel";

const HERO = "https://static.prod-images.emergentagent.com/jobs/1b96632b-1db8-432c-9240-70b2ff466433/images/0cc89b19d4dcce9b3fe044a65e1236d9cab101705cca62f5473507d2a1d963ec.jpeg";

export default function Landing() {
  const { lang } = useApp();
  const nav = useNavigate();
  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)] relative overflow-hidden">
      <div className="sticky top-16 z-40" data-testid="landing-disclaimer">
        <div className="bg-[#1A0A14]/95 backdrop-blur border-b border-[#D4AF37]/25">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-start gap-2.5 text-[11px] sm:text-xs text-amber-100/90 leading-relaxed">
            <Info size={15} className="text-amber-300 shrink-0 mt-0.5" />
            <p>{t("landing_disclaimer", lang)}</p>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-24 grid lg:grid-cols-2 gap-14 items-center relative">
        <div className="float-in">
          <span className="inline-flex items-center gap-2 ps-1.5 pe-3 py-1 rounded-full bg-white/5 gold-hairline text-[#F3E5AB] text-xs font-semibold uppercase tracking-[0.2em]">
            <img src="/brand-logo.png" alt="" className="w-6 h-6 object-contain logo-pulse" /> GiftsDates · Luxury Dating
          </span>
          <h1 className="mt-6 font-serif-luxe text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
            {t("hero_a", lang)}
          </h1>
          <p className="mt-6 text-lg text-slate-300 max-w-lg leading-relaxed">{t("tagline", lang)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button data-testid="landing-cta-primary" onClick={() => nav("/auth?register=1")} className="rose-btn text-white border-0 h-12 px-6 text-base">
              {t("hero_cta", lang)} <ArrowRight size={16} className="ms-2" />
            </Button>
            <Button data-testid="landing-cta-secondary" onClick={() => nav("/auth")} variant="outline" className="gold-btn h-12 px-6 text-base">
              {t("login", lang)}
            </Button>
            <SpinWheel onClaim={() => nav("/auth?register=1")} />
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {[
              { icon: Gift, text: t("feature_1", lang), color: "text-rose-400" },
              { icon: ShieldCheck, text: t("feature_2", lang), color: "text-amber-400" },
              { icon: Video, text: t("feature_3", lang), color: "text-violet-400" },
            ].map((f, i) => (
              <div key={i} className="glass rounded-xl p-4 card-lift">
                <f.icon size={20} className={f.color} />
                <p className="mt-2 text-sm text-slate-300 leading-snug">{f.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-500 font-mono max-w-lg leading-relaxed">{t("commission_note", lang)}</p>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 bg-gradient-to-tr from-rose-500/30 via-violet-500/20 to-amber-500/20 blur-3xl rounded-[3rem]" />
          <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl aspect-[4/5]">
            <img src={HERO} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0D0B12] via-[#0D0B12]/60 to-transparent p-6">
              <div className="glass rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
                </div>
                <div>
                  <div className="font-serif-luxe text-xl">Elena, 26</div>
                  <div className="text-xs text-slate-400">Moscow · Dubai · Online</div>
                </div>
                <span className="ms-auto text-amber-300 font-mono-num text-sm">🪙 250</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="max-w-7xl mx-auto px-4 py-10 mt-6 border-t border-white/10 text-xs text-slate-500" data-testid="landing-footer">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <img src="/brand-logo.png" alt="" className="w-8 h-8 object-contain" />
              <span className="font-serif-luxe text-lg gold-text">GiftsDates</span>
            </div>
            <p className="mt-3 leading-relaxed">Luxury worldwide dating — gifts, dates &amp; protected funds.</p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-3">{t("footer_company", lang)}</div>
            <ul className="space-y-2">
              <li><Link to="/about" data-testid="footer-about-link" className="hover:text-amber-300 transition-colors">About Us</Link></li>
              <li><Link to="/help" data-testid="footer-help-link" className="hover:text-amber-300 transition-colors">Help</Link></li>
              <li><Link to="/faq" data-testid="footer-faq-link" className="hover:text-amber-300 transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-3">{t("footer_legal", lang)}</div>
            <ul className="space-y-2">
              <li><Link to="/terms" data-testid="footer-terms-link" className="hover:text-amber-300 transition-colors">Terms of Service</Link></li>
              <li><Link to="/terms-of-use" data-testid="footer-use-link" className="hover:text-amber-300 transition-colors">Terms of Use</Link></li>
              <li><Link to="/privacy" data-testid="footer-privacy-link" className="hover:text-amber-300 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/cookies" data-testid="footer-cookies-link" className="hover:text-amber-300 transition-colors">Cookie Notice</Link></li>
              <li><Link to="/dmca" data-testid="footer-dmca-link" className="hover:text-amber-300 transition-colors">DMCA</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-3">{t("footer_safety_col", lang)}</div>
            <ul className="space-y-2">
              <li><Link to="/safety" data-testid="footer-safety-link" className="hover:text-amber-300 transition-colors">Safety &amp; Transparency</Link></li>
              <li><Link to="/fraud-prevention" data-testid="footer-fraud-link" className="hover:text-amber-300 transition-colors">Fraud &amp; Scam Prevention</Link></li>
              <li><Link to="/anti-trafficking" data-testid="footer-ats-link" className="hover:text-amber-300 transition-colors">Anti-Trafficking</Link></li>
              <li><Link to="/complaints" data-testid="footer-complaints-link" className="hover:text-amber-300 transition-colors">Complaints</Link></li>
              <li><Link to="/appeals" data-testid="footer-appeals-link" className="hover:text-amber-300 transition-colors">Appeals</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10">© {new Date().getFullYear()} GiftsDates · Luxury Dating. All rights reserved.</div>
      </footer>
    </div>
  );
}
