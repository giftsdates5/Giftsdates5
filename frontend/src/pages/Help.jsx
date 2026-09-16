import React from "react";
import { Link } from "react-router-dom";
import { LifeBuoy, Mail, ShieldCheck, Coins, CalendarHeart, Crown, UserX, Gift } from "lucide-react";

const Faq = ({ q, children }) => (
  <details className="glass rounded-xl p-4 gold-hairline group" data-testid={`help-faq-${q.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`}>
    <summary className="cursor-pointer list-none flex items-center justify-between font-semibold text-white text-sm">
      {q}
      <span className="text-amber-300 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
    </summary>
    <div className="mt-3 text-sm text-slate-300 leading-relaxed space-y-2">{children}</div>
  </details>
);

const Topic = ({ icon: Icon, title, children, color }) => (
  <div className="glass rounded-2xl p-6 card-lift">
    <div className={`w-11 h-11 rounded-xl gold-hairline bg-white/5 flex items-center justify-center ${color}`}><Icon size={20} /></div>
    <h3 className="mt-4 font-serif-luxe text-lg text-white">{title}</h3>
    <p className="mt-2 text-sm text-slate-300 leading-relaxed">{children}</p>
  </div>
);

export default function Help() {
  return (
    <div className="min-h-screen aurora-bg text-white">
      <div className="max-w-4xl mx-auto px-4 py-14" data-testid="help-page">
        <Link to="/" className="text-sm text-slate-400 hover:text-white" data-testid="help-back-link">← Back to GiftsDates</Link>
        <div className="flex items-center gap-3 mt-6 mb-2">
          <div className="w-11 h-11 rounded-xl overflow-hidden gold-hairline bg-[#1A0A14] flex items-center justify-center"><LifeBuoy className="text-amber-300" size={22} /></div>
          <h1 className="font-serif-luxe text-4xl sm:text-5xl gold-text">Help &amp; Support</h1>
        </div>
        <p className="text-slate-300 max-w-2xl">We're here to help. Browse the topics and FAQs below, or reach our team directly — we usually reply within 24 hours.</p>

        {/* Contact card */}
        <div className="mt-8 relative rounded-2xl overflow-hidden gold-hairline glass p-8 text-center" data-testid="help-contact-card">
          <div className="absolute -inset-10 bg-gradient-to-tr from-rose-500/20 via-transparent to-amber-500/20 blur-3xl" />
          <div className="relative">
            <Mail className="mx-auto text-amber-300" size={28} />
            <p className="mt-3 text-sm text-slate-400">Contact our support team</p>
            <a href="mailto:help@GiftsDates.com" data-testid="help-email-link" className="mt-1 inline-block font-serif-luxe text-2xl sm:text-3xl gold-text hover:opacity-90 transition-opacity">help@GiftsDates.com</a>
            <div className="mt-5">
              <a href="mailto:help@GiftsDates.com" data-testid="help-email-btn" className="rose-btn inline-flex items-center gap-2 text-white border-0 h-11 px-6 rounded-md text-sm font-semibold">
                <Mail size={16} /> Email Support
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-500">Please include your account email and any relevant date or transaction details so we can help faster.</p>
          </div>
        </div>

        {/* Topics */}
        <h2 className="font-serif-luxe text-2xl gold-text mt-12 mb-5">Popular topics</h2>
        <div className="grid md:grid-cols-3 gap-5">
          <Topic icon={Coins} title="Coins & Wallet" color="text-amber-300">Top up, gift coins, withdrawals and the 30% commission (10 coins = $1).</Topic>
          <Topic icon={CalendarHeart} title="Dates & Taxi" color="text-rose-400">Booking, escrow, taxi fees, cancellations and photo-proof rules.</Topic>
          <Topic icon={ShieldCheck} title="Safety & Verification" color="text-emerald-400">Staying safe on-platform, verification and reporting misconduct.</Topic>
          <Topic icon={Crown} title="Premium" color="text-violet-400">Benefits, billing and how monthly auto-renewal works.</Topic>
          <Topic icon={Gift} title="Gifts & Matches" color="text-pink-400">How a 100+ coin gift instantly opens a chat and creates a match.</Topic>
          <Topic icon={UserX} title="Account" color="text-sky-400">Managing, cancelling Premium, or deleting your account.</Topic>
        </div>

        {/* FAQ */}
        <h2 className="font-serif-luxe text-2xl gold-text mt-12 mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          <Faq q="How do I top up coins?">
            <p>Go to your Wallet and choose a pack, or enter a custom amount. $1 = 10 🪙 with a 2% bonus on custom top-ups. Larger packs include bonus coins.</p>
          </Faq>
          <Faq q="How do withdrawals work?">
            <p>After your bank information is approved, you can withdraw collected coins. A 30% commission is deducted, and 10 coins are valued at $1. Coins in escrow unlock after a date is confirmed.</p>
          </Faq>
          <Faq q="What happens if a date is cancelled?">
            <p>If the inviter cancels, 50% of the booking + taxi coins are refunded and 50% go as compensation to the invited user. If the invited user cancels, all coins (date + taxi) go back to the inviter. See our <Link to="/terms-of-use" className="text-amber-300 hover:underline">Terms of Use</Link> for full details.</p>
          </Faq>
          <Faq q="How do I claim coins after a date?">
            <p>Submit photo proof within 24 hours to receive 100%. After 24 hours with no photo and no complaint from the inviter, you can claim 50% (the platform keeps the other 50%). The "Get 50% now" button unlocks 24 hours after the date starts.</p>
          </Faq>
          <Faq q="When can I share my phone number or photos in chat?">
            <p>For your safety, phone numbers and chat photos unlock only after a confirmed date. Please keep all arrangements on-platform — off-platform meetings can't be protected and may lead to a block.</p>
          </Faq>
          <Faq q="How does Premium billing work?">
            <p>Premium unlocks unlimited likes, top placement, advanced filters, seeing who liked you, and priority support. It auto-renews monthly until you cancel from your profile. Cancelling keeps access until the end of the paid period.</p>
          </Faq>
          <Faq q="How do I cancel Premium or delete my account?">
            <p>Open your Profile page to cancel Premium auto-renewal or delete your account. You can also email us at <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a> for assistance.</p>
          </Faq>
          <Faq q="A date was a no-show — what do I do?">
            <p>During the first 24 hours after the date starts, contact us. We'll reach out to the other side to confirm, and coins will be returned to you.</p>
          </Faq>
          <Faq q="How do I report someone or a safety concern?">
            <p>Use the report option on the person's profile or chat, or email <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a> with details. Review our <Link to="/terms-of-use" className="text-amber-300 hover:underline">Terms of Use</Link> for prohibited conduct.</p>
          </Faq>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500">
          Still need help? Email <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a> · <Link to="/terms" className="hover:text-amber-300">Terms of Service</Link> · <Link to="/terms-of-use" className="hover:text-amber-300">Terms of Use</Link> · <Link to="/privacy" className="hover:text-amber-300">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
