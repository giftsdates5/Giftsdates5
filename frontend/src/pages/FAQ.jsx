import React, { useState } from "react";
import { Link } from "react-router-dom";
import { HelpCircle, Search } from "lucide-react";

const CATEGORIES = [
  {
    id: "getting-started",
    title: "Getting Started",
    items: [
      { q: "What is GiftsDates?", a: "GiftsDates is a curated worldwide luxury dating platform where genuine interest is expressed through gifts and real dates. A thoughtful gift opens a conversation, and every arrangement is protected on-platform." },
      { q: "Who can join GiftsDates?", a: "You must be at least 18 years old and able to enter a legal agreement with us. Some features require identity and age verification during onboarding." },
      { q: "Is registration free?", a: "Yes, creating an account is free. You only pay when you buy coins, send gifts, book dates, or subscribe to Premium." },
      { q: "What is Spin & Win?", a: "Before registering you can spin our wheel to win a bonus. The bonus is credited to your wallet after you complete registration. One bonus per person." },
    ],
  },
  {
    id: "coins",
    title: "Coins & Payments",
    items: [
      { q: "How do I top up coins?", a: "Open your Wallet and pick a pack, or enter a custom amount. $1 = 10 🪙 with a 2% bonus on custom top-ups; larger packs include extra bonus coins." },
      { q: "What are the coin packs?", a: "Small Talk 🪙100 ($9.99), Starter 🪙300+20 ($29.99), Popular Pack 🪙1000+100 ($99.99), Extra Pack 🪙2000+150 ($189), VIP Pack 🪙3000+300 ($295), or any custom amount." },
      { q: "Are coin purchases refundable?", a: "No. By using the platform you agree that coin purchases and Premium payments are non-refundable and coins cannot be claimed back except through the standard withdrawal process." },
      { q: "How do withdrawals work?", a: "Once your bank information is approved you can withdraw collected coins. A 30% commission is deducted and 10 coins are valued at $1. Coins in escrow unlock once a date is confirmed." },
    ],
  },
  {
    id: "matches",
    title: "Gifts, Likes & Matches",
    items: [
      { q: "How do matches happen?", a: "You can match by liking each other, or instantly — a gift of 100+ coins automatically opens a chat and creates a match." },
      { q: "When can I share my phone number?", a: "For safety, phone numbers can only be shared after a confirmed date." },
      { q: "When do photos in chat unlock?", a: "Photo sharing in chat unlocks only after a date is confirmed between both people." },
      { q: "How does the invite-a-friend reward work?", a: "Earn 100 🪙 for every friend who buys their first Popular Pack." },
    ],
  },
  {
    id: "dates",
    title: "Dates, Taxi & Photo Proof",
    items: [
      { q: "How do I book a date?", a: "Invite another user, choose the location, and pay the date price in coins. The coins are held in escrow until the date is confirmed." },
      { q: "What is the taxi fee?", a: "After a date is booked, the invited side can request a taxi fee. If the inviter approves it, the date is automatically confirmed." },
      { q: "What happens if a date is cancelled?", a: "If the inviter cancels, 50% of the booking + taxi is refunded and 50% goes as compensation to the invited user. If the invited user cancels, all coins (date + taxi) go back to the inviter." },
      { q: "How do I claim coins after a date?", a: "Submit photo proof within 24 hours to receive 100%. After 24 hours with no photo and no complaint, you can claim 50% (the platform keeps 50%). The 'Get 50% now' button unlocks 24 hours after the date starts." },
      { q: "What if the other person is a no-show?", a: "During the first 24 hours after the date starts, contact us. We'll reach out to the other side to confirm, and coins will be returned to you." },
    ],
  },
  {
    id: "premium",
    title: "Premium & Account",
    items: [
      { q: "What does Premium include?", a: "Unlimited likes, top placement in search, advanced search filters, seeing who liked you, and priority support." },
      { q: "How does Premium billing work?", a: "Premium auto-renews every month until you cancel. Cancelling keeps your access until the end of the paid period." },
      { q: "Can I set my own prices?", a: "Yes. Use your profile page to set your Date price, Video call price, and Availability calendar." },
      { q: "How do I delete my account?", a: "You can delete your account from your profile page, or contact us at help@GiftsDates.com." },
    ],
  },
  {
    id: "safety",
    title: "Safety & Support",
    items: [
      { q: "How do you keep me safe?", a: "We use verification, on-platform arrangements, escrow, and photo-confirmed meetings. Keep all contact and meeting plans on-platform — off-platform meetings can't be protected and may lead to a block." },
      { q: "How do I report someone?", a: "Use the report option on a profile or chat, or email help@GiftsDates.com with details. See our Terms of Use for prohibited conduct." },
      { q: "How do I contact support?", a: "Email help@GiftsDates.com. Please include your account email and any relevant date or transaction details so we can help faster." },
    ],
  },
];

const withEmail = (text) => {
  const parts = text.split("help@GiftsDates.com");
  if (parts.length === 1) return text;
  return parts.reduce((acc, part, i) => {
    acc.push(<React.Fragment key={`t${i}`}>{part}</React.Fragment>);
    if (i < parts.length - 1) acc.push(<a key={`e${i}`} href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a>);
    return acc;
  }, []);
};

const Item = ({ q, a }) => (
  <details className="glass rounded-xl p-4 gold-hairline group" data-testid={`faq-item-${q.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`}>
    <summary className="cursor-pointer list-none flex items-center justify-between font-semibold text-white text-sm gap-4">
      {q}
      <span className="text-amber-300 transition-transform group-open:rotate-45 text-xl leading-none shrink-0">+</span>
    </summary>
    <p className="mt-3 text-sm text-slate-300 leading-relaxed">{withEmail(a)}</p>
  </details>
);

export default function FAQ() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = CATEGORIES.map((c) => ({
    ...c,
    items: q ? c.items.filter((i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)) : c.items,
  })).filter((c) => c.items.length > 0);

  return (
    <div className="min-h-screen aurora-bg text-white">
      <div className="max-w-4xl mx-auto px-4 py-14" data-testid="faq-page">
        <Link to="/" className="text-sm text-slate-400 hover:text-white" data-testid="faq-back-link">← Back to GiftsDates</Link>
        <div className="flex items-center gap-3 mt-6 mb-2">
          <div className="w-11 h-11 rounded-xl overflow-hidden gold-hairline bg-[#1A0A14] flex items-center justify-center"><HelpCircle className="text-amber-300" size={22} /></div>
          <h1 className="font-serif-luxe text-4xl sm:text-5xl gold-text">Frequently Asked Questions</h1>
        </div>
        <p className="text-slate-300 max-w-2xl">Everything you need to know about coins, dates, safety, Premium and more. Can't find an answer? Email <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a>.</p>

        {/* Search */}
        <div className="mt-8 relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            data-testid="faq-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/5 gold-hairline text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-400/50"
          />
        </div>

        {/* Quick nav */}
        {!q && (
          <div className="mt-6 flex flex-wrap gap-2" data-testid="faq-quicknav">
            {CATEGORIES.map((c) => (
              <a key={c.id} href={`#${c.id}`} className="text-xs px-3 py-1.5 rounded-full bg-white/5 gold-hairline text-slate-300 hover:text-amber-300 transition-colors">{c.title}</a>
            ))}
          </div>
        )}

        {/* Categories */}
        {filtered.length === 0 && (
          <p className="mt-10 text-slate-400" data-testid="faq-no-results">No questions match "{query}". Try another term or email <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a>.</p>
        )}
        {filtered.map((c) => (
          <section key={c.id} id={c.id} className="scroll-mt-24 mt-10" data-testid={`faq-category-${c.id}`}>
            <h2 className="font-serif-luxe text-2xl gold-text mb-4">{c.title}</h2>
            <div className="space-y-3">
              {c.items.map((i) => <Item key={i.q} q={i.q} a={i.a} />)}
            </div>
          </section>
        ))}

        {/* Contact CTA */}
        <div className="mt-14 relative rounded-2xl overflow-hidden gold-hairline glass p-8 text-center" data-testid="faq-contact-cta">
          <div className="absolute -inset-10 bg-gradient-to-tr from-rose-500/20 via-transparent to-amber-500/20 blur-3xl" />
          <div className="relative">
            <h3 className="font-serif-luxe text-2xl">Still have questions?</h3>
            <p className="mt-2 text-sm text-slate-300">Our support team is here for you.</p>
            <a href="mailto:help@GiftsDates.com" data-testid="faq-email-btn" className="mt-5 rose-btn inline-flex items-center gap-2 text-white border-0 h-11 px-6 rounded-md text-sm font-semibold">Email help@GiftsDates.com</a>
            <p className="mt-4 text-xs text-slate-500">Or visit our <Link to="/help" className="text-amber-300 hover:underline">Help &amp; Support</Link> page.</p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500">
          <Link to="/help" className="hover:text-amber-300">Help</Link> · <Link to="/terms" className="hover:text-amber-300">Terms of Service</Link> · <Link to="/terms-of-use" className="hover:text-amber-300">Terms of Use</Link> · <Link to="/privacy" className="hover:text-amber-300">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
