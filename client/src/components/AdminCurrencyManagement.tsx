import { CheckCircle2, Coins, Loader2, Save, ShieldCheck } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import "./adminCurrencyManagement.css";

type CurrentRate = { baseCurrency: string; quoteCurrency: string; effectiveRate: number; effectiveAt: Date; active: boolean };

/** Super Admin-only USD-to-NGN setting used for wallet-funding and future payment quotations. */
export function AdminCurrencyManagement() {
  const utils = trpc.useUtils();
  const currencyQuery = trpc.admin.getCurrencyManagement.useQuery(undefined, { refetchOnWindowFocus: true });
  const [draftRate, setDraftRate] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const currentRate = useMemo(() => ((currencyQuery.data?.currentRates ?? []) as CurrentRate[]).find((item) => item.baseCurrency === "USD" && item.quoteCurrency === "NGN" && item.active) ?? null, [currencyQuery.data?.currentRates]);
  const saveRate = trpc.admin.saveCurrencyRateVersion.useMutation({
    onSuccess: async (result) => {
      setDraftRate(String(result.effectiveRate));
      setNotice(`USD 1 now equals NGN ${result.effectiveRate.toLocaleString()}. Wallet-funding and payment quotations refresh from this active rate.`);
      await Promise.all([utils.admin.getCurrencyManagement.invalidate(), utils.admin.listExchangeRates.invalidate(), utils.marketplace.accountSummary.invalidate()]);
    },
    onError: (error) => setNotice(error.message),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveRate.mutate({ baseCurrency: "USD", quoteCurrency: "NGN", rate: Number(draftRate), bufferPercent: 0, source: "manual", sourceLabel: null, rateUpdateFrequency: "manual", effectiveAt: new Date(), active: true, reason: null });
  };

  return <section className="currency-management simple-exchange-management" aria-label="Exchange Rate">
    <header className="currency-management-header"><div><span>EXCHANGE RATE</span><h2>Set your USD to NGN rate</h2><p>This is the NGN amount VAMNUX uses when it quotes USD wallet funding and future payment methods.</p></div><Coins size={24} /></header>
    <section className="currency-boundary"><ShieldCheck size={18} /><div><strong>Simple and protected</strong><p>Saving a rate updates the current wallet-funding quotation only. It does not change products, supplier costs, wallet balances, orders, or historical records.</p></div></section>
    {notice && <div className="currency-notice"><CheckCircle2 size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice(null)}>Dismiss</button></div>}
    {currencyQuery.isLoading ? <div className="currency-loading"><Loader2 className="spin" size={18} /> Loading current rate…</div> : <div className="simple-exchange-grid">
      <form className="currency-rate-form simple-exchange-form" onSubmit={submit}>
        <div className="currency-section-heading"><div><span>CHANGE RATE</span><h3>USD to NGN</h3><p>Enter how many Nigerian Naira a customer pays for one US Dollar.</p></div><Save size={19} /></div>
        <label>Current USD to NGN rate<input required type="number" min="1" step="1" inputMode="numeric" value={draftRate} onChange={(event) => setDraftRate(event.target.value)} placeholder={currentRate ? String(Math.round(currentRate.effectiveRate)) : "e.g. 1550"} /></label>
        <button type="submit" className="admin-primary-action" disabled={saveRate.isPending}><Save size={15} /> {saveRate.isPending ? "Saving rate…" : "Save current rate"}</button>
      </form>
      <aside className="simple-exchange-current"><span>CURRENT RATE</span><strong>{currentRate ? `USD 1 = NGN ${currentRate.effectiveRate.toLocaleString()}` : "No current USD to NGN rate"}</strong><p>{currentRate ? `Active since ${new Date(currentRate.effectiveAt).toLocaleString()}.` : "Save the first rate to enable NGN wallet-funding quotations."}</p><small>Changing this setting updates new quotations immediately. It never changes an existing order or payment.</small></aside>
    </div>}
  </section>;
}
