import { trpc } from "@/lib/trpc";
import { DollarSign, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import "./exchangeRateQuickCards.css";

type QuoteCurrency = "NGN" | "EUR" | "GBP";

const cards: Array<{ quoteCurrency: QuoteCurrency; title: string; description: string; label: string; placeholder: string }> = [
  { quoteCurrency: "NGN", title: "USD → NGN", description: "Manual Naira equivalent for future supported checkout conversion.", label: "Rate (NGN per USD)", placeholder: "e.g. 1600.00" },
  { quoteCurrency: "EUR", title: "USD → EUR", description: "Manual EUR-denominated pricing reference.", label: "Rate (EUR per USD)", placeholder: "e.g. 0.8560" },
  { quoteCurrency: "GBP", title: "USD → GBP", description: "Manual GBP-denominated pricing reference.", label: "Rate (GBP per USD)", placeholder: "e.g. 0.7335" },
];

export function ExchangeRateQuickCards() {
  const rates = trpc.admin.listExchangeRates.useQuery();
  const utils = trpc.useUtils();
  const [drafts, setDrafts] = useState<Record<QuoteCurrency, string>>({ NGN: "", EUR: "", GBP: "" });
  const currentRates = useMemo(() => new Map((rates.data ?? []).filter((rate) => rate.baseCurrency === "USD").map((rate) => [rate.quoteCurrency as QuoteCurrency, rate])), [rates.data]);
  useEffect(() => setDrafts((current) => {
    const next = { ...current };
    cards.forEach((card) => { const stored = currentRates.get(card.quoteCurrency); if (!next[card.quoteCurrency] && stored) next[card.quoteCurrency] = String(stored.rate); });
    return next;
  }), [currentRates]);
  const saveRate = trpc.admin.upsertExchangeRate.useMutation({
    onSuccess: async () => { await utils.admin.listExchangeRates.invalidate(); toast.success("Manual exchange rate saved and audit logged."); },
    onError: (error) => toast.error(error.message || "Could not save this exchange rate."),
  });
  const save = (quoteCurrency: QuoteCurrency) => {
    const rate = Number(drafts[quoteCurrency]);
    if (!Number.isFinite(rate) || rate <= 0) { toast.error("Enter a positive manual rate before saving."); return; }
    saveRate.mutate({ baseCurrency: "USD", quoteCurrency, rate, bufferPercent: currentRates.get(quoteCurrency)?.bufferPercent ?? 0, active: true });
  };
  return <section className="admin-panel admin-exchange-quick-cards">
    <header><div><span>QUICK RATE CARDS</span><h2>USD rate references</h2><p>These cards save the same protected manual exchange-rate records shown above. A saved pair does not automatically change storefront pricing or activate a payment provider.</p></div></header>
    <div className="admin-exchange-quick-card-list">{cards.map((card) => {
      const current = currentRates.get(card.quoteCurrency);
      return <article key={card.quoteCurrency}><div className="admin-exchange-card-heading"><div><span><DollarSign size={14} /> {card.title}</span><p>{card.description}</p></div><small>Current: {current ? Number(current.rate).toFixed(4) : "Not set"}</small></div><label>{card.label}<div><input aria-label={card.label} inputMode="decimal" value={drafts[card.quoteCurrency]} placeholder={card.placeholder} onChange={(event) => setDrafts((currentDrafts) => ({ ...currentDrafts, [card.quoteCurrency]: event.target.value }))} /><button type="button" className="admin-primary-action" disabled={saveRate.isPending} onClick={() => save(card.quoteCurrency)}>{saveRate.isPending ? "Saving…" : "Save"} <Save size={14} /></button></div></label><p className="admin-exchange-card-note">Stored owner-only rate; no automatic payment, wallet credit, or display conversion occurs from this action.</p></article>;
    })}</div>
  </section>;
}
