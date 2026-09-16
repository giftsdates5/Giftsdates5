import React from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";

const S = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24" data-testid={`ats-section-${id}`}>
    <h2 className="font-serif-luxe text-2xl gold-text mb-3 mt-10">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
  </section>
);
const Li = ({ children }) => <li className="ml-5 list-disc">{children}</li>;

export default function AntiTrafficking() {
  return (
    <div className="min-h-screen aurora-bg text-white">
      <div className="max-w-3xl mx-auto px-4 py-14" data-testid="ats-page">
        <Link to="/" className="text-sm text-slate-400 hover:text-white" data-testid="ats-back-link">← Back to GiftsDates</Link>
        <div className="flex items-center gap-3 mt-6 mb-2">
          <div className="w-11 h-11 rounded-xl overflow-hidden gold-hairline bg-[#1A0A14] flex items-center justify-center"><Users className="text-amber-300" size={22} /></div>
          <h1 className="font-serif-luxe text-4xl sm:text-5xl gold-text">Anti-Trafficking &amp; Anti-Slavery Policy</h1>
        </div>
        <p className="text-xs text-slate-500 mb-4">Last updated: September 2026</p>
        <p className="text-sm font-semibold text-amber-200">GiftsDates has zero tolerance for human trafficking, modern slavery, and any form of exploitation.</p>

        <S id="commitment" title="Our commitment">
          <p>GiftsDates is committed to preventing human trafficking, forced labour, servitude, and modern slavery in all its forms, both on our platform and in our operations and supply chains. We recognise the particular risks that dating and companionship platforms can present, and we build our product, policies, and enforcement to protect the people in our community.</p>
          <p>This policy applies to everyone who uses GiftsDates, as well as to our employees, contractors, and business partners.</p>
        </S>

        <S id="prohibited" title="What is strictly prohibited">
          <p>The following are absolutely prohibited on GiftsDates and will result in immediate removal and, where appropriate, a report to law enforcement:</p>
          <ul className="space-y-1">
            <Li>Any form of human trafficking, including for sexual or labour exploitation.</Li>
            <Li>Forced, coerced, bonded, or involuntary participation of any person.</Li>
            <Li>Recruiting, harbouring, transporting, or controlling another person for exploitation.</Li>
            <Li>Any content or activity involving a person who is not a freely consenting adult.</Li>
            <Li>Controlling another person's account, earnings, movement, or communications against their will.</Li>
            <Li>Third parties operating an account on behalf of, or profiting from, an exploited individual.</Li>
          </ul>
        </S>

        <S id="measures" title="How we prevent it">
          <p>We take a layered approach to detecting and preventing trafficking and slavery:</p>
          <ul className="space-y-1">
            <Li><span className="text-white">Age &amp; identity verification</span> — all users must be verified adults; we may re-verify at any time.</Li>
            <Li><span className="text-white">On-platform first</span> — keeping contact, payments, and arrangements on-platform lets us monitor for coercion and intervene.</Li>
            <Li><span className="text-white">Payment &amp; payout controls</span> — anti-fraud and anti-money-laundering checks help detect third parties profiting from exploitation.</Li>
            <Li><span className="text-white">Human &amp; automated moderation</span> — trained reviewers and detection tools flag indicators of trafficking.</Li>
            <Li><span className="text-white">Reporting tools</span> — every profile and chat includes a way to report concerns confidentially.</Li>
            <Li><span className="text-white">Staff training</span> — our teams are trained to recognise and escalate warning signs.</Li>
          </ul>
        </S>

        <S id="signs" title="Warning signs to look out for">
          <p>Please contact us if you notice any of the following, which may indicate that someone is being exploited:</p>
          <ul className="space-y-1">
            <Li>A person appears to be monitored, scripted, or not in control of their own account.</Li>
            <Li>Someone else answers, translates, or dictates messages on their behalf.</Li>
            <Li>Signs of fear, distress, or being pressured to meet or send money.</Li>
            <Li>Requests to move money to a third party or to an unrelated account.</Li>
            <Li>Inconsistent or evasive answers about identity, age, or circumstances.</Li>
          </ul>
        </S>

        <S id="report" title="How to report">
          <p>If you believe someone is being trafficked or exploited, report it immediately:</p>
          <ul className="space-y-1">
            <Li>Use the <span className="text-white">"Report this user"</span> button on their profile.</Li>
            <Li>Email our safety team at <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a>.</Li>
            <Li>If someone is in immediate danger, contact your local emergency services first.</Li>
          </ul>
          <p>Reports are treated confidentially. We investigate promptly, preserve evidence where required, and cooperate fully with law enforcement and specialist anti-trafficking organisations.</p>
        </S>

        <S id="resources" title="Support resources">
          <p>Help is available. If you or someone you know is affected by trafficking or modern slavery, these organisations can help:</p>
          <ul className="space-y-1">
            <Li>Polaris Project / U.S. National Human Trafficking Hotline: 1-888-373-7888 (SMS: 233733).</Li>
            <Li>UK Modern Slavery Helpline: 08000 121 700.</Li>
            <Li>Global Emergency Number for immediate danger: your local emergency services.</Li>
          </ul>
        </S>

        <S id="enforcement" title="Enforcement">
          <p>Any account involved in trafficking, slavery, or exploitation will be permanently banned. We may withhold and forfeit any associated earnings, suspend related accounts, preserve records, and report the matter to the relevant authorities. Cooperation with our investigation does not limit our obligation to comply with the law.</p>
        </S>

        <S id="review" title="Governance and review">
          <p>We review this policy regularly and update it to reflect legal developments and improvements in our detection and prevention capabilities. Questions about this policy can be directed to <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a>.</p>
        </S>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500">© {new Date().getFullYear()} GiftsDates · Luxury Dating. · <Link to="/safety" className="hover:text-amber-300">Safety &amp; Transparency</Link> · <Link to="/terms-of-use" className="hover:text-amber-300">Terms of Use</Link></div>
      </div>
    </div>
  );
}
