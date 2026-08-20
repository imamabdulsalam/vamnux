import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  ClipboardList,
  Database,
  FileClock,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  PackageSearch,
  RefreshCw,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Store,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type AdminTab = "overview" | "pricing" | "suppliers" | "customers" | "orders" | "health" | "audit";
const tabs: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Operations", icon: LayoutDashboard },
  { id: "pricing", label: "Pricing engine", icon: BadgeDollarSign },
  { id: "suppliers", label: "Suppliers", icon: Store },
  { id: "customers", label: "Customers", icon: UsersRound },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "health", label: "System health", icon: Activity },
  { id: "audit", label: "Audit log", icon: FileClock },
];

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount));
}
function label(value: string) { return value.replaceAll("_", " "); }
function statusClass(value: string) { return `admin-status ${value === "operational" || value === "ready" || value === "active" ? "good" : value === "error" || value === "attention" || value === "failed" ? "danger" : "muted"}`; }
function EmptyPanel({ title, detail }: { title: string; detail: string }) { return <div className="admin-empty"><FileText size={22} /><h3>{title}</h3><p>{detail}</p></div>; }

function AdminAccessGate() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  if (loading) return <main className="admin-access-page"><div className="admin-access-mark">V</div><p>Validating secure administrator access…</p></main>;
  if (!user) return <main className="admin-access-page"><div className="admin-access-mark">V</div><span>VAMNUX / SUPER ADMIN</span><h1>Secure operations<br /><em>only.</em></h1><p>Sign in through the configured secure identity flow. Admin authorization is verified on every protected request.</p><button type="button" onClick={() => startLogin()} className="admin-primary-action">Secure sign in <ArrowRight size={15} /></button></main>;
  if (user.role !== "admin") return <main className="admin-access-page"><div className="admin-access-mark danger"><ShieldAlert size={21} /></div><span>VAMNUX / ACCESS RESTRICTED</span><h1>Administrator<br /><em>approval required.</em></h1><p>Your current account does not have Super Admin authorization. No operational data or privileged controls have been loaded.</p><button type="button" onClick={logout} className="admin-secondary-action">Sign out</button><Link href="/" className="admin-return-link">Return to marketplace</Link></main>;
  return <SuperAdminWorkspace adminName={user.name || "VAMNUX owner"} onSignOut={logout} onReturn={() => setLocation("/")} />;
}

function SuperAdminWorkspace({ adminName, onSignOut, onReturn }: { adminName: string; onSignOut: () => void; onReturn: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const overview = trpc.admin.getOverview.useQuery();
  const pricingSettings = trpc.admin.getMarketplacePricingSettings.useQuery();
  const catalogPricing = trpc.admin.listCatalogPricing.useQuery();
  const integrations = trpc.admin.listCommerceIntegrations.useQuery();
  const customers = trpc.admin.listCustomers.useQuery();
  const orders = trpc.admin.listOrders.useQuery();
  const health = trpc.admin.getSystemHealth.useQuery();
  const auditEvents = trpc.admin.listAuditEvents.useQuery();
  const utils = trpc.useUtils();
  const [defaultMarkup, setDefaultMarkup] = useState("25");
  const [productId, setProductId] = useState("");
  const [percentageOverride, setPercentageOverride] = useState("");
  const [fixedPriceOverride, setFixedPriceOverride] = useState("");
  const selectedProduct = useMemo(() => (catalogPricing.data ?? []).find((product) => product.id === Number(productId)), [catalogPricing.data, productId]);
  useEffect(() => { if (pricingSettings.data) setDefaultMarkup(String(pricingSettings.data.defaultMarkupPercent)); }, [pricingSettings.data]);
  useEffect(() => {
    if (!selectedProduct) return;
    setPercentageOverride(selectedProduct.markupPercentOverride === null ? "" : String(selectedProduct.markupPercentOverride));
    setFixedPriceOverride(selectedProduct.displayPriceOverride === null ? "" : String(selectedProduct.displayPriceOverride));
  }, [selectedProduct]);
  const refreshAdminData = async () => {
    await Promise.all([utils.admin.getOverview.invalidate(), utils.admin.listAuditEvents.invalidate(), utils.admin.getMarketplacePricingSettings.invalidate(), utils.admin.listCatalogPricing.invalidate(), utils.marketplace.catalog.invalidate()]);
  };
  const updateDefaultMarkup = trpc.admin.updateMarketplacePricingSettings.useMutation({ onSuccess: async () => { toast.success("Global VAMNUX markup updated and audit logged."); await refreshAdminData(); }, onError: (error) => toast.error(error.message || "Could not update global markup.") });
  const updateProductPricing = trpc.admin.updateCatalogProductPricing.useMutation({ onSuccess: async () => { toast.success("Product price rule updated and audit logged."); await refreshAdminData(); }, onError: (error) => toast.error(error.message || "Could not update product pricing.") });
  const syncFlashTopUp = trpc.admin.syncFlashTopUpCatalog.useMutation({ onSuccess: async (result) => { toast.success(`FlashTopUp page ${result.page} synced read-only.`); await refreshAdminData(); }, onError: (error) => toast.error(error.message || "FlashTopUp sync did not run.") });
  const syncFoxReload = trpc.admin.syncFoxReloadCatalog.useMutation({ onSuccess: async (result) => { toast.success(`FoxReload synced ${result.productCount} catalog records read-only.`); await refreshAdminData(); }, onError: (error) => toast.error(error.message || "FoxReload sync did not run.") });
  const syncGamesDrop = trpc.admin.syncGamesDropCatalog.useMutation({ onSuccess: async (result) => { toast.success(`GamesDrop synced ${result.productCount} catalog records read-only.`); await refreshAdminData(); }, onError: (error) => toast.error(error.message || "GamesDrop sync did not run.") });
  const submitDefaultMarkup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const value = Number(defaultMarkup);
    if (!Number.isFinite(value) || value < -100 || value > 500) { toast.error("Enter a markup between -100% and 500%."); return; }
    if (!window.confirm(`Confirm changing the VAMNUX global customer markup to ${value}%. This will update visible customer prices across the active catalog.`)) return;
    updateDefaultMarkup.mutate({ defaultMarkupPercent: value });
  };
  const submitProductPricing = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selectedProduct) return;
    const percentage = percentageOverride.trim() ? Number(percentageOverride) : null;
    const fixed = fixedPriceOverride.trim() ? Number(fixedPriceOverride) : null;
    if (percentage !== null && fixed !== null) { toast.error("Use either a markup percentage or fixed customer price."); return; }
    if (percentage !== null && (!Number.isFinite(percentage) || percentage < -100 || percentage > 500)) { toast.error("Enter a percentage between -100% and 500%."); return; }
    if (fixed !== null && (!Number.isFinite(fixed) || fixed < 0)) { toast.error("Enter a non-negative fixed customer price."); return; }
    if (!window.confirm(`Confirm changing the customer price rule for ${selectedProduct.name}. This action is audit logged.`)) return;
    updateProductPricing.mutate({ productId: selectedProduct.id, markupPercentOverride: percentage, displayPriceOverride: fixed });
  };
  const supplierRows = (integrations.data ?? []).filter((integration) => integration.integrationType === "supplier");
  const renderOverview = () => <><section className="admin-hero"><div><span>VAMNUX / SUPER ADMIN</span><h1>Run the<br /><em>exchange.</em></h1><p>Real marketplace operations, with financial and fulfilment actions intentionally held inactive.</p></div><div className="admin-hero-note"><ShieldCheck size={22} /><strong>Owner-only workspace</strong><p>Each privileged API request checks the admin role server-side.</p></div></section><section className="admin-metric-grid"><article><PackageSearch size={21} /><span>ACTIVE CATALOG</span><strong>{overview.data?.metrics.activeProducts ?? "—"}</strong><small>{overview.data?.metrics.totalProducts ?? "—"} total · {overview.data?.metrics.pausedProducts ?? "—"} paused</small></article><article><UsersRound size={21} /><span>CUSTOMERS</span><strong>{overview.data?.metrics.customers ?? "—"}</strong><small>Real authenticated customer accounts</small></article><article><ClipboardList size={21} /><span>ORDERS</span><strong>{overview.data?.metrics.orders ?? "—"}</strong><small>Payments and fulfilment are inactive</small></article><article><WalletCards size={21} /><span>WALLET ENTRIES</span><strong>{overview.data?.metrics.walletEntries ?? "—"}</strong><small>No simulated wallet movements</small></article></section><section className="admin-two-column"><section className="admin-panel"><header><div><span>SUPPLIER CONNECTORS</span><h2>Catalog readiness</h2></div><Store size={20} /></header><div className="admin-list">{(overview.data?.suppliers ?? []).map((supplier) => <article key={supplier.id}><div><strong>{supplier.providerName}</strong><p>{supplier.lastSyncAt ? `Last recorded sync: ${new Date(supplier.lastSyncAt).toLocaleString()}` : "No completed catalog sync recorded."}</p></div><span className={statusClass(supplier.syncStatus)}>{supplier.syncStatus}</span></article>)}</div></section><section className="admin-panel"><header><div><span>RECENT PRIVILEGED ACTIVITY</span><h2>Audit trail</h2></div><FileClock size={20} /></header>{overview.data?.recentAudit.length ? <div className="admin-list">{overview.data.recentAudit.map((event) => <article key={event.id}><div><strong>{event.summary}</strong><p>{event.adminName || "Administrator"} · {new Date(event.createdAt).toLocaleString()}</p></div><span className="admin-status muted">{event.action}</span></article>)}</div> : <EmptyPanel title="No audit events yet" detail="The first approved pricing, catalog-status, or supplier catalog-sync action will be recorded here." />}</section></section></>;
  const renderPricing = () => <section className="admin-panel admin-pricing"><header><div><span>PRICING ENGINE</span><h2>Customer price rules</h2><p>Supplier base cost remains unchanged. Customer display prices recalculate from VAMNUX rules only.</p></div><BadgeDollarSign size={21} /></header><div className="admin-pricing-grid"><form onSubmit={submitDefaultMarkup}><p className="admin-form-kicker">GLOBAL DEFAULT</p><h3>VAMNUX markup</h3><label>Customer markup percentage<input value={defaultMarkup} inputMode="decimal" onChange={(event) => setDefaultMarkup(event.target.value)} /></label><p>Current configured default: <strong>{pricingSettings.data ? `${pricingSettings.data.defaultMarkupPercent}%` : "Loading…"}</strong>. Confirmation and audit logging are required before a change is saved.</p><button type="submit" disabled={updateDefaultMarkup.isPending} className="admin-primary-action">{updateDefaultMarkup.isPending ? "Saving…" : "Confirm global markup"} <ArrowRight size={14} /></button></form><form onSubmit={submitProductPricing}><p className="admin-form-kicker">PRODUCT EXCEPTION</p><h3>Override one product</h3><label>Catalog product<select value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Select a product</option>{(catalogPricing.data ?? []).map((product) => <option value={product.id} key={product.id}>{product.name} · {product.status}</option>)}</select></label>{selectedProduct && <div className="admin-product-preview"><strong>{selectedProduct.name}</strong><p>Supplier base: {money(selectedProduct.supplierBasePrice, "USD")} · Customer price: {money(selectedProduct.customerPrice, "USD")}</p><small>{selectedProduct.priceRule}</small></div>}<div className="admin-form-split"><label>Markup override<input value={percentageOverride} inputMode="decimal" placeholder="e.g. 30" onChange={(event) => { setPercentageOverride(event.target.value); if (event.target.value) setFixedPriceOverride(""); }} /></label><label>Fixed price<input value={fixedPriceOverride} inputMode="decimal" placeholder="e.g. 12.99" onChange={(event) => { setFixedPriceOverride(event.target.value); if (event.target.value) setPercentageOverride(""); }} /></label></div><button type="submit" disabled={!selectedProduct || updateProductPricing.isPending} className="admin-secondary-action">{updateProductPricing.isPending ? "Saving…" : "Confirm product rule"} <ArrowRight size={14} /></button></form></div></section>;
  const renderSuppliers = () => <section className="admin-panel"><header><div><span>SUPPLIERS & API STATUS</span><h2>Read-only catalog operations</h2><p>Credentials stay server-side. The controls below never send supplier orders, check balances, credit wallets, or fulfil purchases.</p></div><Store size={21} /></header><div className="admin-supplier-grid">{supplierRows.map((supplier) => { const paused = supplier.syncStatus === "paused"; const isFlash = supplier.providerName === "FlashTopUp"; const isFox = supplier.providerName === "FoxReload"; const isGames = supplier.providerName === "GamesDrop"; const pending = syncFlashTopUp.isPending || syncFoxReload.isPending || syncGamesDrop.isPending; return <article key={supplier.id}><div className="admin-supplier-head"><div><span className="admin-form-kicker">SUPPLIER CONNECTOR</span><h3>{supplier.providerName}</h3></div><span className={statusClass(supplier.syncStatus)}>{supplier.syncStatus}</span></div><p>{supplier.lastError ? `Last recorded error: ${supplier.lastError}` : supplier.lastSyncAt ? `Last recorded sync: ${new Date(supplier.lastSyncAt).toLocaleString()}` : "No completed catalog sync recorded."}</p><button type="button" disabled={pending || paused} onClick={() => { if (!window.confirm(`Confirm a bounded read-only ${supplier.providerName} catalog sync. No order, wallet, payment, or fulfilment endpoint will be called.`)) return; if (isFlash) syncFlashTopUp.mutate({ page: 1, perPage: 5 }); if (isFox) syncFoxReload.mutate({ categorySlugs: ["gift-cards", "subscriptions"], categoryLimit: 2, productLimit: 25, searchQueries: ["Telegram Stars", "Steam Wallet"], searchLimit: 10 }); if (isGames) syncGamesDrop.mutate({ searches: ["Telegram Stars", "Steam", "PUBG Mobile", "Free Fire"], page: 1, limit: 50, countryCode: "NG" }); }} className="admin-secondary-action">{paused ? "Sync paused" : pending ? "Syncing…" : "Run read-only sync"} <RefreshCw size={14} /></button></article>; })}</div></section>;
  const renderCustomers = () => <section className="admin-panel"><header><div><span>CUSTOMERS</span><h2>Authenticated accounts</h2><p>Authorized operational view. Do not use this workspace to collect or store passwords, cards, or supplier credentials.</p></div><UsersRound size={21} /></header>{!customers.data?.length ? <EmptyPanel title="No customer records" detail="No customer records are available for this authorized view." /> : <div className="admin-table-wrap"><table><thead><tr><th>Customer</th><th>Role</th><th>Preferences</th><th>Joined</th><th>Last sign-in</th></tr></thead><tbody>{customers.data.map((customer) => <tr key={customer.id}><td><strong>{customer.name || "Unnamed account"}</strong><small>{customer.email || "Email not supplied"}</small></td><td><span className="admin-status muted">{customer.role}</span></td><td>{customer.preferredCurrency || "USD"}{customer.countryCode ? ` · ${customer.countryCode}` : ""}</td><td>{new Date(customer.createdAt).toLocaleDateString()}</td><td>{new Date(customer.lastSignedIn).toLocaleString()}</td></tr>)}</tbody></table></div>}</section>;
  const renderOrders = () => <section className="admin-panel"><header><div><span>ORDERS</span><h2>Order control room</h2><p>Read-only while payments, wallet funding, supplier ordering, and fulfilment are inactive.</p></div><ClipboardList size={21} /></header>{!orders.data?.length ? <EmptyPanel title="No orders recorded" detail="The marketplace has no real order records yet. This panel intentionally does not show sample sales or delivery statuses." /> : <div className="admin-table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Payment</th><th>Supplier</th><th>Total</th></tr></thead><tbody>{orders.data.map((order) => <tr key={order.orderCode}><td><strong>{order.orderCode}</strong><small>{new Date(order.createdAt).toLocaleString()}</small></td><td>{order.customerName || "Customer"}<small>{order.customerEmail || ""}</small></td><td><span className={statusClass(order.status)}>{label(order.status)}</span></td><td><span className="admin-status muted">{label(order.paymentStatus)}</span></td><td><span className="admin-status muted">{label(order.supplierStatus)}</span></td><td>{money(order.total, order.currency)}</td></tr>)}</tbody></table></div>}</section>;
  const renderHealth = () => <section className="admin-panel"><header><div><span>SYSTEM HEALTH</span><h2>Operational readiness</h2><p>Status is based on VAMNUX configuration and recorded connector states; no synthetic uptime claims are shown.</p></div><Activity size={21} /></header>{health.data && <div className="admin-health-grid">{[health.data.database, health.data.payments, health.data.walletFunding, health.data.supplierOrdering].map((item, index) => <article key={index}><span className={statusClass(item.status)}>{item.status}</span><h3>{["Database", "Payments", "Wallet funding", "Supplier ordering"][index]}</h3><p>{item.detail}</p></article>)}{health.data.suppliers.map((supplier) => <article key={supplier.providerName}><span className={statusClass(supplier.status)}>{supplier.status}</span><h3>{supplier.providerName}</h3><p>{supplier.detail}</p></article>)}</div>}</section>;
  const renderAudit = () => <section className="admin-panel"><header><div><span>APPEND-ONLY AUDIT LOG</span><h2>Privileged activity</h2><p>Records current approved pricing, manual catalog status, and read-only catalog-sync actions. It never stores supplier or payment secrets.</p></div><FileClock size={21} /></header>{!auditEvents.data?.length ? <EmptyPanel title="No audit events recorded" detail="A real approved Super Admin action will be recorded here automatically." /> : <div className="admin-audit-list">{auditEvents.data.map((event) => <article key={event.id}><div className="admin-audit-symbol"><FileClock size={16} /></div><div><strong>{event.summary}</strong><p>{event.adminName || "Administrator"} · {event.action} · {new Date(event.createdAt).toLocaleString()}</p></div><span>{event.targetType} / {event.targetId}</span></article>)}</div>}</section>;
  const content = activeTab === "pricing" ? renderPricing() : activeTab === "suppliers" ? renderSuppliers() : activeTab === "customers" ? renderCustomers() : activeTab === "orders" ? renderOrders() : activeTab === "health" ? renderHealth() : activeTab === "audit" ? renderAudit() : renderOverview();
  return <div className="super-admin"><header className="admin-topbar"><button type="button" className="admin-brand" onClick={onReturn}><span>V</span>VAM<em>NUX</em><small>SUPER ADMIN</small></button><div><span><LockKeyhole size={13} /> Owner access</span><button type="button" onClick={onSignOut}>Sign out <LogOut size={14} /></button></div></header><div className="admin-shell"><aside className="admin-sidebar"><div className="admin-owner"><span>{adminName.charAt(0).toUpperCase()}</span><div><strong>{adminName}</strong><small>Super Admin</small></div></div><nav>{tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}><Icon size={17} />{tab.label}</button>; })}</nav><div className="admin-policy-note"><ShieldCheck size={15} /><span>Payments, wallet funding, refunds, supplier orders, and automatic sync stay inactive.</span></div></aside><main>{content}</main></div></div>;
}

export default function SuperAdmin() { return <AdminAccessGate />; }
