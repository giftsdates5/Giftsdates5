import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

const EFFECTIVE = "June 1, 2026";

const S = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24" data-testid={`privacy-section-${id}`}>
    <h2 className="font-serif-luxe text-2xl gold-text mb-3 mt-10">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
  </section>
);

export default function Privacy() {
  return (
    <div className="min-h-screen aurora-bg text-white">
      <div className="max-w-3xl mx-auto px-4 py-14" data-testid="privacy-page">
        <Link to="/" className="text-sm text-slate-400 hover:text-white" data-testid="privacy-back-link">← Back to GiftsDates</Link>
        <div className="flex items-center gap-3 mt-6 mb-2">
          <div className="w-11 h-11 rounded-xl overflow-hidden gold-hairline bg-[#1A0A14] flex items-center justify-center"><ShieldCheck className="text-amber-300" size={22} /></div>
          <h1 className="font-serif-luxe text-4xl sm:text-5xl gold-text">Privacy Policy</h1>
        </div>
        <p className="text-xs text-slate-500 mb-2">Effective date: {EFFECTIVE}</p>
        <p className="text-sm text-slate-400">GiftsDates ("GiftsDates", "we", "us", "our") operates this dating platform and mobile web experience (the "Service"). This Privacy Policy explains how we collect, use, disclose, transfer and protect your personal data, and the rights you have wherever you live. This is a global policy designed to meet the GDPR (EU/UK), CCPA/CPRA (California), LGPD (Brazil), PIPEDA (Canada), Australia Privacy Act, and other applicable data-protection laws.</p>

        <S id="scope" title="1. Who this policy covers">
          <p>This policy applies to all visitors, registered members, and premium subscribers worldwide who access the Service. By creating an account or using the Service, you acknowledge this Privacy Policy. If you do not agree, please do not use the Service. You must be at least 18 years old (or the age of majority in your jurisdiction) to use GiftsDates.</p>
        </S>

        <S id="controller" title="2. Data controller & contact">
          <p>GiftsDates is the controller of your personal data. For any privacy request, question, or complaint, contact our Data Protection Officer at <span className="text-amber-300">help@GiftsDates.com</span>. EU/UK users may also lodge a complaint with their local supervisory authority.</p>
        </S>

        <S id="collect" title="3. Information we collect">
          <p><b>You provide directly:</b> name, age/date of birth, gender, sexual orientation, photos, bio, city/country, preferences, and other dating profile details; account credentials (email, hashed password); messages, gifts and interactions you send; identity/selfie verification documents you submit; support communications.</p>
          <p><b>Sensitive data:</b> a dating profile may reveal information some laws treat as sensitive (e.g., sexual orientation, religion, health/lifestyle choices). Where you choose to provide this, you give your explicit consent to process it to deliver the matchmaking Service. You may remove such data at any time.</p>
          <p><b>Payment data:</b> coin purchases and Premium are processed by our payment processor (Stripe). We do not store your full card number; we receive limited transaction metadata (amount, status, last4, billing country).</p>
          <p><b>Collected automatically:</b> device and browser information, IP address, approximate location, pages viewed, presence/last-seen status, notification tokens, cookies and similar technologies, and security/anti-fraud signals.</p>
          <p><b>From third parties:</b> payment confirmations from Stripe, email delivery status from our email provider (Resend), and fraud/abuse signals.</p>
        </S>

        <S id="use" title="4. How and why we use your data (legal bases)">
          <p>We process personal data to: (a) create and operate your account and profile; (b) provide core features — discovery, likes, matches, chat, virtual gifts, coins/escrow, dates and payouts; (c) process payments and Premium subscriptions; (d) send transactional emails and push/in-app notifications about gifts, invitations, chats, likes and matches; (e) verify identity and keep the community safe (moderation, anti-fraud, blocking users who violate rules); (f) provide support; (g) comply with legal obligations; (h) improve and secure the Service.</p>
          <p><b>Legal bases (GDPR):</b> performance of a contract (operating the Service); your consent (sensitive profile data, optional notifications, non-essential cookies); legitimate interests (security, fraud prevention, service improvement); and legal obligation (tax, law-enforcement requests).</p>
        </S>

        <S id="share" title="5. How we share information">
          <p><b>With other users:</b> your profile, photos, presence and the content you send are visible to members you interact with, consistent with your settings and Premium features.</p>
          <p><b>Service providers (processors):</b> Stripe (payments), Resend (email), cloud hosting and object storage, and analytics/anti-abuse tools — all bound by contracts limiting their use of your data.</p>
          <p><b>Legal & safety:</b> we may disclose data to comply with law, enforce our Terms, protect users' safety, or in connection with a merger or acquisition.</p>
          <p><b>We do not sell your personal information</b> for money, and we do not "share" it for cross-context behavioural advertising as defined by California law.</p>
        </S>

        <S id="transfers" title="6. International data transfers">
          <p>We operate globally, so your data may be processed in countries other than your own. Where required, we rely on appropriate safeguards such as the European Commission's Standard Contractual Clauses, the UK IDTA, and equivalent mechanisms to protect your data during international transfers.</p>
        </S>

        <S id="retention" title="7. Data retention">
          <p>We keep personal data only as long as needed to provide the Service and for legitimate/legal purposes. When you delete your account, we permanently remove your profile, photos, likes, matches, conversations and messages, and payout details, except limited records we must retain for legal, tax, fraud-prevention or dispute-resolution purposes, which are then deleted or anonymised.</p>
        </S>

        <S id="rights" title="8. Your privacy rights">
          <p>Depending on where you live, you may have the right to: access your data; correct it; delete it; restrict or object to processing; port your data; withdraw consent at any time; and not be discriminated against for exercising these rights. California residents have rights to know, delete, correct and opt out under the CCPA/CPRA.</p>
          <p>You can exercise many rights directly in the app (edit your profile, manage notification sound, cancel your subscription, or permanently delete your account under Profile → Account). For other requests, email <span className="text-amber-300">help@GiftsDates.com</span>; we respond within the timeframes required by law (generally 30 days).</p>
        </S>

        <S id="security" title="9. Security">
          <p>We protect your data with encryption in transit, hashed passwords, access controls, and private, authenticated access to uploaded media. No method of transmission or storage is 100% secure, but we work continuously to safeguard your information and will notify you and regulators of qualifying breaches as required by law.</p>
        </S>

        <S id="safety" title="10. Safety & off-platform activity">
          <p>For your safety, keep all contact and meeting arrangements on the Service. Arranging to meet privately off-platform is at your own risk — we cannot guarantee your safety and such conduct may violate our Terms and lead to account suspension.</p>
        </S>

        <S id="cookies" title="11. Cookies & tracking">
          <p>We use strictly necessary cookies/local storage to keep you logged in and remember preferences (such as your notification-sound choice and language). Where required, we ask for consent before using non-essential cookies. You can control cookies through your browser settings.</p>
        </S>

        <S id="children" title="12. Children">
          <p>The Service is strictly for adults (18+). We do not knowingly collect data from anyone under 18. If we learn a minor has registered, we will delete the account promptly.</p>
        </S>

        <S id="changes" title="13. Changes to this policy">
          <p>We may update this Privacy Policy from time to time. Material changes will be communicated in-app or by email. The "Effective date" above shows the latest version. Continued use after changes take effect constitutes acceptance.</p>
        </S>

        <S id="contact" title="14. Contact us">
          <p>Questions or requests? Email <span className="text-amber-300">help@GiftsDates.com</span>. We are committed to resolving concerns and honouring your rights under applicable law worldwide.</p>
        </S>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500">© {new Date().getFullYear()} GiftsDates · Luxury Dating. All rights reserved.</div>
      </div>
    </div>
  );
}
