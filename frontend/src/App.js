import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider, useApp } from "@/context/AppContext";
import Nav from "@/components/Nav";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Browse from "@/pages/Browse";
import Matches from "@/pages/Matches";
import Chats from "@/pages/Chats";
import Dates from "@/pages/Dates";
import InviteDates from "@/pages/InviteDates";
import SpinPage from "@/pages/SpinPage";
import Wallet from "@/pages/Wallet";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import ProfileView from "@/pages/ProfileView";
import Verify from "@/pages/Verify";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import About from "@/pages/About";
import TermsOfUse from "@/pages/TermsOfUse";
import Help from "@/pages/Help";
import FAQ from "@/pages/FAQ";
import Cookies from "@/pages/Cookies";
import Safety from "@/pages/Safety";
import DMCA from "@/pages/DMCA";
import AntiTrafficking from "@/pages/AntiTrafficking";
import Complaints from "@/pages/Complaints";
import Appeals from "@/pages/Appeals";
import Fraud from "@/pages/Fraud";
import { PaymentSuccess, PaymentCancel } from "@/pages/PaymentResult";
import SupportChat from "@/components/SupportChat";

const Private = ({ children }) => {
  const { user, loading } = useApp();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

const Shell = () => (
  <>
    <Nav />
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/browse" element={<Private><Browse /></Private>} />
      <Route path="/matches" element={<Private><Matches /></Private>} />
      <Route path="/chats" element={<Private><Chats /></Private>} />
      <Route path="/dates" element={<Private><InviteDates /></Private>} />
      <Route path="/spin" element={<Private><SpinPage /></Private>} />
      <Route path="/wallet" element={<Private><Wallet /></Private>} />
      <Route path="/profile" element={<Private><Profile /></Private>} />
      <Route path="/profile/:id" element={<Private><ProfileView /></Private>} />
      <Route path="/verify" element={<Private><Verify /></Private>} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/about" element={<About />} />
      <Route path="/terms-of-use" element={<TermsOfUse />} />
      <Route path="/help" element={<Help />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/cookies" element={<Cookies />} />
      <Route path="/safety" element={<Safety />} />
      <Route path="/dmca" element={<DMCA />} />
      <Route path="/anti-trafficking" element={<AntiTrafficking />} />
      <Route path="/complaints" element={<Complaints />} />
      <Route path="/appeals" element={<Appeals />} />
      <Route path="/fraud-prevention" element={<Fraud />} />
      <Route path="/admin" element={<Private><Admin /></Private>} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <SupportChat />
  </>
);

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppProvider>
          <Shell />
          <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: "#161320", border: "1px solid rgba(225,29,72,0.3)", color: "#fff" } }}/>
        </AppProvider>
      </BrowserRouter>
    </div>
  );
}
