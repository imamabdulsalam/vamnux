import { trpc } from "@/lib/trpc";
import { Activity, BarChart3, Clock3, Eye, EyeOff, Filter, Pause, Play, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type SupplierKey = "flashtopup" | "foxreload" | "gamesdrop";
type IntervalHours = 2 | 10 | 24;

const intervalOptions: IntervalHours[] = [2, 10, 24];

function elapsed(from: Date | string | null | undefined) {
  if (!from) return "Awaiting an observed recovery";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60_000));
  if (minutes < 1) return "Available now";
  if (minutes < 60) return `Available for ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  return `Available for ${hours} hour${hours === 1 ? "" : "s"}`;
}

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Unclassified";
}

export function AdminProductTracking() {
  const utils = trpc.useUtils();
  const dashboard = trpc.admin.getProductTrackingDashboard.useQuery(undefined, { refetchInterval: 30_000 });
  const [intervalDrafts, setIntervalDrafts] = useState<Record<SupplierKey, IntervalHours>>({ flashtopup: 2, foxreload: 10, gamesdrop: 24 });
  const [outOfStockQuery, setOutOfStockQuery] = useState("");
  const [outOfStockCategory, setOutOfStockCategory] = useState("all");
  const refresh = async () => {
    await utils.admin.getProductTrackingDashboard.invalidate();
  };
  const manualSync = trpc.admin.runProductTrackingManualSync.useMutation({
    onSuccess: async (result) => {
      toast.success(`${result.supplierName} tracking sync finished: ${result.outOfStockProducts} currently out of stock; ${result.newlySyncedProducts} new product record(s) in this run.`);
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const visibility = trpc.admin.setProductTrackingStorefrontVisibility.useMutation({
    onSuccess: async (result) => {
      toast.success(result.storefrontStatus === "hidden" ? "Product hidden from the customer catalog." : "Product restored to the customer catalog.");
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const saveSchedule = trpc.admin.saveProductTrackingSchedule.useMutation({
    onSuccess: async () => { toast.success("Schedule interval saved. Publish this version, then activate it here to start recurring supplier checks."); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const activateSchedule = trpc.admin.activateProductTrackingSchedule.useMutation({
    onSuccess: async () => { toast.success("Automatic Product Tracking is active for this supplier."); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const toggleSchedule = trpc.admin.setProductTrackingScheduleEnabled.useMutation({
    onSuccess: async (result) => { toast.success(result.status === "active" ? "Automatic supplier tracking resumed." : "Automatic supplier tracking paused."); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const isBusy = manualSync.isPending || visibility.isPending || saveSchedule.isPending || activateSchedule.isPending || toggleSchedule.isPending;

  if (dashboard.isLoading) return <div className="admin-empty"><RefreshCw className="animate-spin" size={22} /><h3>Loading Product Tracking</h3><p>Reading protected supplier availability and storefront visibility records.</p></div>;
  if (dashboard.error || !dashboard.data) return <div className="admin-empty"><Activity size={22} /><h3>Product Tracking is unavailable</h3><p>{dashboard.error?.message || "The protected Product Tracking data could not be loaded."}</p></div>;
  const outOfStockCategories = Array.from(new Set(dashboard.data.outOfStock.map((product) => product.category))).sort();
  const visibleOutOfStock = dashboard.data.outOfStock.filter((product) => {
    const query = outOfStockQuery.trim().toLocaleLowerCase();
    const matchesQuery = !query || `${product.name} ${product.supplierName} ${product.category} ${product.subcategory}`.toLocaleLowerCase().includes(query);
    return matchesQuery && (outOfStockCategory === "all" || product.category === outOfStockCategory);
  });
  const maxRecentSyncProducts = Math.max(1, ...dashboard.data.recentNewProducts.map((window) => window.products));

  return <section className="admin-section space-y-5" aria-labelledby="product-tracking-title">
    <header className="flex flex-col gap-3 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="admin-form-kicker">SUPPLIER AVAILABILITY & CATALOG CONTROL</p>
        <h2 id="product-tracking-title" className="mt-1 text-2xl font-black text-white">Product Tracking</h2>
        <p className="mt-2 max-w-3xl text-sm text-[#aeb9cd]">Track supplier availability without exposing credentials or changing customer prices. Hide unavailable products, restore verified recoveries, run approved catalog checks, and manage automatic checks per supplier.</p>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-[#b8ff43]/30 bg-[#b8ff43]/10 px-3 py-2 text-xs text-[#dfffa4]"><ShieldCheck size={15} />Supplier order submission remains disabled.</div>
    </header>

    <div className="grid gap-3 xl:grid-cols-3">
      {dashboard.data.suppliers.map((supplier) => {
        const key = supplier.supplierKey as SupplierKey;
        const schedule = supplier.schedule;
        const selected = intervalDrafts[key];
        return <article key={supplier.supplierKey} className="rounded-xl border border-white/10 bg-[#0d111a] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8e9aae]">Supplier</p><h3 className="mt-1 text-lg font-extrabold text-white">{supplier.supplierName}</h3></div><span className={supplier.outOfStockProducts ? "admin-status danger" : "admin-status good"}>{supplier.outOfStockProducts ? `${supplier.outOfStockProducts} unavailable` : "Available"}</span></div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-white/5 p-2"><dt className="text-[#8e9aae]">Tracked products</dt><dd className="mt-1 font-extrabold text-white">{supplier.totalProducts.toLocaleString()}</dd></div><div className="rounded-lg bg-white/5 p-2"><dt className="text-[#8e9aae]">Store status</dt><dd className="mt-1 font-extrabold text-white">{supplier.outOfStockProducts ? "Review needed" : "No stock alert"}</dd></div></dl>
          <button type="button" className="admin-primary-action mt-4 w-full justify-center" disabled={isBusy} onClick={() => manualSync.mutate({ supplierKey: key })}><RefreshCw size={14} className={manualSync.isPending && manualSync.variables?.supplierKey === key ? "animate-spin" : ""} />{manualSync.isPending && manualSync.variables?.supplierKey === key ? "Synchronizing…" : "Sync now"}</button>
          <div className="mt-4 border-t border-white/10 pt-3"><label className="text-[10px] font-black uppercase tracking-[.12em] text-[#8e9aae]">Automatic interval<select className="mt-2 w-full rounded-lg border border-white/15 bg-[#121723] px-3 py-2 text-sm text-white outline-none focus:border-[#b8ff43]" value={selected} onChange={(event) => setIntervalDrafts((current) => ({ ...current, [key]: Number(event.target.value) as IntervalHours }))}>{intervalOptions.map((hours) => <option key={hours} value={hours}>Every {hours} hours</option>)}</select></label>
            <p className="mt-2 text-[11px] text-[#aeb9cd]">{schedule ? `${label(schedule.status)}${schedule.nextRunAt ? ` · next ${new Date(schedule.nextRunAt).toLocaleString()}` : ""}` : "Not configured"}</p>
            {schedule?.lastError && <p className="mt-1 text-[11px] text-[#ffb4b4]">Last issue: {schedule.lastError}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className="admin-secondary-action justify-center" disabled={isBusy} onClick={() => saveSchedule.mutate({ supplierKey: key, intervalHours: selected })}>Save interval</button>{schedule?.status === "active" || schedule?.status === "paused" ? <button type="button" className="admin-primary-action justify-center" disabled={isBusy} onClick={() => toggleSchedule.mutate({ scheduleId: schedule.id, enabled: schedule.status !== "active" })}>{schedule.status === "active" ? <><Pause size={13} />Pause</> : <><Play size={13} />Resume</>}</button> : <button type="button" className="admin-primary-action justify-center" disabled={!schedule || isBusy} onClick={() => schedule && activateSchedule.mutate({ scheduleId: schedule.id })}><Play size={13} />Activate</button>}</div>
          </div>
        </article>;
      })}
    </div>

    <div className="grid gap-5 2xl:grid-cols-2">
      <section className="rounded-xl border border-[#ef7777]/30 bg-[#22161b] p-4"><div className="flex items-center justify-between gap-3"><div><p className="admin-form-kicker text-[#ffb4b4]">OUT OF STOCK</p><h3 className="mt-1 text-lg font-extrabold text-white">Supplier availability alerts</h3></div><span className="admin-status danger">{dashboard.data.outOfStock.length} listed</span></div><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_190px]"><label className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#121723] px-3 py-2 text-[#8e9aae] focus-within:border-[#ff8d8d]"><Search size={15} /><input value={outOfStockQuery} onChange={(event) => setOutOfStockQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#6f7a8e]" placeholder="Search product or supplier" aria-label="Search out-of-stock products" /></label><label className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#121723] px-3 py-2 text-[#8e9aae]"><Filter size={15} /><select value={outOfStockCategory} onChange={(event) => setOutOfStockCategory(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"><option value="all">All categories</option>{outOfStockCategories.map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></label></div><p className="mt-2 text-[11px] text-[#c4cedd]">Showing {visibleOutOfStock.length} of {dashboard.data.outOfStock.length} unavailable supplier products.</p><div className="admin-table-wrap mt-3"><table><thead><tr><th>Product</th><th>Supplier</th><th>Category</th><th>Observed</th><th>Storefront</th></tr></thead><tbody>{visibleOutOfStock.length ? visibleOutOfStock.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>#{product.id}</small></td><td>{product.supplierName}</td><td>{label(product.category)}<small>{label(product.subcategory)}</small></td><td>{product.firstUnavailableAt ? new Date(product.firstUnavailableAt).toLocaleString() : product.observedAt ? new Date(product.observedAt).toLocaleString() : "Pending first observation"}</td><td>{product.storefrontStatus === "hidden" ? <span className="admin-status muted">Hidden</span> : <button type="button" className="admin-secondary-action" disabled={isBusy} onClick={() => visibility.mutate({ productId: product.id, storefrontStatus: "hidden" })}><EyeOff size={13} />Hide</button>}</td></tr>) : <tr><td colSpan={5}>No unavailable product matches this search and category filter.</td></tr>}</tbody></table></div></section>

      <section className="rounded-xl border border-[#b8ff43]/30 bg-[#121c18] p-4"><div className="flex items-center justify-between gap-3"><div><p className="admin-form-kicker text-[#b8ff43]">HIDDEN PRODUCT RECOVERY</p><h3 className="mt-1 text-lg font-extrabold text-white">Restore verified availability</h3></div><span className="admin-status muted">{dashboard.data.hiddenProducts.length} hidden</span></div><div className="admin-table-wrap mt-4"><table><thead><tr><th>Product</th><th>Supplier</th><th>Hidden</th><th>Availability</th><th>Action</th></tr></thead><tbody>{dashboard.data.hiddenProducts.length ? dashboard.data.hiddenProducts.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{label(product.category)} · {label(product.subcategory)}</small></td><td>{product.supplierName}</td><td>{new Date(product.hiddenAt).toLocaleString()}</td><td>{product.recovered ? <span className="inline-flex flex-col gap-1 text-[#b8ff43]"><b>NOW AVAILABLE</b><small>{elapsed(product.availableAgainAt)}</small></span> : <span className="text-[#ffb4b4]">Still unavailable</span>}</td><td>{product.recovered ? <button type="button" className="admin-primary-action" disabled={isBusy} onClick={() => visibility.mutate({ productId: product.id, storefrontStatus: "visible" })}><Eye size={13} />Show live</button> : <span className="text-[11px] text-[#8e9aae]">Keep hidden</span>}</td></tr>) : <tr><td colSpan={5}>No products are currently hidden from the storefront.</td></tr>}</tbody></table></div></section>
    </div>

    <section className="rounded-xl border border-white/10 bg-[#0d111a] p-4"><div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><div><p className="admin-form-kicker">NEWLY SYNCHRONIZED PRODUCTS</p><h3 className="mt-1 text-lg font-extrabold text-white">Real catalog additions by sync window</h3><p className="mt-1 text-xs text-[#aeb9cd]">Counts come from completed Product Tracking runs and preserve the original supplier product records.</p></div><Clock3 size={20} className="text-[#b8ff43]" /></div><div className="mt-4 rounded-xl border border-white/10 bg-[#121723] p-4" aria-label="Newly synchronized products chart"><div className="flex items-center gap-2 text-xs font-bold text-[#d7e0ef]"><BarChart3 size={16} className="text-[#b8ff43]" />Synced product summary</div><div className="mt-4 grid h-44 grid-cols-3 items-end gap-4">{dashboard.data.recentNewProducts.map((window) => { const height = Math.max(window.products ? 14 : 4, Math.round((window.products / maxRecentSyncProducts) * 100)); return <div key={`chart-${window.hours}`} className="flex h-full flex-col justify-end text-center"><strong className="mb-2 text-lg text-white">{window.products.toLocaleString()}</strong><div className="rounded-t-lg bg-gradient-to-t from-[#5e3be1] to-[#b8ff43] transition-[height]" style={{ height: `${height}%` }} title={`${window.products} newly synchronized products`} /><span className="mt-2 text-[11px] font-bold text-[#aeb9cd]">{window.hours === 24 ? "24 hours" : `${window.hours / 24} days`}</span></div>; })}</div></div><div className="mt-4 grid gap-3 lg:grid-cols-3">{dashboard.data.recentNewProducts.map((window) => <article key={window.hours} className="rounded-lg border border-white/10 bg-[#121723] p-3"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#8e9aae]">Last {window.hours === 24 ? "24 hours" : `${window.hours / 24} days`}</p><strong className="mt-1 block text-2xl text-white">{window.products.toLocaleString()}</strong><p className="text-xs text-[#aeb9cd]">new product records</p><div className="mt-3 space-y-2">{Object.entries(window.categories).length ? Object.entries(window.categories).map(([category, detail]) => <div key={category} className="rounded bg-white/5 p-2 text-xs text-[#d7e0ef]"><b>{label(category)}</b> · {detail.productCount}<small className="mt-1 block text-[#8e9aae]">{Object.entries(detail.subcategories).map(([subcategory, count]) => `${label(subcategory)} (${count})`).join(" · ") || "No supported subcategory"}</small></div>) : <p className="text-xs text-[#8e9aae]">No completed Product Tracking run in this window.</p>}</div></article>)}</div></section>

    <section className="rounded-xl border border-white/10 bg-[#0d111a] p-4"><p className="admin-form-kicker">RUN HISTORY</p><div className="admin-table-wrap mt-3"><table><thead><tr><th>Time</th><th>Supplier</th><th>Trigger</th><th>Observed</th><th>Out of stock</th><th>New</th><th>Status</th></tr></thead><tbody>{dashboard.data.runs.slice(0, 30).map((run) => <tr key={run.id}><td>{new Date(run.startedAt).toLocaleString()}</td><td>{run.supplierKey}</td><td>{run.trigger}</td><td>{run.productsObserved}</td><td>{run.outOfStockProducts}</td><td>{run.newlySyncedProducts}</td><td><span className={run.status === "completed" ? "admin-status good" : run.status === "failed" ? "admin-status danger" : "admin-status muted"}>{run.status}</span><small>{run.summary || "—"}</small></td></tr>)}</tbody></table></div></section>
  </section>;
}
