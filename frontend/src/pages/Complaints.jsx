import React from "react";
import { Link } from "react-router-dom";
import { MessageSquareWarning } from "lucide-react";

const S = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24" data-testid={`complaints-section-${id}`}>
    <h2 className="font-serif-luxe text-2xl gold-text mb-3 mt-10">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
  </section>
);
const Li = ({ children }) => <li className="ml-5 list-disc">{children}</li>;
const Ol = ({ children }) => <li className="ml-5 list-decimal">{children}</li>;

const Step = ({ n, title, children }) => (
  <div className="glass rounded-xl p-4 gold-hairline flex gap-4">
    <span className="font-mono-num text-2xl text-slate-500 shrink-0">{n}</span>
    <div>
      <h3 className="font-semibold text-white text-sm">{title}</h3>
      <p className="mt-1 text-sm text-slate-300 leading-relaxed">{children}</p>
    </div>
  </div>
);

export default function Complaints() {
  return (
    <div className="min-h-screen aurora-bg text-white">
      <div className="max-w-3xl mx-auto px-4 py-14" data-testid="complaints-page">
        <Link to="/" className="text-sm text-slate-400 hover:text-white" data-testid="complaints-back-link">← Back to GiftsDates</Link>
        <div className="flex items-center gap-3 mt-6 mb-2">
          <div className="w-11 h-11 rounded-xl overflow-hidden gold-hairline bg-[#1A0A14] flex items-center justify-center"><MessageSquareWarning className="text-amber-300" size={22} /></div>
          <h1 className="font-serif-luxe text-4xl sm:text-5xl gold-text">Complaints Policy</h1>
        </div>
        <p className="text-xs text-slate-500 mb-4">Last updated: September 2026</p>
        <p className="text-sm text-slate-300">We are committed to resolving concerns fairly, promptly, and transparently. This policy explains how to raise a complaint with GiftsDates and what you can expect from us.</p>

        <S id="scope" title="What this policy covers">
          <p>You can use this policy to complain about, among other things:</p>
          <ul className="space-y-1">
            <Li>Content you believe breaches our <Link to="/terms-of-use" className="text-amber-300 hover:underline">Terms of Use</Link>, including illegal or non-consensual content.</Li>
            <Li>The conduct of another user, such as harassment, fraud, or a no-show at a date.</Li>
            <Li>A payment, coin, escrow, withdrawal, or refund matter.</Li>
            <Li>A decision we made to remove content, withhold earnings, or restrict your account (see also our <Link to="/appeals" className="text-amber-300 hover:underline">Appeals Policy</Link>).</Li>
            <Li>The way we have handled your personal data (see our <Link to="/privacy" className="text-amber-300 hover:underline">Privacy Policy</Link>).</Li>
          </ul>
        </S>

        <S id="how" title="How to make a complaint">
          <p>The fastest ways to raise a complaint are:</p>
          <ul className="space-y-1">
            <Li>Use the <span className="text-white">"Report this user"</span> button on a profile or the report option in a chat for issues about another user or their content.</Li>
            <Li>Email our team at <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a> with the subject line "Complaint".</Li>
          </ul>
          <p>To help us investigate quickly, please include:</p>
          <ul className="space-y-1">
            <Li>Your account email.</Li>
            <Li>A clear description of what happened and when.</Li>
            <Li>The username, profile, date booking, or transaction reference involved.</Li>
            <Li>Any screenshots or evidence that support your complaint.</Li>
            <Li>What outcome you are seeking.</Li>
          </ul>
        </S>

        <S id="process" title="Our process">
          <div className="grid gap-3 mt-2">
            <Step n="01" title="Acknowledgement">We aim to acknowledge your complaint within 48 hours of receiving it.</Step>
            <Step n="02" title="Review">A member of our team reviews the complaint, gathers relevant information, and may contact you or other parties for more detail.</Step>
            <Step n="03" title="Decision">We aim to provide a substantive response within 14 days. Complex cases may take longer, and we will keep you informed if so.</Step>
            <Step n="04" title="Outcome">We tell you the outcome and any action taken. Where content or an account is affected, we explain the reason.</Step>
          </div>
        </S>

        <S id="urgent" title="Urgent and illegal content">
          <p>We prioritise complaints involving safety and illegal content — including child sexual abuse material, non-consensual intimate images, threats of violence, and trafficking. These are actioned as a priority, removed where confirmed, and reported to the relevant authorities. If someone is in immediate danger, contact your local emergency services first.</p>
        </S>

        <S id="refunds" title="Payment, refund and chargeback complaints">
          <p>Coin purchases and Premium payments are non-refundable except as required by law or our Terms of Service. If your complaint concerns a payment, escrow, or withdrawal, we will investigate the transaction and correct any genuine error. We ask that you do not raise a chargeback in bad faith while a complaint is being handled, as this may lead to account restrictions.</p>
        </S>

        <S id="escalation" title="If you are not satisfied">
          <p>If you disagree with the outcome of your complaint, you may ask us to review it again by replying to our response and explaining why. Complaints about a moderation or account decision can also be taken through our <Link to="/appeals" className="text-amber-300 hover:underline">Appeals Policy</Link>.</p>
          <ol className="space-y-1">
            <Ol>Request a second review by our team.</Ol>
            <Ol>Where available, refer the matter to a relevant external dispute-resolution or regulatory body in your country.</Ol>
            <Ol>Nothing in this policy affects your statutory rights or your right to seek independent legal advice.</Ol>
          </ol>
        </S>

        <S id="misuse" title="Fair use of this policy">
          <p>Please use this process in good faith. Repeated, vexatious, or knowingly false complaints may not be actioned and can themselves lead to account restrictions.</p>
        </S>

        <S id="contact" title="Contact">
          <p>For all complaints, contact us at <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a>.</p>
        </S>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500">© {new Date().getFullYear()} GiftsDates · Luxury Dating. · <Link to="/safety" className="hover:text-amber-300">Safety &amp; Transparency</Link> · <Link to="/terms-of-use" className="hover:text-amber-300">Terms of Use</Link></div>
      </div>
    </div>
  );
}
