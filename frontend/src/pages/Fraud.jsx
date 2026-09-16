import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

const S = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24" data-testid={`fraud-section-${id}`}>
    <h2 className="font-serif-luxe text-2xl gold-text mb-3 mt-10">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
  </section>
);
const Li = ({ children }) => <li className="ml-5 list-disc">{children}</li>;

const Flag = ({ title, children }) => (
  <div className="glass rounded-xl p-4 gold-hairline">
    <div className="flex items-start gap-3">
      <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={18} />
      <div>
        <h3 className="font-semibold text-white text-sm">{title}</h3>
        <p className="mt-1 text-sm text-slate-300 leading-relaxed">{children}</p>
      </div>
    </div>
  </div>
);

export default function Fraud() {
  return (
    <div className="min-h-screen aurora-bg text-white">
      <div className="max-w-3xl mx-auto px-4 py-14" data-testid="fraud-page">
        <Link to="/" className="text-sm text-slate-400 hover:text-white" data-testid="fraud-back-link">← Back to GiftsDates</Link>
        <div className="flex items-center gap-3 mt-6 mb-2">
          <div className="w-11 h-11 rounded-xl overflow-hidden gold-hairline bg-[#1A0A14] flex items-center justify-center"><ShieldAlert className="text-amber-300" size={22} /></div>
          <h1 className="font-serif-luxe text-4xl sm:text-5xl gold-text">Fraud &amp; Scam Prevention</h1>
        </div>
        <p className="text-xs text-slate-500 mb-4">Last updated: September 2026</p>
        <p className="text-sm font-semibold text-amber-200">Your safety and money matter. Learn how we protect you and how to spot and avoid scams.</p>

        <S id="commitment" title="Our commitment">
          <p>GiftsDates works hard to keep our community safe from fraud, scams, and financial abuse. We combine identity verification, escrow protection, anti-money-laundering controls, and human and automated monitoring to detect and stop bad actors. This page explains how we protect you and, just as importantly, how you can protect yourself.</p>
        </S>

        <S id="protections" title="How we protect you">
          <ul className="space-y-1">
            <Li><span className="text-white">Age &amp; identity verification</span> — users are verified adults, and we may re-verify at any time.</Li>
            <Li><span className="text-white">Escrow for dates</span> — coins for a booked date are held safely and only released after the date is confirmed with photo proof.</Li>
            <Li><span className="text-white">On-platform payments</span> — keeping payments on GiftsDates means they are traceable and can be reviewed if something goes wrong.</Li>
            <Li><span className="text-white">Payout checks</span> — bank details are approved before withdrawals, and we monitor for suspicious activity and money laundering.</Li>
            <Li><span className="text-white">Monitoring &amp; moderation</span> — automated tools and trained reviewers flag scam patterns and risky behaviour.</Li>
            <Li><span className="text-white">Easy reporting</span> — every profile and chat has a report option so you can flag concerns instantly.</Li>
          </ul>
        </S>

        <S id="redflags" title="Common scams and red flags">
          <p>Be cautious if someone does any of the following — these are classic warning signs:</p>
          <div className="grid gap-3 mt-2">
            <Flag title="Rushing you off-platform">Quickly asks to move to WhatsApp, Telegram, email, or text. Scammers want to avoid our protections. Keep chats on GiftsDates.</Flag>
            <Flag title="Asking for money or gift cards">Requests money transfers, bank details, crypto, gift cards, or top-ups outside the platform — often citing an emergency, travel, or a customs/visa fee.</Flag>
            <Flag title="Too good to be true">Professes strong feelings very fast ("love bombing"), or has model-perfect photos with an unwilling stance on video calls.</Flag>
            <Flag title="Investment or crypto tips">Offers to help you "invest" or promises guaranteed returns. This is a common romance-investment ("pig butchering") scam.</Flag>
            <Flag title="Sob stories and urgency">Creates pressure with sudden hardships, medical bills, or stranded-traveller stories to get you to send funds fast.</Flag>
            <Flag title="Third parties and controlled accounts">Someone else seems to be answering, translating, or controlling the account, or asks you to pay a "manager" or third party.</Flag>
            <Flag title="Phishing links">Sends links to fake login or payment pages. Never enter your GiftsDates password anywhere except our official site.</Flag>
            <Flag title="Blackmail / sextortion">Threatens to share intimate images unless you pay. Do not pay — report it to us and to the authorities.</Flag>
          </div>
        </S>

        <S id="stay-safe" title="How to protect yourself">
          <ul className="space-y-1">
            <Li>Keep all conversations, payments, and arrangements on GiftsDates.</Li>
            <Li>Never send money, gift cards, crypto, or bank/card details to another user.</Li>
            <Li>Share your phone number only after a confirmed date — and even then, stay cautious.</Li>
            <Li>Use a video call to help confirm someone is who they claim to be before meeting.</Li>
            <Li>Never share your password, one-time codes, or account access with anyone. GiftsDates will never ask for your password.</Li>
            <Li>Trust your instincts — if something feels off, pause and report it.</Li>
            <Li>Meet for the first time in a public place and tell a friend your plans.</Li>
          </ul>
        </S>

        <S id="report" title="How to report fraud or a scam">
          <ul className="space-y-1">
            <Li>Use the <span className="text-white">"Report this user"</span> button on their profile, or the report option in chat.</Li>
            <Li>Email our team at <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a> with details and screenshots.</Li>
            <Li>If you have lost money, also report it to your bank or payment provider and your local authorities.</Li>
          </ul>
          <p>Reports are confidential. We investigate quickly, remove offending accounts, and cooperate with law enforcement where appropriate. See our <Link to="/complaints" className="text-amber-300 hover:underline">Complaints Policy</Link> for how we handle your report.</p>
        </S>

        <S id="chargebacks" title="Payments, refunds and chargebacks">
          <p>Coin purchases and Premium payments are non-refundable except where required by law or our Terms of Service. If you believe a transaction was fraudulent, contact us before raising a chargeback so we can investigate. Bad-faith or fraudulent refund and chargeback requests may lead to suspension or deletion of your account, and we may recover corresponding amounts from your earnings.</p>
        </S>

        <S id="action" title="Action we take against fraudsters">
          <p>Accounts engaged in fraud or scams are permanently banned. We may withhold or forfeit associated earnings, freeze suspicious payouts, preserve evidence, and report activity to payment providers and authorities. Our <Link to="/safety" className="text-amber-300 hover:underline">Safety &amp; Transparency Center</Link> explains our broader safeguards.</p>
        </S>

        <S id="contact" title="Contact">
          <p>If you have questions or want to report a scam, email us at <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a>.</p>
        </S>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500">© {new Date().getFullYear()} GiftsDates · Luxury Dating. · <Link to="/safety" className="hover:text-amber-300">Safety &amp; Transparency</Link> · <Link to="/complaints" className="hover:text-amber-300">Complaints Policy</Link></div>
      </div>
    </div>
  );
}
