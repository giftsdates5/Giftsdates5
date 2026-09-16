import React from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

const S = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24" data-testid={`terms-section-${id}`}>
    <h2 className="font-serif-luxe text-2xl gold-text mb-3 mt-10">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
  </section>
);
const Li = ({ children }) => <li className="ml-5 list-disc">{children}</li>;

export default function Terms() {
  return (
    <div className="min-h-screen aurora-bg text-white">
      <div className="max-w-3xl mx-auto px-4 py-14" data-testid="terms-page">
        <Link to="/" className="text-sm text-slate-400 hover:text-white" data-testid="terms-back-link">← Back to GiftsDates</Link>
        <div className="flex items-center gap-3 mt-6 mb-2">
          <div className="w-11 h-11 rounded-xl overflow-hidden gold-hairline bg-[#1A0A14] flex items-center justify-center"><FileText className="text-amber-300" size={22} /></div>
          <h1 className="font-serif-luxe text-4xl sm:text-5xl gold-text">Terms of Service</h1>
        </div>
        <p className="text-xs text-slate-500 mb-4">Last updated: September 2026</p>
        <p className="text-sm font-semibold text-amber-200">BY USING OUR WEBSITE YOU AGREE TO THESE TERMS – PLEASE READ THEM CAREFULLY</p>

        <S id="intro" title="Introduction">
          <p>These Terms of Service govern your use of GiftsDates and your agreement with us. Key points:</p>
          <ul className="space-y-1">
            <Li>We can modify these Terms of Service at any time.</Li>
            <Li>If you purchase a Premium Subscription, it will automatically renew for additional periods of the same duration unless you cancel it.</Li>
            <Li>To contact us with questions, email <span className="text-amber-300">help@GiftsDates.com</span> or use our Contact Form.</Li>
          </ul>
        </S>

        <S id="changes" title="We may change the Terms of Service">
          <p>Where permitted we may change any part of the Terms of Service without notice: to reflect changes in applicable laws and regulations; and/or to address a risk to GiftsDates, to us, to Users, or to relevant third parties.</p>
          <p>We may also make other changes and will notify you so you may delete your account before the changes take effect. Once updated, you will be bound by the effective Terms of Service if you continue to use GiftsDates.</p>
        </S>

        <S id="availability" title="We may change, suspend, or deactivate GiftsDates">
          <p>We may change GiftsDates from time to time for any reason. We do not guarantee that GiftsDates, or its Content, will always be available or accessible without interruption. We may suspend, withdraw, or restrict the availability of any part of GiftsDates.</p>
        </S>

        <S id="registering" title="Registering with GiftsDates">
          <p>By registering with and using GiftsDates, you agree to the Terms of Service. If you do not agree, your sole remedy is to not register or to stop being a GiftsDates User. We may reject an account application for any reason. To use GiftsDates you must register and open an account, providing a valid email address, a username, and a password (or authenticate via an approved third party). Your password must comply with GiftsDates password requirements.</p>
          <p>To register as a User and open an account:</p>
          <ul className="space-y-1">
            <Li>You must be at least 18 years old;</Li>
            <Li>You must be able to be legally bound by a contract with us;</Li>
            <Li>You must be legally permitted to join, view Content, and use any functionality provided by GiftsDates;</Li>
            <Li>You must not have been convicted of committing a serious crime; and</Li>
            <Li>You agree to pay (where required) for dates and video calls in accordance with the Terms of Service.</Li>
          </ul>
          <p>If you do not meet the above requirements, you must not access or use GiftsDates. You may be asked to provide additional information prior to account approval, and you may also need to:</p>
          <ul className="space-y-1">
            <Li>Upload a valid form of ID and two photos of you;</Li>
            <Li>Add a bank account, payment details, or a payment method;</Li>
            <Li>Select a method ("Payout Option") for us to transfer Earnings to you;</Li>
            <Li>If registered for VAT in the UK, provide your UK VAT number;</Li>
            <Li>Submit additional age or identity verification information any time we ask for it;</Li>
            <Li>Set a dates and video calls price;</Li>
            <Li>Add your photos to view; and</Li>
            <Li>Provide any additional information we request, which may vary depending on where you live or your nationality.</Li>
          </ul>
        </S>

        <S id="adult" title="Adult material">
          <p>Some Content on GiftsDates contains adult material, and you acknowledge and agree to this when you access GiftsDates. We are not responsible for any loss or damage you suffer as a result of how or where you view Content.</p>
        </S>

        <S id="content" title="Content – general terms">
          <p>Your Content is not confidential, and you authorise others to access and view your Content on GiftsDates for their own lawful and personal use, and in accordance with any licenses that you grant to your viewers. You are legally responsible for all Content you upload.</p>
          <p>You warrant that, for each item of Content you upload: if it includes third-party material, you have secured all rights, licenses, written consents and releases necessary; and the Content is of satisfactory quality, matches the price and all representations you make, is reasonably suitable for any purpose a viewer has made known to you, and is as described by you.</p>
          <p>You are liable to and will indemnify us if any warranty in this section is untrue, meaning you are responsible for any resulting loss or damage we suffer. We are not responsible for, do not control, and do not endorse any Content. We are not obligated to pre-screen Content but reserve the right to pre-screen, monitor, reuse, or remove Content that violates our Terms of Service.</p>
        </S>

        <S id="payments" title="Subscriptions, purchases and renewals">
          <p>We moderate Content and facilitate User interactions by providing the GiftsDates platform, but we are not a party to the contract between Users.</p>
          <ul className="space-y-1">
            <Li>All prices appear, and are charged, in USD. Payment providers may charge currency-conversion fees.</Li>
            <Li>Payments are exclusive of Indirect Sales Tax, which is added at the current applicable rate.</Li>
            <Li>Before subscribing to Premium you must add payment information and click "Subscribe". It will automatically renew for additional periods of the same duration unless you cancel it.</Li>
            <Li>You authorise and consent to each of these payments being debited using your supplied payment information. If you provide more than one payment method and the first fails, we will use the other.</Li>
          </ul>
          <p>When you select "Get Premium" you agree to start a Subscription that automatically renews at the current rate (plus Indirect Sales Tax). You authorise us to charge you again after each Subscription, unless: (i) your payment is declined and you have not provided another; (ii) the Subscription price has increased; (iii) you switched off "Auto-Renew"; or (iv) you close your account before the new period begins. By selecting "Subscribe," you acknowledge you will not receive further notice regarding renewal.</p>
          <p>If you cancel a Subscription, you can use the relevant period until the end of the period in which you cancelled, after which no further payments are taken and you can no longer view premium features. You agree not to make unjustified refund or chargeback requests; bad-faith requests may lead to suspension or deletion of your account.</p>
          <p>You can prepay an amount ("Wallet Coins") for later payments. Purchases cannot be divided — if a purchase costs more than your remaining Wallet Coins, your card is charged the full amount. Wallet Coins are subject to a maximum, accrue no interest, and are non-refundable.</p>
        </S>

        <S id="payouts" title="Payouts">
          <ul className="space-y-1">
            <Li>All Payments are received and processed by an approved third-party payment provider.</Li>
            <Li>Our Fee is 30% of the total User Payment and is deducted from each Payment.</Li>
            <Li>Earnings are available for withdrawal only when reflected in your account. Coins are held in escrow. Funds unlock 24 hours after the date (once confirmed with photo proof).</Li>
            <Li>To withdraw, your balance must meet the minimum payout amount.</Li>
            <Li>All Payments and Earnings are in USD; your bank or e-wallet may charge conversion or other fees, which we are not responsible for.</Li>
            <Li>If a User successfully obtains a refund or chargeback, we may deduct an amount equal to the corresponding Earnings portion.</Li>
            <Li>Except for direct bank transfer, we do not store the data you disclose when registering Payout Options with a payment provider.</Li>
          </ul>
        </S>

        <S id="tax" title="Tax compliance">
          <p>Users are responsible for their own Tax affairs. Neither we nor any Subsidiary advise you on Tax, are liable for general Tax information provided, or are liable for your non-payment of Tax. By using GiftsDates, you warrant that you have reported and will report all payments received to the relevant Tax authority as required by law.</p>
          <p>If you become Tax non-compliant, or are named in litigation/inquiry/investigation relating to Tax non-compliance connected to GiftsDates, we may close, restrict payouts from, or restrict earnings from your account. UK VAT-registered Users must follow our UK VAT Policy; EU-registered Users must adhere to applicable EU VAT rules. You alone are responsible for making necessary Tax filings and paying Tax due.</p>
        </S>

        <S id="ourrights" title="Our rights and obligations">
          <ul className="space-y-1">
            <Li>We may suspend or remove Content that may breach our Terms of Service and comply with laws requiring prompt removal of illegal Content.</Li>
            <Li>We may review Content using technology tools including classifiers and AI/Machine-Learning-enabled tools.</Li>
            <Li>We are not responsible for any loss you claim from actions we take under these Terms to suspend or remove Content.</Li>
            <Li>We may suspend or delete Content and accounts and will try to notify you. After termination you cannot access your Content, which we handle per our Privacy Policy.</Li>
            <Li>We may review suspected misuse and cooperate with law enforcement, and may disclose information about your use per our Privacy Policy.</Li>
            <Li>We may change third-party payment providers. Other than User-owned/licensed Content, we and/or our licensors own all rights in GiftsDates and its contents.</Li>
            <Li>We are the sole owners of anonymised data relating to your use and may use it for any lawful purpose. We may communicate with you by email and in-account messages.</Li>
          </ul>
        </S>

        <S id="notresponsible" title="What we are not responsible for">
          <p>We use reasonable care and skill in providing GiftsDates, but we are not responsible for, among other things: Content Users post (we do not endorse or guarantee its completeness, legality or accuracy); granting you rights in Content; whether your Content is viewed by people who recognise you; suggestions/reviews Users provide; any promise that Users will generate earnings; device/OS compatibility; internet availability or your hardware/software issues; lost, stolen or compromised accounts, passwords or resulting unauthorised payments/withdrawals; and the circulation of Content recorded in breach of these Terms.</p>
        </S>

        <S id="suspend" title="Suspension, deletion and withholding of Earnings">
          <p>We may suspend or delete your account with 30 days' notice, at any time, for any reason. Without warning and for as long as necessary to review the facts, we may: (i) suspend or delete your account and/or Content; (ii) pause Payments due during the suspension; (iii) withhold any part of your Earnings; and/or (iv) suspend, refund, or cancel other Users' Payments if we think you have or may have seriously or repeatedly breached the Terms, you attempt or threaten to breach them with potentially serious consequences, and/or we suspect Earnings result from unlawful or fraudulent activity.</p>
          <p>If we determine any of the above is true, we may delete your account and/or Content, treat any part of your Earnings as forfeited, and/or refund or cancel Payments. We will notify you with a statement of reasons. If we terminate your account for violating the Terms, Payments — including prepaid Premium Subscription payments — will not be refunded.</p>
          <p>If you do not dispute our decision within six months of notification, you waive the right to dispute it. You may dispute an Earnings forfeiture via our Complaints Policy and an account/Content decision via our Appeals Policy. If a lien, levy, or encumbrance is placed on your Earnings, we may withhold Earnings and suspend or cancel Payments until it is removed. We may use any part of your Earnings to set off harm or loss we suffer from your breach(es).</p>
        </S>

        <S id="ip" title="Intellectual property – ownership and licenses">
          <p>You confirm your Content does not infringe any third-party intellectual property rights and that you own or have obtained all rights necessary to distribute, copy, display, publicly perform, or otherwise use the Content.</p>
          <p>You grant us a license to perform any act related to operating GiftsDates and related products/services, including reproducing, making available or displaying to the public, distributing, creating derivative works, and otherwise using your Content, including to improve features. This license is perpetual, non-exclusive, worldwide, royalty-free, sublicensable, assignable, and transferable by us. Except for mandatory legal provisions, you waive any moral rights to object to treatment of your Content.</p>
          <p>We will never sell your Content to other platforms; however, in a sale of our company or assets, we may transfer any license you granted. You grant us the right (with no obligation) to submit infringement notices on your behalf. Our DMCA Takedown Policy and Complaints Policy describe our infringement procedures.</p>
        </S>

        <S id="deletion" title="Account deletion">
          <p>You may delete your GiftsDates account by contacting us or via Profile → Account. After deletion, you will not have access to your former account or any Content. We will pay all unpaid Earnings and delete the account. A Premium Subscription will be deleted and cannot be renewed.</p>
        </S>

        <S id="disputes" title="Complaints, choice of law and disputes">
          <p>If you have a complaint about GiftsDates, refer to our Complaints Policy and Appeals Policy. To communicate with us about GiftsDates or these Terms of Service, email <span className="text-amber-300">help@GiftsDates.com</span>. These Terms and any dispute are governed by the applicable laws of your place of residence to the extent required, and otherwise by the laws of the jurisdiction in which GiftsDates is established; disputes are subject to the competent courts of that jurisdiction, without prejudice to mandatory consumer protections available to you locally.</p>
        </S>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500">© {new Date().getFullYear()} GiftsDates · Luxury Dating. All rights reserved. · <Link to="/privacy" className="hover:text-amber-300">Privacy Policy</Link></div>
      </div>
    </div>
  );
}
