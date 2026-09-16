import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck, BadgeCheck, Gavel, Landmark, ShieldAlert, FileText, HeartHandshake,
  BarChart3, Copyright, Compass, CalendarCheck, Users, Lock, Banknote, MessageSquareWarning, Receipt, Scale,
} from "lucide-react";

const TOPICS = [
  { id: "age-identity", icon: BadgeCheck, color: "text-emerald-400", title: "Age & Identity Verification", body: "Every user must be 18+. We verify age and identity during onboarding using government-issued ID and photo checks, and may re-request verification at any time. Accounts that cannot be verified are restricted or removed." },
  { id: "appeals", icon: Gavel, color: "text-amber-300", title: "Appeals Policy", body: "If we remove your content or restrict your account, we tell you why and give you a route to appeal. Appeals are reviewed by our team, and eligible decisions can be reconsidered. Contact help@GiftsDates.com to start an appeal." },
  { id: "law-enforcement", icon: Landmark, color: "text-sky-400", title: "Assisting Law Enforcement", body: "We cooperate with valid legal requests from law enforcement and disclose information in line with applicable law and our Privacy Policy. We may proactively report serious criminal activity to the relevant authorities." },
  { id: "csam", icon: ShieldAlert, color: "text-rose-400", title: "Combatting CSAM", body: "We have zero tolerance for child sexual abuse material. We use detection tools and human review, remove offending content immediately, permanently ban offenders, preserve evidence, and report to the appropriate authorities and organisations." },
  { id: "moderation", icon: FileText, color: "text-violet-400", title: "Content Moderation Policy", body: "Content is reviewed using a combination of technology (including classifiers and AI-assisted tools) and trained human moderators. We remove content that breaches our Terms of Use and act on reports promptly." },
  { id: "consent", icon: HeartHandshake, color: "text-pink-400", title: "Ensuring Consent for Intimate Images", body: "Every person appearing in intimate content must be a verified, consenting adult with a completed release. We prohibit non-consensual, fake, or manipulated intimate imagery and remove it on report." },
  { id: "dsa", icon: BarChart3, color: "text-amber-300", title: "EU Digital Services Act Transparency Report", body: "In line with the EU DSA, we publish information about content moderation activity, notices received and actioned, appeals, and our points of contact for users and authorities in the EU." },
  { id: "copyright", icon: Copyright, color: "text-sky-400", title: "Helping Creators Protect their Copyright", body: "We respect intellectual property and operate a DMCA-style takedown process. Rights holders can report infringement, and we act on valid notices. We can also submit infringement notices on behalf of users where appropriate." },
  { id: "mission", icon: Compass, color: "text-emerald-400", title: "Mission, Vision & Values", body: "Our mission is to make luxury romance effortless, honest, and safe worldwide. We value genuine connection, consent, transparency, and the safety of everyone in our community." },
  { id: "monthly", icon: CalendarCheck, color: "text-violet-400", title: "Monthly Transparency Reports", body: "We publish regular reports covering the volume of reports received, content removed, accounts actioned, and law-enforcement requests, so our community can see how we enforce our policies." },
  { id: "commitment", icon: ShieldCheck, color: "text-rose-400", title: "Our Commitment to Safety & Transparency", body: "Safety is designed into the product: verification, on-platform arrangements, escrow, photo-confirmed meetings, and clear reporting tools. We are transparent about how we moderate and why." },
  { id: "trafficking", icon: Users, color: "text-amber-300", title: "Preventing Modern Slavery & Human Trafficking", body: "We have zero tolerance for human trafficking and modern slavery. We use verification, monitoring, and reporting channels to detect and prevent exploitation, and cooperate with authorities and specialist organisations." },
  { id: "privacy", icon: Lock, color: "text-sky-400", title: "Respecting Your Privacy", body: "We handle personal and sensitive dating data with care under global privacy laws (including GDPR and CCPA). Read our Privacy Policy for details on what we collect, why, and your rights." },
  { id: "aml", icon: Banknote, color: "text-emerald-400", title: "Safeguarding Against Money Laundering & Fraud", body: "We apply anti-money-laundering and fraud controls, including identity checks on payouts, monitoring of suspicious activity, and the ability to withhold or reverse funds tied to unlawful or fraudulent activity." },
  { id: "hate-speech", icon: MessageSquareWarning, color: "text-rose-400", title: "Tackling Hate Speech", body: "We prohibit attacks on people based on race, ethnicity, national origin, caste, sexual orientation, gender, gender identity, religion, age, disability, or disease, and we remove hateful content and act on the accounts responsible." },
  { id: "tax-policy", icon: Receipt, color: "text-violet-400", title: "Tax Policy", body: "Users are responsible for their own tax affairs and for reporting earnings to the relevant authorities. We deduct our platform fee and provide the information users need, but we do not provide tax advice." },
  { id: "tax-strategy", icon: Scale, color: "text-amber-300", title: "Tax Strategy", body: "We are committed to complying with tax laws in the jurisdictions where we operate, maintaining transparent relationships with tax authorities, and paying the tax we owe." },
];

const Card = ({ icon: Icon, color, title, body }) => (
  <details className="glass rounded-2xl p-5 gold-hairline group card-lift" data-testid={`safety-topic-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`}>
    <summary className="cursor-pointer list-none flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl gold-hairline bg-white/5 flex items-center justify-center shrink-0 ${color}`}><Icon size={18} /></div>
      <div className="flex-1">
        <h3 className="font-serif-luxe text-lg text-white leading-snug">{title}</h3>
      </div>
      <span className="text-amber-300 transition-transform group-open:rotate-45 text-xl leading-none shrink-0">+</span>
    </summary>
    <p className="mt-3 text-sm text-slate-300 leading-relaxed">{body}</p>
  </details>
);

export default function Safety() {
  return (
    <div className="min-h-screen aurora-bg text-white">
      <div className="max-w-5xl mx-auto px-4 py-14" data-testid="safety-page">
        <Link to="/" className="text-sm text-slate-400 hover:text-white" data-testid="safety-back-link">← Back to GiftsDates</Link>
        <div className="flex items-center gap-3 mt-6 mb-2">
          <div className="w-11 h-11 rounded-xl overflow-hidden gold-hairline bg-[#1A0A14] flex items-center justify-center"><ShieldCheck className="text-amber-300" size={22} /></div>
          <h1 className="font-serif-luxe text-4xl sm:text-5xl gold-text">Safety &amp; Transparency Center</h1>
        </div>
        <p className="text-slate-300 max-w-2xl">Trust is the foundation of GiftsDates. Explore the policies and reports that explain how we keep our community safe and how we hold ourselves accountable.</p>

        <div className="mt-10 grid md:grid-cols-2 gap-4">
          {TOPICS.map((t) => <Card key={t.id} {...t} />)}
        </div>

        <div className="mt-12 relative rounded-2xl overflow-hidden gold-hairline glass p-8 text-center" data-testid="safety-contact-cta">
          <div className="absolute -inset-10 bg-gradient-to-tr from-rose-500/20 via-transparent to-amber-500/20 blur-3xl" />
          <div className="relative">
            <h3 className="font-serif-luxe text-2xl">Report a concern</h3>
            <p className="mt-2 text-sm text-slate-300 max-w-xl mx-auto">If you see something that breaches our policies, use the report tools in the app or contact our safety team directly.</p>
            <a href="mailto:help@GiftsDates.com" data-testid="safety-email-btn" className="mt-5 rose-btn inline-flex items-center gap-2 text-white border-0 h-11 px-6 rounded-md text-sm font-semibold">Email help@GiftsDates.com</a>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500">
          <Link to="/terms-of-use" className="hover:text-amber-300">Terms of Use</Link> · <Link to="/terms" className="hover:text-amber-300">Terms of Service</Link> · <Link to="/privacy" className="hover:text-amber-300">Privacy Policy</Link> · <Link to="/cookies" className="hover:text-amber-300">Cookie Notice</Link>
        </div>
      </div>
    </div>
  );
}
