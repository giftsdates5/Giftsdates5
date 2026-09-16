import React from "react";
import { Link } from "react-router-dom";
import { Copyright } from "lucide-react";

const S = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24" data-testid={`dmca-section-${id}`}>
    <h2 className="font-serif-luxe text-2xl gold-text mb-3 mt-10">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
  </section>
);
const Li = ({ children }) => <li className="ml-5 list-disc">{children}</li>;
const Ol = ({ children }) => <li className="ml-5 list-decimal">{children}</li>;

export default function DMCA() {
  return (
    <div className="min-h-screen aurora-bg text-white">
      <div className="max-w-3xl mx-auto px-4 py-14" data-testid="dmca-page">
        <Link to="/" className="text-sm text-slate-400 hover:text-white" data-testid="dmca-back-link">← Back to GiftsDates</Link>
        <div className="flex items-center gap-3 mt-6 mb-2">
          <div className="w-11 h-11 rounded-xl overflow-hidden gold-hairline bg-[#1A0A14] flex items-center justify-center"><Copyright className="text-amber-300" size={22} /></div>
          <h1 className="font-serif-luxe text-4xl sm:text-5xl gold-text">DMCA Takedown Policy</h1>
        </div>
        <p className="text-xs text-slate-500 mb-4">Last updated: September 2026</p>
        <p className="text-sm text-slate-300">GiftsDates respects the intellectual property rights of others and expects our users to do the same. This policy explains how copyright owners can report infringing content and how affected users can respond, in accordance with the Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512.</p>

        <S id="overview" title="Our commitment">
          <p>It is our policy to (i) respond to clear notices of alleged copyright infringement that comply with the DMCA, and (ii) remove or disable access to infringing material. We also reserve the right to suspend or terminate, in appropriate circumstances, the accounts of users who are repeat infringers.</p>
        </S>

        <S id="notice" title="Filing a takedown notice">
          <p>If you are a copyright owner, or authorised to act on behalf of one, and you believe that content on GiftsDates infringes your copyright, you may submit a written notice to our Designated Agent. To be effective, your notice must include substantially the following:</p>
          <ol className="space-y-1">
            <Ol>A physical or electronic signature of the copyright owner or a person authorised to act on their behalf.</Ol>
            <Ol>Identification of the copyrighted work claimed to have been infringed (or, if multiple works, a representative list).</Ol>
            <Ol>Identification of the material that is claimed to be infringing, with enough detail (such as the URL or profile) for us to locate it.</Ol>
            <Ol>Your contact information, including your full name, address, telephone number, and email address.</Ol>
            <Ol>A statement that you have a good-faith belief that use of the material is not authorised by the copyright owner, its agent, or the law.</Ol>
            <Ol>A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorised to act on their behalf.</Ol>
          </ol>
          <p className="text-xs text-slate-500">Please note: under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material is infringing may be liable for damages.</p>
        </S>

        <S id="agent" title="Designated Copyright Agent">
          <p>Send your DMCA notice to our Designated Agent:</p>
          <div className="glass rounded-xl p-4 gold-hairline text-sm">
            <p className="text-white font-semibold">GiftsDates — Copyright Agent</p>
            <p>Email: <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a></p>
            <p className="text-slate-400">Subject line: "DMCA Takedown Notice"</p>
          </div>
        </S>

        <S id="process" title="What happens next">
          <ul className="space-y-1">
            <Li>Once we receive a valid notice, we will promptly remove or disable access to the identified material.</Li>
            <Li>We will make a reasonable attempt to notify the user who posted the material and provide them with a copy of the notice.</Li>
            <Li>We may preserve information related to the notice and the material as required or permitted by law.</Li>
          </ul>
        </S>

        <S id="counter" title="Filing a counter-notice">
          <p>If your content was removed and you believe it was removed in error or misidentified, you may submit a written counter-notice to our Designated Agent containing substantially the following:</p>
          <ol className="space-y-1">
            <Ol>Your physical or electronic signature.</Ol>
            <Ol>Identification of the material that was removed and the location at which it appeared before removal.</Ol>
            <Ol>A statement under penalty of perjury that you have a good-faith belief the material was removed as a result of mistake or misidentification.</Ol>
            <Ol>Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the appropriate court and will accept service of process from the party who filed the original notice (or their agent).</Ol>
          </ol>
          <p>If we receive a valid counter-notice, we may restore the removed material in 10–14 business days unless the original complainant notifies us that they have filed a court action seeking to restrain the allegedly infringing activity.</p>
        </S>

        <S id="repeat" title="Repeat infringers">
          <p>In accordance with the DMCA and other applicable laws, we have adopted a policy of terminating, in appropriate circumstances and at our sole discretion, users who are deemed to be repeat infringers. We may also limit access to GiftsDates and/or terminate the accounts of any users who infringe intellectual property rights, whether or not there is any repeat infringement.</p>
        </S>

        <S id="onbehalf" title="Notices on your behalf">
          <p>Where you have granted us the right to do so under our Terms of Service, we may (but are not obligated to) submit infringement notices on your behalf to help protect the content you create on GiftsDates. See our <Link to="/terms" className="text-amber-300 hover:underline">Terms of Service</Link> and <Link to="/safety" className="text-amber-300 hover:underline">Safety &amp; Transparency Center</Link> for more.</p>
        </S>

        <S id="contact" title="Questions">
          <p>For any questions about this policy, contact us at <a href="mailto:help@GiftsDates.com" className="text-amber-300 hover:underline">help@GiftsDates.com</a>.</p>
        </S>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500">© {new Date().getFullYear()} GiftsDates · Luxury Dating. · <Link to="/terms" className="hover:text-amber-300">Terms of Service</Link> · <Link to="/privacy" className="hover:text-amber-300">Privacy Policy</Link></div>
      </div>
    </div>
  );
}
