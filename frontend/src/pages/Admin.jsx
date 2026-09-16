import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { api, fileUrl } from "../lib/api";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import AdminPrices from "../components/AdminPrices";
import AdminVerifications from "../components/AdminVerifications";
import AdminSupport from "../components/AdminSupport";

export default function Admin() {
  const { lang } = useApp();
  const [tab, setTab] = useState("payouts");
  const [accounts, setAccounts] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [reports, setReports] = useState([]);
  const [dates, setDates] = useState([]);
  const [err, setErr] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    try {
      const [a, w, r, d] = await Promise.all([api.get("/admin/payout-accounts"), api.get("/admin/withdrawals"), api.get("/admin/reports"), api.get("/admin/dates")]);
      setAccounts(a.data); setWithdrawals(w.data); setReports(r.data); setDates(d.data.dates || []);
    } catch (e) { setErr(e.response?.data?.detail || "Error"); }
  };
  useEffect(() => { load(); }, []);

  const adVerify = async (id, approve) => {
    try { await api.post(`/admin/dates/${id}/verify?approve=${approve}`); toast.success(approve ? "Approved" : "Rejected"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); }
  };
  const adResolve = async (id, action) => {
    try { await api.post(`/admin/dates/${id}/resolve?action=${action}`); toast.success(action); load(); }
    catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); }
  };
  const askResolve = (d, action) => {
    const n = d.total_hold || d.coins || 0;
    const desc = action === "payout_recipient" ? t("ad_payout_desc", lang) : action === "refund_inviter" ? t("ad_refund_desc", lang) : t("ad_split_desc", lang);
    setConfirm({ id: d.id, action, desc: desc.replace("{n}", n) });
  };

  const resolveReport = async (id, block) => {
    try {
      await api.post(`/admin/reports/${id}/${block ? "block" : "resolve"}`);
      toast.success(block ? "User blocked" : "Report resolved");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); }
  };

  const verify = async (uid, approve) => {
    const reason = approve ? "" : (window.prompt(t("reason", lang)) || "");
    try { await api.post(`/admin/payout-accounts/${uid}/verify`, { approve, reason }); toast.success(approve ? t("approve", lang) : t("reject", lang)); load(); }
    catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); }
  };
  const wd = async (id, action) => {
    try { await api.post(`/admin/withdrawals/${id}/${action}`); toast.success(action); load(); }
    catch (e) { toast.error(e.response?.data?.detail || t("failed", lang)); }
  };

  if (err) return <div className="aurora-bg min-h-[calc(100vh-4rem)] flex items-center justify-center text-rose-300" data-testid="admin-forbidden">{err}</div>;

  return (
    <div className="aurora-bg min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <h1 className="font-serif-luxe text-4xl flex items-center gap-3"><ShieldCheck /> {t("admin", lang)}</h1>
        <div className="flex gap-2" data-testid="admin-tabs">
          {["payouts", "verifications", "reports", "dates", "support", "prices"].map(k => (
            <button key={k} data-testid={`admin-tab-${k}`} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm border transition-colors ${tab === k ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>{t(k, lang) === k ? (k === "reports" ? "Reports" : k === "support" ? "Support" : k) : t(k, lang)}</button>
          ))}
        </div>
        {tab === "prices" ? <AdminPrices /> : tab === "verifications" ? <AdminVerifications /> : tab === "support" ? <AdminSupport /> : tab === "reports" ? (
          <div className="glass rounded-2xl p-5" data-testid="admin-reports">
            <h3 className="font-serif-luxe text-xl mb-3">User reports ({reports.length})</h3>
            {reports.length === 0 ? <div className="text-sm text-slate-500 py-4 text-center">—</div> : reports.map(r => (
              <div key={r.id} data-testid={`admin-report-${r.id}`} className="py-3 border-t border-white/5 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[240px]">
                  <div className="text-sm"><span className="text-rose-300 font-semibold">{r.reason_label}</span></div>
                  <div className="text-xs text-slate-400">Reported: <b>{r.target_name}</b> by {r.reporter_name} · {new Date(r.created_at).toLocaleString()}</div>
                  {r.details && <div className="text-xs text-slate-500 mt-1 whitespace-pre-line">"{r.details}"</div>}
                  <div className="text-xs uppercase mt-1 text-slate-500">{r.status}{r.action ? ` · ${r.action}` : ""}</div>
                </div>
                {r.status === "open" && <>
                  <Button data-testid={`admin-report-resolve-${r.id}`} size="sm" onClick={() => resolveReport(r.id, false)} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">Resolve</Button>
                  <Button data-testid={`admin-report-block-${r.id}`} size="sm" variant="outline" onClick={() => resolveReport(r.id, true)} className="bg-rose-500/10 border-rose-500/40 text-rose-300">Block user</Button>
                </>}
              </div>
            ))}
          </div>
        ) : <></>}
        {tab === "dates" && (
          <div className="glass rounded-2xl p-5" data-testid="admin-dates">
            <h3 className="font-serif-luxe text-xl mb-3">{t("ad_dates", lang)} ({dates.length})</h3>
            {dates.length === 0 ? <div className="text-sm text-slate-500 py-4 text-center">{t("ad_no_dates", lang)}</div> : dates.map(d => (
              <div key={d.id} data-testid={`admin-date-${d.id}`} className="py-3 border-t border-white/5 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[260px]">
                  <div className="text-sm"><b>{d.inviter?.name}</b> → <b>{d.recipient?.name}</b> · <span className="uppercase text-rose-300">{t(`ds_${d.status}`, lang) === `ds_${d.status}` ? d.status : t(`ds_${d.status}`, lang)}</span></div>
                  <div className="text-xs text-slate-400">{(d.chosen_idea || {}).name || "—"} · 🪙{d.total_hold || d.coins} · {(d.location || {}).venue || ""}</div>
                  {d.report && <div className="text-xs text-rose-300 mt-1" data-testid={`admin-date-report-${d.id}`}>REPORT: {(d.report.reasons || []).join(", ")} — "{d.report.details}"{d.report.evidence ? ` · evidence: ${d.report.evidence}` : ""}</div>}
                  {d.verification?.photo && <a href={fileUrl(d.verification.photo)} target="_blank" rel="noreferrer" className="text-xs text-emerald-300 underline" data-testid={`admin-date-photo-${d.id}`}>{t("ad_view_photo", lang)} ({d.verification.status})</a>}
                </div>
                {d.verification?.status === "pending" && <>
                  <Button data-testid={`admin-date-approve-${d.id}`} size="sm" onClick={() => adVerify(d.id, true)} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">{t("ad_approve_photo", lang)}</Button>
                  <Button data-testid={`admin-date-reject-${d.id}`} size="sm" variant="outline" onClick={() => adVerify(d.id, false)} className="bg-rose-500/10 border-rose-500/40 text-rose-300">{t("ad_reject", lang)}</Button>
                </>}
                {!["COMPLETED", "COMPLETED_AUTO", "REFUNDED", "CANCELLED", "CANCELLED_TRANSPORTATION"].includes(d.status) && <>
                  <Button data-testid={`admin-date-payout-${d.id}`} size="sm" onClick={() => askResolve(d, "payout_recipient")} variant="outline" className="bg-white/5 border-white/15">{t("ad_payout_recipient", lang)}</Button>
                  <Button data-testid={`admin-date-refund-${d.id}`} size="sm" onClick={() => askResolve(d, "refund_inviter")} variant="outline" className="bg-white/5 border-white/15">{t("ad_refund_inviter", lang)}</Button>
                  <Button data-testid={`admin-date-split-${d.id}`} size="sm" onClick={() => askResolve(d, "split")} variant="outline" className="bg-white/5 border-white/15">{t("ad_split", lang)}</Button>
                </>}
              </div>
            ))}
          </div>
        )}
        {tab === "payouts" && <>

        <div className="glass rounded-2xl p-5" data-testid="admin-payout-accounts">
          <h3 className="font-serif-luxe text-xl mb-3">{t("bank_account", lang)} · {t("status_pending", lang)} ({accounts.length})</h3>
          {accounts.length === 0 ? <div className="text-sm text-slate-500 py-4 text-center">—</div> : accounts.map(a => (
            <div key={a.id} data-testid={`admin-account-${a.user_id}`} className="py-3 border-t border-white/5 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px]">
                <div className="text-sm">{a.user_name} <span className="text-slate-500">· {a.user_email}</span></div>
                <div className="text-xs text-slate-400 font-mono">{a.holder_name} · Tax ID {a.tax_id} · {a.recipient_email}</div>
                <div className="text-xs text-slate-500">{[a.recipient_street, a.recipient_city, a.recipient_province, a.recipient_postal_code, a.country].filter(Boolean).join(", ")}</div>
                <div className="text-xs text-slate-400 font-mono mt-1">{a.bank_name} · {a.iban} · SWIFT {a.swift}{a.routing_number ? ` · RTN ${a.routing_number}` : ""}</div>
                <div className="text-xs text-slate-500">{[a.bank_street, a.bank_city, a.bank_province, a.bank_postal_code, a.bank_country].filter(Boolean).join(", ")}</div>
              </div>
              <Button data-testid={`admin-approve-${a.user_id}`} size="sm" onClick={() => verify(a.user_id, true)} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">{t("approve", lang)}</Button>
              <Button data-testid={`admin-reject-${a.user_id}`} size="sm" variant="outline" onClick={() => verify(a.user_id, false)} className="bg-rose-500/10 border-rose-500/40 text-rose-300">{t("reject", lang)}</Button>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-5" data-testid="admin-withdrawals">
          <h3 className="font-serif-luxe text-xl mb-3">{t("withdraw", lang)} ({withdrawals.length})</h3>
          {withdrawals.length === 0 ? <div className="text-sm text-slate-500 py-4 text-center">—</div> : withdrawals.map(w => (
            <div key={w.id} data-testid={`admin-withdrawal-${w.id}`} className="py-3 border-t border-white/5 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px]">
                <div className="text-sm font-mono-num">🪙 {w.amount} − {t("commission", lang)} {w.fee} = <b className="text-emerald-300">${w.usd}</b></div>
                <div className="text-xs text-slate-400">{w.destination} · {new Date(w.created_at).toLocaleString()} · <span className="uppercase">{w.status}</span></div>
              </div>
              {w.status === "pending" && <>
                <Button data-testid={`admin-withdrawal-paid-${w.id}`} size="sm" onClick={() => wd(w.id, "paid")} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">{t("mark_paid", lang)}</Button>
                <Button data-testid={`admin-withdrawal-reject-${w.id}`} size="sm" variant="outline" onClick={() => wd(w.id, "rejected")} className="bg-rose-500/10 border-rose-500/40 text-rose-300">{t("reject", lang)}</Button>
              </>}
            </div>
          ))}
        </div>
        </>}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="bg-[#161320] border-white/10 text-white" data-testid="admin-date-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ad_confirm_action", lang)}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400" data-testid="admin-date-confirm-desc">{confirm?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="admin-date-confirm-cancel" className="bg-white/5 border-white/15 text-slate-200 hover:bg-white/10">{t("id_cancel", lang)}</AlertDialogCancel>
            <AlertDialogAction data-testid="admin-date-confirm-ok" onClick={() => { const c = confirm; setConfirm(null); if (c) adResolve(c.id, c.action); }} className="rose-btn text-white border-0">{t("ad_confirm", lang)}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
