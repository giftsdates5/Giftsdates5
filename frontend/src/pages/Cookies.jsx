import React from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

const S = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24" data-testid={`cookie-section-${id}`}>
    <h2 className="font-serif-luxe text-2xl gold-text mb-3 mt-10">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
  </section>
);
const Li = ({ children }) => <li className="ml-5 list-disc">{children}</li>;

const Row = ({ name, purpose, type, duration }) => (
  <tr className="border-t border-white/10">
    <td className="py-3 pe-4 font-mono text-xs text-amber-200 align-top">{name}</td>
    <td className="py-3 pe-4 align-top">{purpose}</td>
    <td className="py-3 pe-4 align-top text-slate-400">{type}</td>
    <td className="py-3 align-top text-slate-400">{duration}</td>
  </tr>
);

export default function Cookies() {
  return (
    <div className="min-h-screen aurora-bg text-white">
      <div className="max-w-3xl mx-auto px-4 py-14" data-testid="cookie-page">
        <Link to="/" className="text-sm text-slate-400 hover:text-white" data-testid="cookie-back-link">← Back to GiftsDates</Link>
        <div className="flex items-center gap-3 mt-6 mb-2">
          <div className="w-11 h-11 rounded-xl overflow-hidden gold-hairline bg-[#1A0A14] flex items-center justify-center"><Cookie className="text-amber-300" size={22} /></div>
          <h1 className="font-serif-luxe text-4xl sm:text-5xl gold-text">Cookie Notice</h1>
        </div>
        <p className="text-xs text-slate-500 mb-4">Last updated: September 2026</p>
        <p className="text-sm text-slate-300">This Cookie Notice explains how GiftsDates uses cookies and similar technologies to recognise you when you visit our website. It should be read together with our <Link to="/privacy" className="text-amber-300 hover:underline">Privacy Policy</Link>.</p>

        <S id="what" title="What are cookies?">
          <p>Cookies are small text files placed on your device when you visit a website. They are widely used to make websites work, to make them more efficient, and to provide reporting information. Similar technologies include local storage, pixels, and software development kits (SDKs).</p>
          <p>Cookies set by us are called "first-party cookies". Cookies set by parties other than us are called "third-party cookies", which enable features or functionality provided by a third party (such as analytics or payments).</p>
        </S>

        <S id="why" title="Why we use cookies">
          <p>We use cookies for the following reasons:</p>
          <ul className="space-y-1">
            <Li><span className="text-white">Strictly necessary</span> — required to operate the site, keep you signed in, and process payments securely. These cannot be switched off.</Li>
            <Li><span className="text-white">Functional</span> — remember your preferences, such as language and notification sound settings.</Li>
            <Li><span className="text-white">Performance &amp; analytics</span> — help us understand how the site is used so we can improve it.</Li>
            <Li><span className="text-white">Advertising</span> — where used, help measure the effectiveness of campaigns. We do not use cookies to build sensitive dating profiles for advertising.</Li>
          </ul>
        </S>

        <S id="types" title="Cookies we use">
          <div className="overflow-x-auto rounded-xl gold-hairline glass p-1">
            <table className="w-full text-sm text-slate-300 min-w-[560px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Cookie</th>
                  <th className="py-3 pe-4">Purpose</th>
                  <th className="py-3 pe-4">Type</th>
                  <th className="py-3">Duration</th>
                </tr>
              </thead>
              <tbody>
                <Row name="gd_session" purpose="Keeps you securely signed in to your account." type="Strictly necessary" duration="Session / 30 days" />
                <Row name="gd_lang" purpose="Remembers your selected language." type="Functional" duration="1 year" />
                <Row name="gd_sound" purpose="Remembers your notification sound preference." type="Functional" duration="1 year" />
                <Row name="gd_spin" purpose="Prevents repeat pre-registration spins from the same device." type="Functional" duration="30 days" />
                <Row name="_analytics" purpose="Aggregated, anonymised usage statistics to improve the service." type="Performance" duration="Up to 2 years" />
                <Row name="stripe_*" purpose="Enables secure payment processing and fraud prevention." type="Strictly necessary (third-party)" duration="Set by Stripe" />
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">Exact cookie names and durations may vary as we improve the platform. This table is illustrative of the categories we use.</p>
        </S>

        <S id="thirdparty" title="Third-party technologies">
          <p>Some features rely on trusted third parties that may set their own cookies, including:</p>
          <ul className="space-y-1">
            <Li><span className="text-white">Stripe</span> — secure payments and fraud prevention.</Li>
            <Li><span className="text-white">Google Maps</span> — location search and map previews when arranging dates.</Li>
          </ul>
          <p>These providers process data under their own privacy and cookie policies.</p>
        </S>

        <S id="choices" title="Your choices and how to control cookies">
          <p>You have the right to decide whether to accept or reject non-essential cookies. You can control cookies in the following ways:</p>
          <ul className="space-y-1">
            <Li>Adjust your consent preferences in our cookie banner when it is shown.</Li>
            <Li>Use your browser settings to block or delete cookies. Most browsers let you refuse or remove cookies via the settings menu.</Li>
            <Li>Opt out of analytics or advertising cookies where offered.</Li>
          </ul>
          <p>Please note that if you block strictly necessary cookies, parts of the site — such as signing in and payments — may not function correctly.</p>
        </S>

        <S id="changes" title="Changes to this notice">
          <p>We may update this Cookie Notice from time to time to reflect changes to the cookies we use or for operational, legal, or regulatory reasons. The "Last updated" date at the top indicates when it was last revised.</p>
        </S>

        <S id="contact" title="Contact us">
          <p>If you have questions about our use of cookies or other technologies, email us at <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a>.</p>
        </S>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500">© {new Date().getFullYear()} GiftsDates · Luxury Dating. · <Link to="/privacy" className="hover:text-amber-300">Privacy Policy</Link> · <Link to="/terms" className="hover:text-amber-300">Terms of Service</Link></div>
      </div>
    </div>
  );
}
