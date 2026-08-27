import { BadgeDollarSign, CheckCircle2, Loader2, Save, ShieldCheck } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import "./adminPricingEngine.css";

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AdminPricingEngine() {
  const utils = trpc.useUtils();
  const targetsQuery = trpc.admin.listSimplePricingTargets.useQuery(undefined, { refetchOnWindowFocus: true });
  const settingsQuery = trpc.admin.getMarketplacePricingSettings.useQuery(undefined, { refetchOnWindowFocus: true });
  const [scope, setScope] = useState<"global" | "category" | "product" | "supplier">("global");
  const [category, setCategory] = useState("");
  const [productId, setProductId] = useState("");
  const [supplierKey, setSupplierKey] = useState("");
  const [markupPercent, setMarkupPercent] = useState("25");
  const [notice, setNotice] = useState<string | null>(null);
  const targets = targetsQuery.data;
  const currentTarget = useMemo(() => scope === "global" ? "All products" : scope === "category" ? category ? label(category) : "Choose a category" : scope === "supplier" ? supplierKey || "Choose a supplier" : targets?.products.find((product) => product.id === Number(productId))?.name || "Choose a product", [scope, category, supplierKey, productId, targets?.products]);
  const persistedMarkup = useMemo(() => {
    if (scope === "global") return settingsQuery.data?.defaultMarkupPercent ?? targets?.globalMarkupPercent ?? null;
    const matchingProducts = (targets?.products ?? []).filter((product) => scope === "product" ? product.id === Number(productId) : scope === "category" ? product.category === category : product.supplierKey === supplierKey);
    const markups = Array.from(new Set(matchingProducts.map((product) => product.markupPercentOverride ?? (settingsQuery.data?.defaultMarkupPercent ?? targets?.globalMarkupPercent)).filter((value): value is number => value !== null && value !== undefined)));
    return markups.length === 1 ? markups[0] : null;
  }, [scope, category, productId, supplierKey, targets?.products, targets?.globalMarkupPercent, settingsQuery.data?.defaultMarkupPercent]);
  const refresh = async () => await Promise.all([utils.admin.listSimplePricingTargets.invalidate(), utils.admin.getMarketplacePricingSettings.invalidate(), utils.admin.listCatalogPricing.invalidate(), utils.marketplace.catalog.invalidate()]);
  const updateMarkup = trpc.admin.updateScopedMarketplaceMarkup.useMutation({ onSuccess: async (result) => { const count = "productCount" in result ? result.productCount : "all products"; setNotice(`${markupPercent}% markup is now active for ${count}. Website prices refresh from the server immediately.`); window.localStorage.setItem("vamnux-pricing-updated", String(Date.now())); await refresh(); }, onError: (error) => setNotice(error.message) });
  const submit = (event: FormEvent) => { event.preventDefault(); const markup = Number(markupPercent); if (!Number.isFinite(markup)) return setNotice("Enter a valid markup percentage."); updateMarkup.mutate({ scope, category: scope === "category" ? category as any : null, productId: scope === "product" && productId ? Number(productId) : null, supplierKey: scope === "supplier" ? supplierKey || null : null, markupPercent: markup }); };

  return <section className="pricing-engine simple-pricing-engine" aria-label="Pricing and Markup Engine">
    <header className="pricing-engine-header"><div><span>VAMNUX PRICING ENGINE</span><h2>Simple markup settings</h2><p>Choose where your markup applies, select the target, and set one percentage.</p></div><BadgeDollarSign size={24} /></header>
    <section className="pricing-engine-boundary"><ShieldCheck size={18} /><div><strong>Customer prices only</strong><p>These settings update VAMNUX customer display prices. Supplier costs, wallets, orders, and historical records remain unchanged.</p></div></section>
    {notice && <div className="pricing-engine-notice"><CheckCircle2 size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice(null)}>Dismiss</button></div>}
    {targetsQuery.isLoading ? <div className="pricing-loading"><Loader2 className="spin" size={19} /> Loading markup settings…</div> : <div className="simple-pricing-layout"><form className="pricing-rule-form simple-pricing-form" onSubmit={submit}><div className="pricing-section-heading"><div><span>MARKUP SETTING</span><h3>Set your percentage</h3></div></div><label>Apply markup to<select value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}><option value="global">All products</option><option value="category">A category</option><option value="product">A specific product</option><option value="supplier">A supplier</option></select></label>{scope === "category" && <label>Choose category<select required value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Choose category</option>{targets?.categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>}{scope === "supplier" && <label>Choose supplier<select required value={supplierKey} onChange={(event) => setSupplierKey(event.target.value)}><option value="">Choose supplier</option>{targets?.suppliers.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>}{scope === "product" && <label>Choose product<select required value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Choose product</option>{targets?.products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<label>Markup percentage<input required type="number" min="-100" max="500" step="0.01" value={markupPercent} onChange={(event) => setMarkupPercent(event.target.value)} placeholder="e.g. 25" /></label><button type="submit" className="admin-primary-action" disabled={updateMarkup.isPending}><Save size={15} /> {updateMarkup.isPending ? "Updating…" : "Save markup setting"}</button></form><aside className="simple-pricing-current"><span>CURRENT MARKUP</span><strong>{persistedMarkup === null ? "Mixed" : `${persistedMarkup}%`}</strong><h3>{currentTarget}</h3><p>{persistedMarkup === null ? "This selection currently has different product markups. Saving one percentage will make it consistent." : "This is the saved customer-price markup for the selected target."} Website prices refresh from the server as soon as the setting is saved.</p></aside></div>}
  </section>;
}
