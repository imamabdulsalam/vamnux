import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  WalletCards,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type DashboardTab = "overview" | "orders" | "saved" | "wallet" | "settings";

const tabs: Array<{ id: DashboardTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ReceiptText },
  { id: "saved", label: "Saved products", icon: Heart },
  { id: "wallet", label: "Wallet", icon: WalletCards },
  { id: "settings", label: "Preferences", icon: Settings2 },
];

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount));
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return <div className="user-empty-state"><div className="user-empty-mark"><Package size={22} /></div><h3>{title}</h3><p>{detail}</p>{action}</div>;
}

function UserDashboardLoading() {
  return <div className="user-dashboard-loading"><div className="user-loader-mark">V</div><p>Loading your VAMNUX space…</p></div>;
}

export default function UserDashboard() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const dashboard = trpc.marketplace.customerDashboard.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();
  const saveProduct = trpc.marketplace.toggleSavedProduct.useMutation({
    onSuccess: async (result) => {
      toast.success(result.saved ? "Product saved to your VAMNUX list." : "Product removed from your saved list.");
      await utils.marketplace.customerDashboard.invalidate();
    },
    onError: (error) => toast.error(error.message || "Could not update your saved products."),
  });
  const savePreferences = trpc.marketplace.updateCustomerPreferences.useMutation({
    onSuccess: async () => {
      toast.success("Your VAMNUX preferences have been saved.");
      await utils.marketplace.customerDashboard.invalidate();
    },
    onError: (error) => toast.error(error.message || "Could not save your preferences."),
  });
  const createWalletFundingRequest = trpc.marketplace.createWalletFundingRequest.useMutation({
    onSuccess: async (request) => {
      toast.success(`Top-up request ${request.fundingCode} submitted for Admin review.`, { description: "No payment has been collected and no wallet balance has been credited." });
      setTopUpAmount("");
      setTopUpNote("");
      await utils.marketplace.customerDashboard.invalidate();
    },
    onError: (error) => toast.error(error.message || "Could not submit the top-up request."),
  });
  const [currency, setCurrency] = useState("USD");
  const [countryCode, setCountryCode] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpNote, setTopUpNote] = useState("");

  useEffect(() => {
    if (!dashboard.data?.profile) return;
    setCurrency(dashboard.data.profile.preferredCurrency || "USD");
    setCountryCode(dashboard.data.profile.countryCode || "");
  }, [dashboard.data?.profile]);

  const orderStats = useMemo(() => {
    const orders = dashboard.data?.orders ?? [];
    return {
      total: orders.length,
      active: orders.filter((order) => ["pending_payment", "paid", "processing"].includes(order.status)).length,
      completed: orders.filter((order) => order.status === "delivered").length,
    };
  }, [dashboard.data?.orders]);

  if (loading) return <UserDashboardLoading />;
  if (!user) {
    return <div className="user-dashboard-loading"><div className="user-loader-mark">V</div><h1>Your VAMNUX account</h1><p>Sign in securely to view your personal orders, saved products, wallet activity, and settings.</p><button type="button" onClick={() => startLogin()} className="user-primary-action">Sign in to continue <ArrowRight size={15} /></button><Link href="/" className="user-text-link">Return to marketplace</Link></div>;
  }
  if (dashboard.isLoading) return <UserDashboardLoading />;
  if (dashboard.error || !dashboard.data) {
    return <div className="user-dashboard-loading"><div className="user-loader-mark">V</div><h1>We could not load your account</h1><p>Your account details have not been changed. Please retry the secure account request.</p><button type="button" onClick={() => void dashboard.refetch()} className="user-primary-action">Retry account loading <ArrowRight size={15} /></button><Link href="/" className="user-text-link">Return to marketplace</Link></div>;
  }

  const data = dashboard.data;
  const submitPreferences = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCountry = countryCode.trim().toUpperCase();
    if (normalizedCountry && !/^[A-Z]{2}$/.test(normalizedCountry)) {
      toast.error("Use a two-letter country code, such as NG, GB, or US.");
      return;
    }
    savePreferences.mutate({ preferredCurrency: currency as "USD" | "EUR" | "GBP" | "NGN", countryCode: normalizedCountry || null });
  };
  const submitTopUpRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(topUpAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) { toast.error("Enter a top-up amount between 0.01 and 1,000,000."); return; }
    createWalletFundingRequest.mutate({ amount, currency: data.wallet.currency as "USD" | "EUR" | "GBP" | "NGN", customerNote: topUpNote.trim() || undefined });
  };

  const renderContent = () => {
    if (activeTab === "orders") return <section className="user-panel"><div className="user-panel-heading"><div><span>ORDER HISTORY</span><h2>Your VAMNUX orders</h2><p>Only orders created from your account are listed here.</p></div><ReceiptText size={23} /></div>{data.orders.length === 0 ? <EmptyState title="No orders yet" detail="When payments and purchase fulfilment are activated, your authentic VAMNUX order history will appear here." action={<Link href="/" className="user-secondary-action">Browse marketplace <ArrowRight size={14} /></Link>} /> : <div className="user-order-table">{data.orders.map((order) => <article key={order.orderCode} className="user-order-row"><div><strong>{order.orderCode}</strong><p>{new Date(order.createdAt).toLocaleString()}</p></div><span className={`user-status user-status-${order.status}`}>{statusLabel(order.status)}</span><div><small>Order total</small><b>{money(order.total, order.currency)}</b></div><ChevronRight size={18} /></article>)}</div>}</section>;
    if (activeTab === "saved") return <section className="user-panel"><div className="user-panel-heading"><div><span>SAVED PRODUCTS</span><h2>Come back to these</h2><p>Save a currently active VAMNUX product to find it here later.</p></div><Heart size={23} /></div>{data.savedProducts.length === 0 ? <EmptyState title="Your saved list is clear" detail="Use the heart action from a product page to keep a real VAMNUX product here." action={<Link href="/" className="user-secondary-action">Explore products <ArrowRight size={14} /></Link>} /> : <div className="user-saved-grid">{data.savedProducts.map((product) => <article key={product.savedId} className="user-saved-card"><div className="user-saved-card-top"><span>{product.category.replaceAll("_", " ")}</span><button type="button" onClick={() => saveProduct.mutate({ productId: product.id })} disabled={saveProduct.isPending} aria-label={`Remove ${product.name} from saved products`}><Heart size={16} fill="currentColor" /></button></div><h3>{product.name}</h3><p>{product.regionLabel || "Supplier region rules"} · {statusLabel(product.deliveryType)}</p><div><strong>{money(product.customerPrice, "USD")}</strong><Link href={`/products/${product.slug}`}>View product <ArrowRight size={14} /></Link></div></article>)}</div>}</section>;
    if (activeTab === "wallet") return <section className="user-panel"><div className="user-panel-heading"><div><span>WALLET ACTIVITY</span><h2>Your account balance</h2><p>Wallet movements are shown only when recorded in your immutable account ledger.</p></div><WalletCards size={23} /></div><div className="user-wallet-feature"><div><p>Available balance</p><strong>{money(data.wallet.availableBalance, data.wallet.currency)}</strong><span className="user-status">{data.wallet.status}</span></div><div><h3>Request a balance top-up</h3><p>Submit a request for Super Admin review. This form does not collect payment details, collect money, or credit your wallet automatically.</p></div></div><form className="user-topup-form" onSubmit={submitTopUpRequest}><div><label>Top-up amount<input inputMode="decimal" value={topUpAmount} onChange={(event) => setTopUpAmount(event.target.value)} placeholder="0.00" /></label><label>Wallet currency<input value={data.wallet.currency} disabled aria-label="Wallet currency" /></label></div><label>Reference note <span>(optional)</span><input value={topUpNote} onChange={(event) => setTopUpNote(event.target.value)} maxLength={500} placeholder="A payment or transfer reference can be provided after payment instructions are confirmed." /></label><p>After you submit, the request remains <strong>pending</strong>. A VAMNUX Super Admin must independently verify and settle it before any real wallet credit is recorded.</p><button type="submit" disabled={createWalletFundingRequest.isPending} className="user-primary-action">{createWalletFundingRequest.isPending ? "Submitting request…" : "Submit top-up request"} <ArrowRight size={15} /></button></form><section className="user-wallet-section"><div className="user-wallet-section-heading"><span>TOP-UP REQUESTS</span><h3>Funding review status</h3></div>{data.fundingRequests.length === 0 ? <EmptyState title="No top-up requests" detail="Your submitted top-up requests will appear here with their actual review status." /> : <div className="user-wallet-list">{data.fundingRequests.map((request) => <article key={request.fundingCode}><div className="user-entry-icon"><WalletCards size={16} /></div><div><strong>{request.fundingCode}</strong><p>Submitted {new Date(request.createdAt).toLocaleString()}{request.settledAt ? ` · Settled ${new Date(request.settledAt).toLocaleString()}` : ""}</p></div><div><b>{money(request.amount, request.currency)}</b><small>{statusLabel(request.status)}</small></div></article>)}</div>}</section><section className="user-wallet-section"><div className="user-wallet-section-heading"><span>IMMUTABLE LEDGER</span><h3>Wallet entries</h3></div>{data.walletEntries.length === 0 ? <EmptyState title="No wallet entries" detail="Your account has no recorded wallet activity. Any future verified credit, debit, purchase, refund, or adjustment will appear with its actual status." /> : <div className="user-wallet-list">{data.walletEntries.map((entry) => <article key={entry.id}><div className={`user-entry-icon ${entry.direction}`}><WalletCards size={16} /></div><div><strong>{statusLabel(entry.entryType)}</strong><p>{entry.reference} · {new Date(entry.createdAt).toLocaleString()}</p></div><div><b className={entry.direction === "credit" ? "credit" : "debit"}>{entry.direction === "credit" ? "+" : "−"}{money(entry.amount, entry.currency)}</b><small>{entry.status}</small></div></article>)}</div>}</section></section>;
    if (activeTab === "settings") return <section className="user-panel"><div className="user-panel-heading"><div><span>ACCOUNT PREFERENCES</span><h2>Personalize your experience</h2><p>These preferences affect your VAMNUX account display only. Your secure sign-in identity is managed by your sign-in provider.</p></div><Settings2 size={23} /></div><div className="user-settings-grid"><article><p className="user-kicker">SECURE IDENTITY</p><h3>{user.name || "VAMNUX customer"}</h3><p>{user.email || "Your sign-in email is not available to the marketplace."}</p><p className="user-muted">Signed in securely through {user.loginMethod || "your configured provider"}.</p></article><form onSubmit={submitPreferences}><label>Preferred display currency<select value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — British Pound</option><option value="NGN">NGN — Nigerian Naira</option></select></label><label>Country code <span>(optional)</span><input value={countryCode} onChange={(event) => setCountryCode(event.target.value)} placeholder="e.g. NG" maxLength={2} /></label><button type="submit" disabled={savePreferences.isPending} className="user-primary-action">{savePreferences.isPending ? "Saving preferences…" : "Save preferences"} <ArrowRight size={15} /></button></form></div></section>;
    return <><section className="user-hero"><div><span>VAMNUX / YOUR ACCOUNT</span><h1>Good to see you,<br /><em>{(user.name || "player").split(" ")[0]}.</em></h1><p>One protected place for your VAMNUX purchases, wallet activity, saved products, and preferences.</p><Link href="/" className="user-primary-action">Continue shopping <ShoppingBag size={15} /></Link></div><div className="user-hero-grid" aria-hidden="true"><b>01</b><b>10</b><b>11</b><b>V</b><b>00</b><b>UX</b></div></section><section className="user-stat-grid"><article><div><span>WALLET BALANCE</span><strong>{money(data.wallet.availableBalance, data.wallet.currency)}</strong></div><WalletCards size={22} /></article><article><div><span>ORDERS</span><strong>{orderStats.total}</strong><small>{orderStats.active} active · {orderStats.completed} delivered</small></div><ReceiptText size={22} /></article><article><div><span>SAVED PRODUCTS</span><strong>{data.savedProducts.length}</strong><small>Active VAMNUX catalog records</small></div><Heart size={22} /></article></section><section className="user-overview-grid"><article className="user-panel"><div className="user-panel-heading"><div><span>RECENT ACTIVITY</span><h2>Orders at a glance</h2></div><button type="button" onClick={() => setActiveTab("orders")}>View all <ArrowRight size={14} /></button></div>{data.orders.length === 0 ? <EmptyState title="Nothing to track yet" detail="Your next completed VAMNUX purchase will appear here with its real order status." /> : <div className="user-order-table">{data.orders.slice(0, 4).map((order) => <article key={order.orderCode} className="user-order-row"><div><strong>{order.orderCode}</strong><p>{new Date(order.createdAt).toLocaleString()}</p></div><span className={`user-status user-status-${order.status}`}>{statusLabel(order.status)}</span><div><b>{money(order.total, order.currency)}</b></div></article>)}</div>}</article><aside className="user-account-card"><ShieldCheck size={22} /><p>ACCOUNT STATUS</p><h2>Secure session active</h2><span>Your account data stays scoped to your authenticated VAMNUX session.</span><button type="button" onClick={logout}>Sign out <LogOut size={14} /></button></aside></section></>;
  };

  return <div className="user-dashboard"><header className="user-dashboard-topbar"><Link href="/" className="user-brand"><span>V</span>VAM<em>NUX</em></Link><div><Link href="/">Marketplace</Link><button type="button" onClick={logout}>Sign out <LogOut size={14} /></button></div></header><div className="user-dashboard-shell"><aside className="user-sidebar"><div className="user-profile-chip"><span>{(user.name || "V").charAt(0).toUpperCase()}</span><div><strong>{user.name || "VAMNUX customer"}</strong><small>{user.email || "Secure account"}</small></div></div><nav>{tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? "active" : ""}><Icon size={17} />{tab.label}</button>; })}</nav><div className="user-sidebar-note"><Clock3 size={15} /><span>Orders, wallet entries, and product saves display only when actually recorded.</span></div></aside><main>{renderContent()}</main></div></div>;
}
