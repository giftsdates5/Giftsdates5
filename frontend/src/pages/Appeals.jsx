import React from "react";
import { Link } from "react-router-dom";
import { Gavel } from "lucide-react";

const S = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24" data-testid={`appeals-section-${id}`}>
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

export default function Appeals() {
  return (
    <div className="min-h-screen aurora-bg text-white">
      <div className="max-w-3xl mx-auto px-4 py-14" data-testid="appeals-page">
        <Link to="/" className="text-sm text-slate-400 hover:text-white" data-testid="appeals-back-link">← Back to GiftsDates</Link>
        <div className="flex items-center gap-3 mt-6 mb-2">
          <div className="w-11 h-11 rounded-xl overflow-hidden gold-hairline bg-[#1A0A14] flex items-center justify-center"><Gavel className="text-amber-300" size={22} /></div>
          <h1 className="font-serif-luxe text-4xl sm:text-5xl gold-text">Appeals Policy</h1>
        </div>
        <p className="text-xs text-slate-500 mb-4">Last updated: September 2026</p>
        <p className="text-sm text-slate-300">If we have taken action on your content or your account, you have the right to ask us to reconsider. This policy explains what you can appeal, how to appeal, and what happens next.</p>

        <S id="what" title="What you can appeal">
          <p>You can appeal a decision we have made to:</p>
          <ul className="space-y-1">
            <Li>Remove, hide, or restrict your content.</Li>
            <Li>Suspend, restrict, or delete your account.</Li>
            <Li>Apply a warning or a temporary block.</Li>
            <Li>Withhold, forfeit, or reverse earnings.</Li>
            <Li>Reject an identity or payout verification.</Li>
            <Li>Uphold a report made against you by another user.</Li>
          </ul>
          <p>If your concern is about another user, a payment error, or how we handled your data, please use our <Link to="/complaints" className="text-amber-300 hover:underline">Complaints Policy</Link> instead.</p>
        </S>

        <S id="notice" title="Notice of our decision">
          <p>When we take action, we aim to tell you what we did, the main reason for it, and which part of our <Link to="/terms-of-use" className="text-amber-300 hover:underline">Terms of Use</Link> or policies it relates to. That notice will also point you to this Appeals Policy so you know how to respond.</p>
        </S>

        <S id="how" title="How to submit an appeal">
          <p>To appeal, email <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a> with the subject line "Appeal" and include:</p>
          <ul className="space-y-1">
            <Li>Your account email.</Li>
            <Li>The decision you are appealing (and any reference number from our notice).</Li>
            <Li>Why you believe the decision was wrong or should be reconsidered.</Li>
            <Li>Any evidence or context that supports your appeal.</Li>
          </ul>
          <p>You must submit your appeal within <span className="text-white">six months</span> of being notified of the decision. If you do not appeal within that time, you may waive your right to dispute it.</p>
        </S>

        <S id="process" title="How we handle appeals">
          <div className="grid gap-3 mt-2">
            <Step n="01" title="Acknowledgement">We aim to acknowledge your appeal within 48 hours.</Step>
            <Step n="02" title="Independent review">Your appeal is reviewed by someone who was not involved in the original decision, wherever possible.</Step>
            <Step n="03" title="Reconsideration">We re-examine the content or account, your explanation, and any new evidence, and may ask you for more information.</Step>
            <Step n="04" title="Outcome">We aim to respond within 14 days. We will either uphold, reverse, or vary the original decision and explain why.</Step>
          </div>
        </S>

        <S id="outcomes" title="Possible outcomes">
          <ul className="space-y-1">
            <Li><span className="text-white">Reversed</span> — we restore your content or account and, where relevant, release any withheld earnings.</Li>
            <Li><span className="text-white">Varied</span> — we reduce or adjust the action taken (for example, a warning instead of a block).</Li>
            <Li><span className="text-white">Upheld</span> — the original decision stands, and we explain the reason.</Li>
          </ul>
        </S>

        <S id="limits" title="Important limitations">
          <ul className="space-y-1">
            <Li>Some decisions cannot be reversed where the law requires removal (for example, illegal content such as CSAM or non-consensual intimate images).</Li>
            <Li>Accounts terminated for serious or repeated violations may not be reinstated, and related payments — including prepaid Premium — may not be refunded.</Li>
            <Li>We may decline to review repeated appeals about the same decision where no new information is provided.</Li>
          </ul>
        </S>

        <S id="external" title="Further options">
          <ol className="space-y-1">
            <Ol>If you remain dissatisfied after our appeal decision, you may, where available, refer the matter to a relevant external or out-of-court dispute-resolution body in your country.</Ol>
            <Ol>Users in the EU can raise certain disputes with the relevant Digital Services Coordinator or a certified out-of-court dispute settlement body.</Ol>
            <Ol>Nothing in this policy limits your statutory rights or your right to seek independent legal advice.</Ol>
          </ol>
        </S>

        <S id="goodfaith" title="Good-faith use">
          <p>Please use the appeals process in good faith. Abusive, vexatious, or knowingly false appeals may not be actioned and can lead to further account restrictions.</p>
        </S>

        <S id="contact" title="Contact">
          <p>To start an appeal, email us at <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a>.</p>
        </S>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500">© {new Date().getFullYear()} GiftsDates · Luxury Dating. · <Link to="/complaints" className="hover:text-amber-300">Complaints Policy</Link> · <Link to="/safety" className="hover:text-amber-300">Safety &amp; Transparency</Link></div>
      </div>
    </div>
  );
}
