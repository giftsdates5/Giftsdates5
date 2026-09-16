import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Ban } from "lucide-react";

const S = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24" data-testid={`use-section-${id}`}>
    <h2 className="font-serif-luxe text-2xl gold-text mb-3 mt-10">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
  </section>
);
const Li = ({ children }) => <li className="ml-5 list-disc">{children}</li>;

const Prohibited = ({ title, children }) => (
  <div className="glass rounded-xl p-4 gold-hairline">
    <div className="flex items-start gap-3">
      <Ban className="text-rose-400 shrink-0 mt-0.5" size={18} />
      <div>
        <h3 className="font-semibold text-white text-sm">{title}</h3>
        <p className="mt-1 text-sm text-slate-300 leading-relaxed">{children}</p>
      </div>
    </div>
  </div>
);

export default function TermsOfUse() {
  return (
    <div className="min-h-screen aurora-bg text-white">
      <div className="max-w-3xl mx-auto px-4 py-14" data-testid="use-page">
        <Link to="/" className="text-sm text-slate-400 hover:text-white" data-testid="use-back-link">← Back to GiftsDates</Link>
        <div className="flex items-center gap-3 mt-6 mb-2">
          <div className="w-11 h-11 rounded-xl overflow-hidden gold-hairline bg-[#1A0A14] flex items-center justify-center"><ShieldAlert className="text-amber-300" size={22} /></div>
          <h1 className="font-serif-luxe text-4xl sm:text-5xl gold-text">Terms of Use</h1>
        </div>
        <p className="text-xs text-slate-500 mb-4">Last updated: September 2026</p>
        <p className="text-sm font-semibold text-amber-200">BY USING OUR WEBSITE YOU AGREE TO THIS POLICY – PLEASE READ IT CAREFULLY</p>

        <S id="intro" title="Introduction">
          <p>This sets out what is permitted and what is not permitted on GiftsDates and forms part of your agreement with us. Any breach of this Acceptable Use Policy may result in deactivation of your Content and/or your account.</p>
          <p>By using our platform you agree to make payments (buy gifts, Premium subscription) without claiming coins back. Defined terms in this Policy have the same meanings as in our <Link to="/terms" className="text-amber-300 hover:underline">Terms of Service</Link>.</p>
        </S>

        <S id="coins" title="Coins, top-ups and Spin & Win">
          <p><span className="text-amber-200 font-semibold">Spin &amp; Win!</span> Try your luck — the bonus is credited after you register.</p>
          <p>You can top up your Wallet Coins at any time:</p>
          <ul className="space-y-1">
            <Li>🪙 100 — Small Talk — $9.99</Li>
            <Li>🪙 300 + 20 bonus — Starter — $29.99</Li>
            <Li>🪙 1000 + 100 bonus — Popular Pack — $99.99</Li>
            <Li>🪙 2000 + 150 bonus — Extra Pack — $189</Li>
            <Li>🪙 3000 + 300 bonus — VIP Pack — $295</Li>
            <Li>Or any Custom amount — $1 = 10 🪙 +2% bonus</Li>
          </ul>
          <p>A gift of 100+ coins automatically opens a chat (instant match).</p>
        </S>

        <S id="safety" title="Safety and contact rules">
          <p>For your safety, keep all contact and meeting arrangements on our platform. If you arrange to meet privately off-platform, we can't guarantee your safety and your account may be blocked for violation.</p>
          <ul className="space-y-1">
            <Li>Phone numbers can be shared only after a confirmed date.</Li>
            <Li>Photos in chat unlock only after a confirmed date.</Li>
          </ul>
        </S>

        <S id="withdrawals" title="Withdrawals and commission">
          <p>You can withdraw collected coins after your bank information is approved, with a 30% commission deducted. 10 coins are valued at $1.</p>
        </S>

        <S id="dates" title="Dates, taxi and cancellations">
          <p>You can invite other users for a date and choose the location (paying coins for the date price). After a date is booked, the other side can request a taxi fee.</p>
          <ul className="space-y-1">
            <Li>If you approve the taxi fee, the date is auto-confirmed.</Li>
            <Li>If the inviter cancels, 50% of the booking + taxi coins are refunded and 50% go as compensation to the invited user.</Li>
            <Li>If the invited user cancels, all coins (full amount for taxi and date fee) go back to the inviter.</Li>
          </ul>
        </S>

        <S id="photo" title="Photo proof and releasing coins">
          <p>After the date, the invited person must submit photo proof of the person they met within 24 hours. It is your responsibility to provide photo proof.</p>
          <ul className="space-y-1">
            <Li>If there is no photo proof and the inviter has no complaints within 24 hours of the date, the invited user can request coins without a photo, but only 50%.</Li>
            <Li>During the first 24h after the date starts, the inviter has their window to act (they also can't cancel then). If it's a no-show, contact us — we will contact the other side to confirm, and coins will be returned to you.</Li>
            <Li>The recipient's "Get 50% now" button is disabled: "You can claim 50% only 24 hours after the date starts."</Li>
            <Li>After 24h with no photo, the recipient can claim 50% immediately, and the platform keeps the other 50% (this also happens automatically at the release time if they do nothing).</Li>
            <Li>Confirming with a photo any time after the date still gives the recipient 100%.</Li>
          </ul>
        </S>

        <S id="profile" title="Your profile and pricing">
          <p>You can use your profile page to set your Date price, Video call price and Availability calendar.</p>
        </S>

        <S id="referral" title="Invite a friend">
          <p>Earn 100 🪙 for every friend who buys their first Popular Pack.</p>
        </S>

        <S id="premium" title="Premium subscription">
          <p>With Premium you get:</p>
          <ul className="space-y-1">
            <Li>Unlimited likes</Li>
            <Li>Top placement in search</Li>
            <Li>Advanced search filters</Li>
            <Li>See who liked you</Li>
            <Li>Priority support</Li>
          </ul>
          <p>Your Premium subscription auto-renews every month until you cancel it.</p>
        </S>

        <S id="account" title="Managing your account">
          <p>You also have the option to delete your account from your profile page, or you can contact us at <span className="text-amber-300">help@GiftsDates.com</span>.</p>
        </S>

        <S id="prohibited" title="Prohibited conduct">
          <p>Do not use GiftsDates in any manner that features or facilitates:</p>
          <div className="grid gap-3 mt-2">
            <Prohibited title="Minors and non-onboarded persons">Anyone under the age of 18, or anyone in explicit content who is over the age of 18 and who has not completed our user onboarding process or provided us with a properly completed release form.</Prohibited>
            <Prohibited title="Illegal activity">Actual, claimed, or role-played exploitation, abuse, or harm of individuals under the age of 18; incest; bestiality; necrophilia; rape or sexual assault; and any content or conduct that promotes terrorism.</Prohibited>
            <Prohibited title="Prohibited items">Weapons or controlled substances used in a manner that threatens or may cause harm to yourself or to a third party.</Prohibited>
            <Prohibited title="Hateful conduct">Attacking other people on the basis of race, ethnicity, national origin, caste, sexual orientation, gender, gender identity, religious affiliation, age, disability, or disease.</Prohibited>
            <Prohibited title="Abuse or harassment">Stalking, doxxing, defaming, or the sharing of non-consensual, fake or manipulated intimate images, or otherwise unauthorised images.</Prohibited>
            <Prohibited title="Violence or harm">Prohibited role play, use of objects in any way likely to cause physical or mental harm, lack of express consent, extreme impact, extreme bondage, or suicide.</Prohibited>
            <Prohibited title="Prohibited bodily fluids">Urine or excrement.</Prohibited>
            <Prohibited title="Inaccurate information">Misleading descriptions of media or account information.</Prohibited>
            <Prohibited title="Non-consensual imagery">Any explicit image of another person without their consent, including an artificially generated image.</Prohibited>
            <Prohibited title="Public nudity">Explicit conduct in a place where the general public is present or where other people are reasonably likely to see, including in an avatar or header image.</Prohibited>
            <Prohibited title="Prohibited cyber activity">Spamming, sharing other people's personal data, linking to external media storage sites, referencing an off-platform site that violates our Terms of Service, or behaving in any way that interferes with GiftsDates' software, hardware, or network.</Prohibited>
            <Prohibited title="Copying content">Scraping, downloading, sharing, or gathering information from GiftsDates or any user for any reason.</Prohibited>
            <Prohibited title="Prohibited commercial activity">Selling controlled or regulated items, representing that GiftsDates has endorsed you or your content, or infringing a third-party intellectual property right.</Prohibited>
          </div>
        </S>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500">© {new Date().getFullYear()} GiftsDates · Luxury Dating. All rights reserved. · <Link to="/terms" className="hover:text-amber-300">Terms of Service</Link> · <Link to="/privacy" className="hover:text-amber-300">Privacy Policy</Link></div>
      </div>
    </div>
  );
}
