import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function PaymentSuccess() {
  const [sp] = useSearchParams();
  const [status, setStatus] = useState("polling");
  const { refreshUser, lang } = useApp();
  const nav = useNavigate();

  useEffect(() => {
    const sid = sp.get("session_id"); if (!sid) return;
    let tries = 0;
    const poll = async () => {
      tries++;
      try {
        const { data } = await api.get(`/payments/status/${sid}`);
        if (data.payment_status === "paid") { setStatus("paid"); await refreshUser(); return; }
        if (tries > 20) { setStatus("timeout"); return; }
        setTimeout(poll, 2000);
      } catch { setStatus("error"); }
    };
    poll();
  }, [sp, refreshUser]);

  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="glass rounded-3xl p-10 text-center max-w-md" data-testid="payment-success-box">
        {status === "polling" && (<><Loader2 className="mx-auto animate-spin text-rose-400" size={48}/><h2 className="font-serif-luxe text-2xl mt-4">Verifying payment…</h2></>)}
        {status === "paid" && (<><CheckCircle2 className="mx-auto text-emerald-400" size={56}/><h2 className="font-serif-luxe text-3xl mt-4">{t("payment_success", lang)}</h2></>)}
        {(status === "timeout" || status === "error") && (<><XCircle className="mx-auto text-amber-400" size={56}/><h2 className="font-serif-luxe text-2xl mt-4">Still processing…</h2></>)}
        <Button data-testid="payment-back-wallet" onClick={() => nav("/wallet")} className="rose-btn text-white border-0 mt-6">{t("back_to_wallet", lang)}</Button>
      </div>
    </div>
  );
}

export function PaymentCancel() {
  const { lang } = useApp();
  const nav = useNavigate();
  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="glass rounded-3xl p-10 text-center max-w-md" data-testid="payment-cancel-box">
        <XCircle className="mx-auto text-red-400" size={56}/>
        <h2 className="font-serif-luxe text-3xl mt-4">{t("payment_cancel", lang)}</h2>
        <Button data-testid="payment-back-wallet-cancel" onClick={() => nav("/wallet")} className="rose-btn text-white border-0 mt-6">{t("back_to_wallet", lang)}</Button>
      </div>
    </div>
  );
}
