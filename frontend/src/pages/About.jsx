import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Heart, ShieldCheck, Gift, Globe2, Sparkles, Lock, Coins, ArrowRight, Star, Users } from "lucide-react";
import { Button } from "../components/ui/button";

const HERO = "https://static.prod-images.emergentagent.com/jobs/1b96632b-1db8-432c-9240-70b2ff466433/images/0cc89b19d4dcce9b3fe044a65e1236d9cab101705cca62f5473507d2a1d963ec.jpeg";

const Stat = ({ value, label }) => (
  <div className="glass rounded-2xl p-6 text-center card-lift">
    <div className="font-serif-luxe text-4xl gold-text">{value}</div>
    <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
  </div>
);

const Value = ({ icon: Icon, title, children, color }) => (
  <div className="glass rounded-2xl p-6 card-lift" data-testid={`about-value-${title.toLowerCase().replace(/\s+/g, "-")}`}>
    <div className={`w-11 h-11 rounded-xl gold-hairline bg-white/5 flex items-center justify-center ${color}`}><Icon size={20} /></div>
    <h3 className="mt-4 font-serif-luxe text-xl text-white">{title}</h3>
    <p className="mt-2 text-sm text-slate-300 leading-relaxed">{children}</p>
  </div>
);

export default function About() {
  const nav = useNavigate();
  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)] relative overflow-hidden text-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Hero */}
        <section className="pt-20 pb-16 grid lg:grid-cols-2 gap-14 items-center" data-testid="about-page">
          <div className="float-in">
            <span className="inline-flex items-center gap-2 ps-1.5 pe-3 py-1 rounded-full bg-white/5 gold-hairline text-[#F3E5AB] text-xs font-semibold uppercase tracking-[0.2em]">
              <img src="/brand-logo.png" alt="" className="w-6 h-6 rounded-full object-cover" /> Our Story
            </span>
            <h1 className="mt-6 font-serif-luxe text-5xl sm:text-6xl leading-[0.95] tracking-tight">
              Where intention meets <span className="gold-text">indulgence</span>.
            </h1>
            <p className="mt-6 text-lg text-slate-300 max-w-lg leading-relaxed">
              GiftsDates is a curated worldwide dating experience built for people who value real connection, generosity, and safety. No games, no noise — just meaningful meetings, expressed through gifts and unforgettable dates.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button data-testid="about-cta-join" onClick={() => nav("/auth?register=1")} className="rose-btn text-white border-0 h-12 px-6 text-base">
                Join GiftsDates <ArrowRight size={16} className="ms-2" />
              </Button>
              <Button data-testid="about-cta-browse" onClick={() => nav("/browse")} variant="outline" className="gold-btn h-12 px-6 text-base">
                Explore Members
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-tr from-rose-500/30 via-violet-500/20 to-amber-500/20 blur-3xl rounded-[3rem]" />
            <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl aspect-[4/5]">
              <img src={HERO} alt="Luxury dating" className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0D0B12] via-[#0D0B12]/60 to-transparent p-6">
                <p className="font-serif-luxe text-2xl">Real people. Real intentions.</p>
                <p className="text-sm text-slate-300 mt-1">A private world of tasteful romance.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-14 max-w-3xl">
          <h2 className="font-serif-luxe text-3xl gold-text">Our mission</h2>
          <p className="mt-4 text-slate-300 leading-relaxed">
            Modern dating rewards attention, not intention. We built GiftsDates to flip that. Here, generosity is the language of interest — a heartfelt gift opens a conversation, a booked date turns a spark into a plan, and every interaction is protected by escrow so both people can trust the moment. We exist to make luxury romance effortless, honest, and worldwide.
          </p>
        </section>

        {/* Stats */}
        <section className="py-8 grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="about-stats">
          <Stat value="150+" label="Countries" />
          <Stat value="24h" label="Escrow Protection" />
          <Stat value="30%" label="Platform Fee Only" />
          <Stat value="18+" label="Verified & Adult" />
        </section>

        {/* Values */}
        <section className="py-14">
          <h2 className="font-serif-luxe text-3xl gold-text">What we stand for</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            <Value icon={Heart} title="Genuine Connection" color="text-rose-400">
              Every match starts with real interest — expressed through a gift or a date, never an empty swipe.
            </Value>
            <Value icon={ShieldCheck} title="Safety First" color="text-amber-400">
              Verification, on-platform arrangements, and photo-confirmed meetings keep both sides protected.
            </Value>
            <Value icon={Lock} title="Escrow Trust" color="text-emerald-400">
              Coins are held in escrow and only released after a date is confirmed — no risk, no surprises.
            </Value>
            <Value icon={Gift} title="Generosity Rewarded" color="text-violet-400">
              A thoughtful gift instantly opens a chat. Kindness is the fastest way to someone's heart here.
            </Value>
            <Value icon={Globe2} title="Truly Worldwide" color="text-sky-400">
              From Dubai to Paris to Tokyo — meet elegant people across the globe with precise location search.
            </Value>
            <Value icon={Sparkles} title="Luxury By Design" color="text-amber-300">
              A refined, private experience crafted for people who appreciate the finer things in life.
            </Value>
          </div>
        </section>

        {/* How it works */}
        <section className="py-14">
          <h2 className="font-serif-luxe text-3xl gold-text">How GiftsDates works</h2>
          <div className="mt-8 grid md:grid-cols-4 gap-5">
            {[
              { n: "01", icon: Users, t: "Create your profile", d: "Sign up, get verified, and showcase who you are." },
              { n: "02", icon: Gift, t: "Send a gift", d: "A gift from 100 coins auto-opens a chat — an instant match." },
              { n: "03", icon: Star, t: "Book a date", d: "Arrange a meeting with coins safely held in escrow." },
              { n: "04", icon: Coins, t: "Confirm & unlock", d: "Confirm with a photo to release funds — 100% earned." },
            ].map((s) => (
              <div key={s.n} className="glass rounded-2xl p-6 card-lift" data-testid={`about-step-${s.n}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono-num text-2xl text-slate-500">{s.n}</span>
                  <s.icon size={20} className="text-amber-300" />
                </div>
                <h3 className="mt-4 font-serif-luxe text-lg text-white">{s.t}</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="relative rounded-[2rem] overflow-hidden gold-hairline glass p-10 md:p-14 text-center">
            <div className="absolute -inset-10 bg-gradient-to-tr from-rose-500/20 via-transparent to-amber-500/20 blur-3xl" />
            <div className="relative">
              <h2 className="font-serif-luxe text-4xl sm:text-5xl">Your next great date is <span className="gold-text">one gift away</span>.</h2>
              <p className="mt-4 text-slate-300 max-w-xl mx-auto">Join a worldwide community built on generosity, safety, and real intention.</p>
              <Button data-testid="about-cta-final" onClick={() => nav("/auth?register=1")} className="mt-8 rose-btn text-white border-0 h-12 px-8 text-base">
                Get Started Free <ArrowRight size={16} className="ms-2" />
              </Button>
            </div>
          </div>
        </section>
      </div>

      <footer className="max-w-7xl mx-auto px-4 py-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>© {new Date().getFullYear()} GiftsDates · Luxury Dating</span>
        <div className="flex gap-4">
          <Link to="/" className="hover:text-amber-300 transition-colors">Home</Link>
          <Link to="/terms" className="hover:text-amber-300 transition-colors">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-amber-300 transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
