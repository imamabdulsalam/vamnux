import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Archive, ArrowRight, CheckCircle2, CircleDollarSign, CreditCard, PackageOpen, PauseCircle, Plus, ShieldCheck, WalletCards } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type ManualCatalogForm = {
  name: string;
  category: "gift_card" | "subscription" | "software" | "ai_tool" | "game_key";
  description: string;
  catalogSourceId: string;
  basePrice: string;
  regionLabel: string;
  deliveryEstimate: string;
  deliveryType: "digital_code" | "activation_link" | "manual_processing" | "account_access";
  recipientEmailRequired: boolean;
  status: "draft" | "active" | "paused";
};

const initialManualCatalogForm: ManualCatalogForm = {
  name: "",
  category: "gift_card",
  description: "",
  catalogSourceId: "",
  basePrice: "",
  regionLabel: "",
  deliveryEstimate: "",
  deliveryType: "digital_code",
  recipientEmailRequired: false,
  status: "draft",
};

type CatalogSourceForm = {
  displayName: string;
  sourceType: "supplier" | "direct_agreement";
  commerceIntegrationId: string;
  agreementReference: string;
};

const initialCatalogSourceForm: CatalogSourceForm = {
  displayName: "",
  sourceType: "direct_agreement",
  commerceIntegrationId: "",
  agreementReference: "",
};

function PricingManager() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.admin.getMarketplacePricingSettings.useQuery();
  const catalogQuery = trpc.admin.listCatalogPricing.useQuery();
  const [defaultMarkup, setDefaultMarkup] = useState("25");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [percentageOverride, setPercentageOverride] = useState("");
  const [fixedPriceOverride, setFixedPriceOverride] = useState("");
  const selectedProduct = useMemo(() => (catalogQuery.data ?? []).find((product) => product.id === Number(selectedProductId)), [catalogQuery.data, selectedProductId]);

  useEffect(() => {
    if (settingsQuery.data) setDefaultMarkup(String(settingsQuery.data.defaultMarkupPercent));
  }, [settingsQuery.data]);
  useEffect(() => {
    if (!selectedProduct) return;
    setPercentageOverride(selectedProduct.markupPercentOverride === null ? "" : String(selectedProduct.markupPercentOverride));
    setFixedPriceOverride(selectedProduct.displayPriceOverride === null ? "" : String(selectedProduct.displayPriceOverride));
  }, [selectedProduct]);

  const refreshPricing = async () => {
    await Promise.all([utils.admin.getMarketplacePricingSettings.invalidate(), utils.admin.listCatalogPricing.invalidate(), utils.marketplace.catalog.invalidate()]);
  };
  const saveDefaultMarkup = trpc.admin.updateMarketplacePricingSettings.useMutation({
    onSuccess: async (settings) => { toast.success(`Default display markup set to ${settings.defaultMarkupPercent}%.`); await refreshPricing(); },
    onError: (pricingError) => toast.error(pricingError.message || "Could not update the default markup."),
  });
  const saveProductOverride = trpc.admin.updateCatalogProductPricing.useMutation({
    onSuccess: async () => { toast.success("Product display-price rule updated."); await refreshPricing(); },
    onError: (pricingError) => toast.error(pricingError.message || "Could not update the product price rule."),
  });
  const submitDefaultMarkup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const markup = Number(defaultMarkup);
    if (!Number.isFinite(markup) || markup < -100 || markup > 500) { toast.error("Enter a markup between -100% and 500%."); return; }
    saveDefaultMarkup.mutate({ defaultMarkupPercent: markup });
  };
  const submitProductOverride = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct) { toast.error("Select a catalog product first."); return; }
    const percentage = percentageOverride.trim() ? Number(percentageOverride) : null;
    const fixedPrice = fixedPriceOverride.trim() ? Number(fixedPriceOverride) : null;
    if (percentage !== null && fixedPrice !== null) { toast.error("Use a percentage override or a fixed customer price, not both."); return; }
    if (percentage !== null && (!Number.isFinite(percentage) || percentage < -100 || percentage > 500)) { toast.error("Enter a percentage between -100% and 500%."); return; }
    if (fixedPrice !== null && (!Number.isFinite(fixedPrice) || fixedPrice < 0)) { toast.error("Enter a non-negative fixed customer price."); return; }
    saveProductOverride.mutate({ productId: selectedProduct.id, markupPercentOverride: percentage, displayPriceOverride: fixedPrice });
  };

  return <section className="mt-7 overflow-hidden rounded-xl border border-[#f4a11a]/45 bg-white shadow-sm">
    <div className="border-b border-amber-100 bg-amber-50 px-6 py-5"><p className="text-xs font-bold tracking-[.13em] text-amber-700">PRICING CONTROL</p><h2 className="mt-2 font-['Barlow_Condensed'] text-3xl font-bold uppercase">Customer price rules</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">Supplier base cost stays intact. VAMNUX calculates the customer-facing USD price using the default markup unless you set one product-specific percentage or one fixed display price. Price controls do not send supplier orders or activate payments.</p></div>
    <div className="grid gap-0 lg:grid-cols-[.9fr_1.1fr]">
      <form onSubmit={submitDefaultMarkup} className="space-y-4 border-b border-slate-200 p-6 lg:border-b-0 lg:border-r"><div className="flex items-center gap-3"><span className="rounded-lg bg-[#10121a] p-2 text-[#b8ff43]"><CircleDollarSign size={21} /></span><div><p className="text-xs font-bold tracking-[.1em] text-slate-500">STORE-WIDE DEFAULT</p><h3 className="font-['Barlow_Condensed'] text-2xl font-bold uppercase">Markup policy</h3></div></div><label className="block text-xs font-bold uppercase tracking-[.1em] text-slate-500">Customer markup percentage<input inputMode="decimal" value={defaultMarkup} onChange={(event) => setDefaultMarkup(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-lg font-bold text-[#10121a] outline-none focus:border-[#286dff]" /><span className="mt-2 block normal-case font-normal tracking-normal text-slate-500">Current default: {settingsQuery.data ? `${settingsQuery.data.defaultMarkupPercent}%` : "Loading…"}. A 25% markup turns a $10.00 supplier cost into a $12.50 VAMNUX display price.</span></label><button type="submit" disabled={saveDefaultMarkup.isPending || settingsQuery.isLoading} className="rounded-full bg-[#10121a] px-5 py-3 text-xs font-extrabold uppercase tracking-[.1em] text-white transition hover:bg-[#286dff] disabled:opacity-60">{saveDefaultMarkup.isPending ? "Saving…" : "Save default markup"}</button></form>
      <form onSubmit={submitProductOverride} className="space-y-4 p-6"><div><p className="text-xs font-bold tracking-[.1em] text-[#286dff]">PRODUCT EXCEPTION</p><h3 className="mt-1 font-['Barlow_Condensed'] text-2xl font-bold uppercase">Override one listing</h3></div><label className="block text-xs font-bold uppercase tracking-[.1em] text-slate-500">Catalog product<select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#10121a] outline-none focus:border-[#286dff]"><option value="">Select a live or draft product</option>{(catalogQuery.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.name} · {product.status}</option>)}</select></label>{selectedProduct && <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>{selectedProduct.name}</strong><p className="mt-1">Supplier base cost: <b>${selectedProduct.supplierBasePrice.toFixed(2)}</b> · Current customer price: <b>${selectedProduct.customerPrice.toFixed(2)}</b> · {selectedProduct.priceRule}</p></div>}<div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold uppercase tracking-[.1em] text-slate-500">Percentage override<input inputMode="decimal" value={percentageOverride} onChange={(event) => { setPercentageOverride(event.target.value); if (event.target.value) setFixedPriceOverride(""); }} placeholder="e.g. 30" className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#10121a] outline-none focus:border-[#286dff]" /></label><label className="block text-xs font-bold uppercase tracking-[.1em] text-slate-500">Fixed customer price<input inputMode="decimal" value={fixedPriceOverride} onChange={(event) => { setFixedPriceOverride(event.target.value); if (event.target.value) setPercentageOverride(""); }} placeholder="e.g. 12.99" className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#10121a] outline-none focus:border-[#286dff]" /></label></div><p className="text-xs leading-5 text-slate-500">Leave both blank to return this product to the store-wide markup. Only one override can be active at a time.</p><button type="submit" disabled={!selectedProduct || saveProductOverride.isPending} className="rounded-full bg-[#286dff] px-5 py-3 text-xs font-extrabold uppercase tracking-[.1em] text-white transition hover:bg-[#10121a] disabled:opacity-60">{saveProductOverride.isPending ? "Saving…" : "Save product rule"}</button></form>
    </div>
  </section>;
}

function ManualCatalogManager() {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<ManualCatalogForm>(initialManualCatalogForm);
  const [sourceForm, setSourceForm] = useState<CatalogSourceForm>(initialCatalogSourceForm);
  const catalogQuery = trpc.admin.listAdminManagedCatalog.useQuery();
  const sourceQuery = trpc.admin.listAuthorizedCatalogSources.useQuery();
  const integrationQuery = trpc.admin.listCommerceIntegrations.useQuery();
  const activeSources = (sourceQuery.data ?? []).filter((source) => source.status === "active");
  const readySupplierIntegrations = (integrationQuery.data ?? []).filter((integration) => integration.integrationType === "supplier" && integration.syncStatus === "ready");
  const createSource = trpc.admin.createAuthorizedCatalogSource.useMutation({
    onSuccess: async (source) => {
      toast.success(`${source.displayName} is available as an authorised source.`);
      setSourceForm(initialCatalogSourceForm);
      setForm((current) => ({ ...current, catalogSourceId: String(source.id) }));
      await utils.admin.listAuthorizedCatalogSources.invalidate();
    },
    onError: (sourceError) => toast.error(sourceError.message || "Could not save the authorised source."),
  });
  const createProduct = trpc.admin.createAdminManagedCatalogProduct.useMutation({
    onSuccess: async (product) => {
      toast.success(`${product.name} saved as ${product.status}.`);
      setForm((current) => ({ ...initialManualCatalogForm, catalogSourceId: current.catalogSourceId }));
      await Promise.all([utils.admin.listAdminManagedCatalog.invalidate(), utils.marketplace.catalog.invalidate()]);
    },
    onError: (catalogError) => toast.error(catalogError.message || "Could not save the authorised catalog item."),
  });
  const updateStatus = trpc.admin.setAdminManagedCatalogProductStatus.useMutation({
    onSuccess: async (product) => {
      toast.success(`${product.name} is now ${product.status.replaceAll("_", " ")}.`);
      await Promise.all([utils.admin.listAdminManagedCatalog.invalidate(), utils.marketplace.catalog.invalidate()]);
    },
    onError: (catalogError) => toast.error(catalogError.message || "Could not update the catalog item."),
  });

  const submitProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const basePrice = Number(form.basePrice);
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      toast.error("Enter a valid positive USD catalogue price.");
      return;
    }
    const catalogSourceId = Number(form.catalogSourceId);
    if (!Number.isInteger(catalogSourceId) || catalogSourceId <= 0) {
      toast.error("Create or select an active authorised source before saving this item.");
      return;
    }
    createProduct.mutate({
      ...form,
      catalogSourceId,
      basePrice,
      regionLabel: form.regionLabel || undefined,
    });
  };

  const submitSource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const commerceIntegrationId = Number(sourceForm.commerceIntegrationId);
    if (sourceForm.sourceType === "supplier" && (!Number.isInteger(commerceIntegrationId) || commerceIntegrationId <= 0)) {
      toast.error("Select a ready configured supplier integration.");
      return;
    }
    createSource.mutate({
      displayName: sourceForm.displayName || "Configured supplier",
      sourceType: sourceForm.sourceType,
      agreementReference: sourceForm.agreementReference,
      commerceIntegrationId: sourceForm.sourceType === "supplier" ? commerceIntegrationId : undefined,
    });
  };

  const retryCatalogQueries = () => {
    void Promise.all([catalogQuery.refetch(), sourceQuery.refetch(), integrationQuery.refetch()]);
  };

  return (
    <section className="mt-7 overflow-hidden rounded-xl border border-[#286dff]/30 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-[#f7f9ff] px-6 py-5"><p className="text-xs font-bold tracking-[.13em] text-[#286dff]">AUTHORISED CATALOG MANAGEMENT</p><h2 className="mt-2 font-['Barlow_Condensed'] text-3xl font-bold uppercase">Add verified digital inventory</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Create only products covered by an approved supplier or direct commercial agreement. Every item is linked to an active source record and stays in draft unless you deliberately set it live. This tool never creates a supplier order, payment, wallet credit, or delivery record.</p></div>
      {(catalogQuery.error || sourceQuery.error || integrationQuery.error) && <div role="alert" className="m-6 flex flex-col justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center"><span>Admin catalog data could not be loaded. No inventory status has been inferred from this error.</span><button type="button" onClick={retryCatalogQueries} className="shrink-0 rounded-full border border-rose-300 px-3 py-1.5 text-xs font-bold uppercase tracking-[.08em] transition hover:bg-white">Retry</button></div>}
      <form onSubmit={submitSource} className="m-6 grid gap-3 rounded-xl border border-[#b8ff43]/80 bg-[#10121a] p-4 text-white lg:grid-cols-[1.3fr_.85fr_1fr_auto] lg:items-end"><div className="lg:col-span-4"><p className="text-xs font-bold tracking-[.13em] text-[#b8ff43]">STEP 1 · AUTHORISED SOURCE</p><p className="mt-1 text-sm text-slate-300">Record a direct agreement or attach a ready configured supplier before adding any product. Store a reference only—never credentials.</p></div><label className="text-xs font-bold uppercase tracking-[.08em] text-slate-300">{sourceForm.sourceType === "supplier" ? "Configured supplier" : "Agreement name"}{sourceForm.sourceType === "supplier" ? <select required value={sourceForm.commerceIntegrationId} onChange={(event) => setSourceForm({ ...sourceForm, commerceIntegrationId: event.target.value })} disabled={integrationQuery.isLoading || readySupplierIntegrations.length === 0} className="mt-2 h-10 w-full rounded-lg border border-white/15 bg-white px-3 text-sm text-[#10121a] outline-none focus:border-[#b8ff43] disabled:bg-slate-200"><option value="">{integrationQuery.isLoading ? "Loading suppliers…" : readySupplierIntegrations.length === 0 ? "No ready supplier integrations" : "Select configured supplier"}</option>{readySupplierIntegrations.map((integration) => <option key={integration.id} value={integration.id}>{integration.providerName}</option>)}</select> : <input required value={sourceForm.displayName} onChange={(event) => setSourceForm({ ...sourceForm, displayName: event.target.value })} placeholder="Approved commercial agreement" className="mt-2 h-10 w-full rounded-lg border border-white/15 bg-white px-3 text-sm text-[#10121a] outline-none focus:border-[#b8ff43]" />}</label><label className="text-xs font-bold uppercase tracking-[.08em] text-slate-300">Type<select value={sourceForm.sourceType} onChange={(event) => setSourceForm({ ...sourceForm, sourceType: event.target.value as CatalogSourceForm["sourceType"], commerceIntegrationId: "" })} className="mt-2 h-10 w-full rounded-lg border border-white/15 bg-white px-3 text-sm text-[#10121a] outline-none focus:border-[#b8ff43]"><option value="direct_agreement">Direct agreement</option><option value="supplier">Configured supplier</option></select></label><label className="text-xs font-bold uppercase tracking-[.08em] text-slate-300">Agreement reference<input required value={sourceForm.agreementReference} onChange={(event) => setSourceForm({ ...sourceForm, agreementReference: event.target.value })} placeholder="Agreement, ticket, or ID" className="mt-2 h-10 w-full rounded-lg border border-white/15 bg-white px-3 text-sm text-[#10121a] outline-none focus:border-[#b8ff43]" /></label><button type="submit" disabled={createSource.isPending || (sourceForm.sourceType === "supplier" && readySupplierIntegrations.length === 0)} className="h-10 rounded-full bg-[#b8ff43] px-4 text-xs font-extrabold uppercase tracking-[.08em] text-[#10121a] transition hover:bg-white disabled:opacity-60">{createSource.isPending ? "Saving…" : "Add source"}</button></form>
      <div className="grid gap-0 lg:grid-cols-[1.05fr_.95fr]">
        <form onSubmit={submitProduct} className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold uppercase tracking-[.1em] text-slate-500">Product name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Steam Wallet 50 USD" className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#10121a] outline-none transition focus:border-[#286dff] focus:ring-2 focus:ring-[#286dff]/15" /></label><label className="block text-xs font-bold uppercase tracking-[.1em] text-slate-500">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ManualCatalogForm["category"] })} className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#10121a] outline-none focus:border-[#286dff]"><option value="gift_card">Gift card</option><option value="subscription">Subscription</option><option value="software">Software</option><option value="ai_tool">AI tool</option><option value="game_key">Game key</option></select></label></div>
          <label className="block text-xs font-bold uppercase tracking-[.1em] text-slate-500">Customer-facing description<textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="State the verified product, denomination or plan, region, and delivery terms without unsupported promises." className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-[#10121a] outline-none transition focus:border-[#286dff] focus:ring-2 focus:ring-[#286dff]/15" /></label>
          <label className="block text-xs font-bold uppercase tracking-[.1em] text-slate-500">Authorised source<select required value={form.catalogSourceId} onChange={(event) => setForm({ ...form, catalogSourceId: event.target.value })} disabled={sourceQuery.isLoading || activeSources.length === 0} className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#10121a] outline-none disabled:bg-slate-100"><option value="">{sourceQuery.isLoading ? "Loading sources…" : activeSources.length === 0 ? "Add an active source above" : "Select an active source"}</option>{activeSources.map((source) => <option key={source.id} value={source.id}>{source.displayName} · {source.sourceType.replaceAll("_", " ")}</option>)}</select><span className="mt-1 block normal-case font-normal tracking-normal text-slate-500">Only an active source can be attached to a new listing.</span></label>
          <div className="grid gap-4 sm:grid-cols-3"><label className="block text-xs font-bold uppercase tracking-[.1em] text-slate-500">USD price<input required inputMode="decimal" value={form.basePrice} onChange={(event) => setForm({ ...form, basePrice: event.target.value })} placeholder="0.00" className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#10121a] outline-none transition focus:border-[#286dff] focus:ring-2 focus:ring-[#286dff]/15" /></label><label className="block text-xs font-bold uppercase tracking-[.1em] text-slate-500">Region <span className="normal-case tracking-normal">(optional)</span><input value={form.regionLabel} onChange={(event) => setForm({ ...form, regionLabel: event.target.value })} placeholder="Global / country" className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#10121a] outline-none transition focus:border-[#286dff] focus:ring-2 focus:ring-[#286dff]/15" /></label><label className="block text-xs font-bold uppercase tracking-[.1em] text-slate-500">Delivery<select value={form.deliveryType} onChange={(event) => setForm({ ...form, deliveryType: event.target.value as ManualCatalogForm["deliveryType"] })} className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#10121a] outline-none focus:border-[#286dff]"><option value="digital_code">Digital code</option><option value="activation_link">Activation link</option><option value="manual_processing">Manual processing</option><option value="account_access">Account access</option></select></label></div><label className="block text-xs font-bold uppercase tracking-[.1em] text-slate-500">Estimated delivery time<input required value={form.deliveryEstimate} onChange={(event) => setForm({ ...form, deliveryEstimate: event.target.value })} maxLength={160} placeholder="Example: Usually delivered within 24 hours after details are verified." className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#10121a] outline-none transition focus:border-[#286dff] focus:ring-2 focus:ring-[#286dff]/15" /><span className="mt-1 block normal-case font-normal tracking-normal text-slate-500">State a realistic estimate; do not promise unverified fulfilment.</span></label>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" checked={form.recipientEmailRequired} onChange={(event) => setForm({ ...form, recipientEmailRequired: event.target.checked })} className="h-4 w-4 accent-[#286dff]" />Require a recipient email at draft order</label><label className="flex items-center gap-2 text-sm text-slate-700">Initial state<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ManualCatalogForm["status"] })} className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"><option value="draft">Draft</option><option value="active">Live</option><option value="paused">Paused</option></select></label></div>
          <button type="submit" disabled={createProduct.isPending || activeSources.length === 0} className="inline-flex items-center gap-2 rounded-full bg-[#286dff] px-5 py-3 text-xs font-extrabold uppercase tracking-[.1em] text-white transition hover:bg-[#10121a] disabled:cursor-not-allowed disabled:opacity-60"><Plus size={15} />{createProduct.isPending ? "Saving catalog item…" : "Save authorised item"}</button>
        </form>
        <div className="border-t border-slate-200 bg-[#10121a] p-6 text-white lg:border-l lg:border-t-0"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[.13em] text-[#b8ff43]">MANAGED INVENTORY</p><h3 className="mt-2 font-['Barlow_Condensed'] text-2xl font-bold uppercase">Current entries</h3></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">{catalogQuery.data?.length ?? 0} items</span></div><div className="mt-5 space-y-3">{catalogQuery.isLoading ? <p className="py-8 text-sm text-slate-400">Loading authorised catalog…</p> : catalogQuery.error ? <div className="rounded-lg border border-rose-300/40 bg-rose-500/10 p-5 text-sm leading-6 text-rose-100"><p>Catalog entries could not be loaded. No empty-state conclusion has been made.</p><button type="button" onClick={() => void catalogQuery.refetch()} className="mt-3 rounded-full border border-rose-200/40 px-3 py-1.5 text-xs font-bold uppercase tracking-[.08em] transition hover:bg-white hover:text-[#10121a]">Retry catalog</button></div> : !catalogQuery.data?.length ? <p className="rounded-lg border border-dashed border-white/20 p-5 text-sm leading-6 text-slate-300">No admin-managed products yet. Add an approved source above, then create a listing and activate it only after reviewing its price, regional terms, and delivery method.</p> : catalogQuery.data.map((product) => <article key={product.id} className="rounded-lg border border-white/10 bg-white/5 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{product.name}</p><p className="mt-1 text-xs uppercase tracking-[.08em] text-slate-400">{product.category.replaceAll("_", " ")} · {product.baseCurrency} {Number(product.basePrice).toFixed(2)} · {product.regionLabel || "Region not set"}</p><p className="mt-1 text-xs text-slate-400">Source: {product.sourceName}</p></div><span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#b8ff43]">{product.status}</span></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={updateStatus.isPending || product.status === "active"} onClick={() => updateStatus.mutate({ productId: product.id, status: "active" })} className="inline-flex items-center gap-1 rounded-full border border-[#b8ff43]/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#b8ff43] transition hover:bg-[#b8ff43] hover:text-[#10121a] disabled:opacity-40"><CheckCircle2 size={12} />Live</button><button type="button" disabled={updateStatus.isPending || product.status === "paused"} onClick={() => updateStatus.mutate({ productId: product.id, status: "paused" })} className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-slate-200 transition hover:bg-white hover:text-[#10121a] disabled:opacity-40"><PauseCircle size={12} />Pause</button><button type="button" disabled={updateStatus.isPending || product.status === "archived"} onClick={() => updateStatus.mutate({ productId: product.id, status: "archived" })} className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-rose-200 transition hover:bg-rose-400 hover:text-[#10121a] disabled:opacity-40"><Archive size={12} />Archive</button></div></article>)}</div></div>
      </div>
    </section>
  );
}

function AccountContent() {
  const { data, isLoading, error } = trpc.marketplace.accountSummary.useQuery();
  const { data: currentUser } = trpc.auth.me.useQuery();
  const adminIntegrations = trpc.admin.listCommerceIntegrations.useQuery(undefined, { enabled: currentUser?.role === "admin" });
  const [supplierPage, setSupplierPage] = useState(1);
  const flashTopUpPaused = adminIntegrations.data?.some((integration) => integration.integrationType === "supplier" && integration.providerName === "FlashTopUp" && integration.syncStatus === "paused") ?? false;
  const syncCatalog = trpc.admin.syncFlashTopUpCatalog.useMutation({
    onSuccess: (result) => {
      const failureNote = result.failures.length ? ` ${result.failures.length} product lookup(s) need review.` : "";
      toast.success(`FlashTopUp page ${result.page} synced: ${result.serviceCount} services from ${result.productCount} products.${failureNote}`);
      if (result.nextPage) setSupplierPage(result.nextPage);
    },
    onError: (syncError) => toast.error(syncError.message || "FlashTopUp catalog sync failed."),
  });
  const syncFoxReloadCatalog = trpc.admin.syncFoxReloadCatalog.useMutation({
    onSuccess: (result) => {
      const failureNote = result.failures.length ? ` ${result.failures.length} category lookup(s) need review.` : "";
      toast.success(`FoxReload batch synced: ${result.productCount} products from ${result.categoryCount} categories.${failureNote}`);
    },
    onError: (syncError) => toast.error(syncError.message || "FoxReload catalog sync failed."),
  });
  const syncGamesDropCatalog = trpc.admin.syncGamesDropCatalog.useMutation({
    onSuccess: (result) => {
      const failureNote = result.failures.length ? ` ${result.failures.length} catalog lookup(s) need review.` : "";
      toast.success(`GamesDrop batch synced: ${result.productCount} products from ${result.searches.length} searches.${failureNote}`);
    },
    onError: (syncError) => toast.error(syncError.message || "GamesDrop catalog sync failed."),
  });

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading your VAMNUX account…</div>;
  if (error || !data) return <div className="p-8 text-sm text-destructive">We could not load account information. Please refresh and try again.</div>;

  return (
    <div className="min-h-full bg-[#f5f6f8] p-4 text-[#10121a] md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold tracking-[.16em] text-[#286dff]">VAMNUX / CUSTOMER ACCOUNT</p><h1 className="mt-2 font-['Barlow_Condensed'] text-5xl font-extrabold uppercase tracking-[-.05em]">Your digital hub.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Orders, wallet activity, and delivery records will live here as VAMNUX connects authorised suppliers and payment services.</p></div>
          <Link href="/" className="inline-flex items-center gap-2 self-start border-b border-[#10121a] pb-1 text-xs font-bold uppercase tracking-[.08em] sm:self-auto">Back to marketplace <ArrowRight size={15} /></Link>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl bg-[#10121a] p-6 text-white shadow-lg"><WalletCards className="mb-8 text-[#b8ff43]" size={26} /><p className="text-xs font-bold tracking-[.13em] text-slate-400">VAMNUX WALLET</p><strong className="mt-2 block text-4xl font-bold">{data.wallet.currency} {Number(data.wallet.availableBalance).toFixed(2)}</strong><p className="mt-3 text-xs leading-5 text-slate-300">Status: {data.wallet.status}. Funding and wallet payments are ready to connect to your payment provider.</p></article>
          <article className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><PackageOpen className="mb-8 text-[#286dff]" size={26} /><p className="text-xs font-bold tracking-[.13em] text-slate-500">RECENT ORDERS</p><strong className="mt-2 block text-4xl font-bold">{data.orders.length}</strong><p className="mt-3 text-xs leading-5 text-slate-500">Your paid, processing, and delivered digital purchases will appear here.</p></article>
          <article className="rounded-xl bg-[#b8ff43] p-6 shadow-sm"><ShieldCheck className="mb-8 text-[#10121a]" size={26} /><p className="text-xs font-bold tracking-[.13em] text-[#10121a]">ACCOUNT READINESS</p><strong className="mt-2 block text-2xl font-bold">Secure account active</strong><p className="mt-3 text-xs leading-5 text-slate-700">A protected account session is now available for orders, support, wallet entries, and saved products.</p></article>
        </section>

        <section className="mt-7 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-[.13em] text-[#286dff]">ORDER TRACKING</p><h2 className="mt-2 font-['Barlow_Condensed'] text-3xl font-bold uppercase">Recent activity</h2></div><CreditCard className="text-slate-400" size={24} /></div><div className="mt-6 divide-y divide-slate-100 border-y border-slate-100">{data.orders.length === 0 ? <div className="py-8 text-sm text-slate-500">No orders yet. When checkout is connected to approved products and payments, your delivery status will appear here.</div> : data.orders.map((order) => <div key={order.orderCode} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"><div><strong>{order.orderCode}</strong><p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">{order.status.replaceAll("_", " ")}</span><strong>{order.currency} {Number(order.total).toFixed(2)}</strong></div>)}</div></section>
        {currentUser?.role === "admin" && <><section className="mt-7 grid gap-4 xl:grid-cols-3"><article className="rounded-xl border border-[#b8ff43] bg-[#10121a] p-6 text-white shadow-lg"><p className="text-xs font-bold tracking-[.13em] text-[#b8ff43]">SUPPLIER ADMIN</p><h2 className="mt-2 font-['Barlow_Condensed'] text-3xl font-bold uppercase">FlashTopUp catalog sync</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{flashTopUpPaused ? "Catalog sync is paused by the selected operating policy. This does not change FlashTopUp records already in VAMNUX and does not affect FoxReload or GamesDrop." : "Sync small supplier pages to keep the integration responsive and recoverable. This read-only operation never creates customer orders, funds wallets, or enables payment."}</p><p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-slate-400">{flashTopUpPaused ? "Paused · no supplier request will be sent" : `Next supplier page: ${supplierPage} · 5 products maximum`}</p><button type="button" onClick={() => syncCatalog.mutate({ page: supplierPage, perPage: 5 })} disabled={flashTopUpPaused || syncCatalog.isPending} className="mt-5 inline-flex items-center rounded-full bg-[#b8ff43] px-5 py-3 text-xs font-extrabold uppercase tracking-[.1em] text-[#10121a] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">{flashTopUpPaused ? "FlashTopUp sync paused" : syncCatalog.isPending ? "Syncing supplier page…" : "Sync next supplier page"}</button></article><article className="rounded-xl border border-[#286dff]/60 bg-[#10121a] p-6 text-white shadow-lg"><p className="text-xs font-bold tracking-[.13em] text-[#7aa4ff]">SUPPLIER ADMIN</p><h2 className="mt-2 font-['Barlow_Condensed'] text-3xl font-bold uppercase">FoxReload catalog sync</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Import a bounded, verified supplier batch through the server-only FoxReload API key. It reads selected Gift Card, Subscription, game-key, and Gaming Top-Up results only; test orders are excluded. The current supplier search does not expose active Software or AI Tool records, so those categories remain unavailable. This never calls an order, payment, wallet-credit, or delivery endpoint.</p><p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-slate-400">3 categories + 8 search terms · 10 products per read maximum</p><button type="button" onClick={() => syncFoxReloadCatalog.mutate({ categorySlugs: ["ai-services", "gift-cards", "subscriptions"], categoryLimit: 3, productLimit: 25, searchQueries: ["steam", "netflix", "spotify", "office", "adobe", "chatgpt", "top up", "diamonds"], searchLimit: 10 })} disabled={syncFoxReloadCatalog.isPending} className="mt-5 inline-flex items-center rounded-full bg-[#286dff] px-5 py-3 text-xs font-extrabold uppercase tracking-[.1em] text-white transition hover:bg-white hover:text-[#10121a] disabled:cursor-not-allowed disabled:opacity-60">{syncFoxReloadCatalog.isPending ? "Syncing supplier batch…" : "Sync Digital Catalog"}</button></article><article className="rounded-xl border border-violet-400/60 bg-[#10121a] p-6 text-white shadow-lg"><p className="text-xs font-bold tracking-[.13em] text-violet-300">SUPPLIER ADMIN</p><h2 className="mt-2 font-['Barlow_Condensed'] text-3xl font-bold uppercase">GamesDrop catalog sync</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Read verified Telegram Stars, global Steam keys, PUBG Mobile, and Free Fire offers through the server-only GamesDrop Shop API Token. Each supplier remains isolated; no payment, wallet, order, player validation, or fulfilment endpoint is called.</p><p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-slate-400">4 searches · 50 offers per search maximum · read-only</p><button type="button" onClick={() => syncGamesDropCatalog.mutate({ searches: ["Telegram Stars", "Steam", "PUBG Mobile", "Free Fire"], page: 1, limit: 50, countryCode: "NG" })} disabled={syncGamesDropCatalog.isPending} className="mt-5 inline-flex items-center rounded-full bg-violet-500 px-5 py-3 text-xs font-extrabold uppercase tracking-[.1em] text-white transition hover:bg-white hover:text-[#10121a] disabled:cursor-not-allowed disabled:opacity-60">{syncGamesDropCatalog.isPending ? "Syncing supplier batch…" : "Sync Telegram & Steam"}</button></article></section><PricingManager /><ManualCatalogManager /></>}
      </div>
    </div>
  );
}

export default function Account() {
  return <DashboardLayout><AccountContent /></DashboardLayout>;
}
