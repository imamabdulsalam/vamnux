import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, CircleDollarSign, Gamepad2, Globe2, Heart, Search, ShieldCheck, ShoppingBag, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { createFulfillmentFieldKey, groupLiveProductFamilies } from "@shared/marketplace";
import { decodeGameFamilySegment } from "@shared/catalogRoutes";
import { filterPrimaryMarketProducts } from "@shared/catalogVisibility";
import { toLiveCatalogProduct, type LiveCatalogProduct } from "@/lib/liveCatalog";
import "./cartFields.css";
import "./digitalProductSelection.css";

type CurrencyCode = "USD" | "EUR" | "GBP" | "NGN";

const currencies: Record<CurrencyCode, { label: string; locale: string; rate: number }> = {
  USD: { label: "USD", locale: "en-US", rate: 1 },
  EUR: { label: "EUR", locale: "de-DE", rate: 0.92 },
  GBP: { label: "GBP", locale: "en-GB", rate: 0.78 },
  NGN: { label: "NGN", locale: "en-NG", rate: 1600 },
};

export default function GameFamilyDetail() {
  const [, params] = useRoute("/games/:family");
  const [, setLocation] = useLocation();
  const familyName = decodeGameFamilySegment(params?.family);
  const { isAuthenticated } = useAuth();
  const supplierCatalog = trpc.marketplace.catalog.useQuery({ page: 1, pageSize: 96, familyName: familyName || "", scope: "all" }, { enabled: Boolean(familyName) });
  const customerDashboard = trpc.marketplace.customerDashboard.useQuery(undefined, { enabled: isAuthenticated });
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [cart, setCart] = useState<LiveCatalogProduct[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [fulfillmentDetails, setFulfillmentDetails] = useState<Record<string, string>>({});
  const createDraftOrder = trpc.marketplace.createOrder.useMutation({
    onSuccess: (result) => {
      toast.success(`Draft order ${result.orderCode} created`, { description: "Wallet balance eligibility was confirmed. No wallet debit or supplier order has been sent." });
      setCart([]);
      setFulfillmentDetails({});
      setCartOpen(false);
      setLocation("/account");
    },
    onError: (orderError) => toast.error(orderError.message || "We could not create your draft order."),
  });
  const toggleSavedProduct = trpc.marketplace.toggleSavedProduct.useMutation({
    onSuccess: async (result) => {
      toast.success(result.saved ? "Product added to your favorites." : "Product removed from your favorites.");
      await customerDashboard.refetch();
    },
    onError: (error) => toast.error(error.message || "Could not update your favorites."),
  });
  const recordCartAddition = trpc.marketplace.recordCartAddition.useMutation();

  const products = useMemo(() => (supplierCatalog.data?.items ?? []).map(toLiveCatalogProduct), [supplierCatalog.data?.items]);
  const family = useMemo(() => groupLiveProductFamilies(products.filter((product) => product.name.toLowerCase() === familyName?.toLowerCase()))[0], [familyName, products]);
  const selectedItem = family?.items.find((item) => item.id === selectedServiceId) ?? family?.items[0];
  useEffect(() => {
    if (family?.items.length && !family.items.some((item) => item.id === selectedServiceId)) setSelectedServiceId(family.items[0].id);
  }, [family, selectedServiceId]);
  const config = currencies[currency];
  const formatPrice = (price: number) => new Intl.NumberFormat(config.locale, { style: "currency", currency, maximumFractionDigits: currency === "NGN" ? 0 : 2 }).format(price * config.rate);
  const cartTotal = cart.reduce((total, item) => total + item.price, 0);

  const addToCart = (item: LiveCatalogProduct) => {
    setCart((current) => [...current, item]);
    setCartOpen(true);
    if (isAuthenticated) recordCartAddition.mutate({ productId: item.id });
    toast.success(`${item.product} added to your cart`, { description: "VAMNUX products are prepared for wallet-only purchase. No direct payment or automatic fulfilment is available." });
  };

  const buyNow = (item: LiveCatalogProduct) => {
    setCart([item]);
    setCartOpen(true);
  };

  const saveDraft = () => {
    if (!isAuthenticated) {
      toast.message("Sign in to use your VAMNUX wallet", { description: "Product orders require sufficient settled wallet balance; direct product payment is not offered." });
      startLogin();
      return;
    }
    createDraftOrder.mutate({
      currency: "USD",
      items: cart.reduce<Array<{ productId: number; quantity: number }>>((items, item) => {
        const existing = items.find((line) => line.productId === item.id);
        if (existing) existing.quantity += 1;
        else items.push({ productId: item.id, quantity: 1 });
        return items;
      }, []),
      fulfillmentDetails,
    });
  };

  if (supplierCatalog.isLoading) return <main className="family-page-loading"><Search size={28} /><p>Loading services…</p></main>;
  if (!familyName || !family) return <main className="family-page-loading"><ShieldCheck size={28} /><h1>Game family unavailable.</h1><p>This family is not currently an active synchronised VAMNUX listing.</p><button onClick={() => setLocation("/")}>Back to catalog</button></main>;
  const isSaved = selectedItem ? customerDashboard.data?.savedProducts.some((savedProduct) => savedProduct.id === selectedItem.id) ?? false : false;
  const toggleFavorite = () => {
    if (!selectedItem) return;
    if (!isAuthenticated) {
      toast.message("Sign in to favorite products", { description: "Favorites are private to your VAMNUX account." });
      startLogin();
      return;
    }
    toggleSavedProduct.mutate({ productId: selectedItem.id });
  };

  return (
    <main className="game-family-page">
      <header className="family-page-header">
        <button className="family-brand" onClick={() => setLocation("/")}><span className="family-brand-mark">V</span> VAM<span>NUX</span></button>
        <div className="family-header-actions">
          <label className="family-currency"><Globe2 size={17} /><select value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)} aria-label="Display currency">{Object.entries(currencies).map(([code, item]) => <option key={code} value={code}>{item.label}</option>)}</select></label>
          <button className="family-cart-button" onClick={() => setCartOpen(true)}><ShoppingBag size={18} /> Cart {cart.length > 0 && <b>{cart.length}</b>}</button>
        </div>
      </header>

      <section className="family-detail-hero">
        <button className="family-back" onClick={() => setLocation("/")}><ArrowLeft size={17} /> All game listings</button>
        <div className="family-detail-hero-grid">
          <div className="family-detail-art"><div className="live-game-family-fallback"><Gamepad2 size={40} /></div>{family.image && <img src={family.image} alt={`${family.name} product artwork`} onError={(event) => { event.currentTarget.style.display = "none"; }} />}<span>{family.category}</span></div>
          <div className="family-detail-summary"><p className="detail-eyebrow">Game family</p><h1>{family.name}</h1><p>{family.items.length} active services are available. Choose one denomination below, review its exact account requirement, then add the selected option to your saved cart.</p><div><ShieldCheck size={17} /> Product availability <CircleDollarSign size={17} /> VAMNUX display price</div></div>
        </div>
      </section>

      <section className="family-services" aria-label={`${family.name} services`}>
        <div className="family-services-heading"><div><p className="detail-eyebrow">Choose a denomination</p><h2>SELECT<br /><em>YOUR ITEM.</em></h2></div><p>Each option is an active catalog denomination. The current VAMNUX price, region, and exact account requirement are shown before it enters your saved cart.</p></div>
        {selectedItem && <div className="family-selection-layout">
          <div className="family-denomination-area"><div className="family-requirement-bar"><span>What’s needed for this top-up</span>{selectedItem.inputRequirements.filter((field) => field.required).length ? selectedItem.inputRequirements.filter((field) => field.required).map((field) => <b key={field.key}>{field.label}</b>) : <b>No account field required</b>}</div><div className="family-denomination-grid">{family.items.map((item) => <button key={item.id} type="button" onClick={() => setSelectedServiceId(item.id)} className={item.id === selectedItem.id ? "family-denomination-card selected" : "family-denomination-card"}><span>{item.product}</span><strong>{formatPrice(item.price)}</strong><small>{item.region} · {item.delivery}</small></button>)}</div></div>
          <aside className="family-selection-summary"><p className="detail-eyebrow">Your selection</p><h3>{selectedItem.product}</h3><p>{family.name}</p><div className="selection-required-fields">{selectedItem.inputRequirements.filter((field) => field.required).map((field) => { const key = createFulfillmentFieldKey(selectedItem.id, field.key); return <label key={key}><span>{field.label} *</span><input type={field.type === "email" ? "email" : "text"} value={fulfillmentDetails[key] ?? ""} onChange={(event) => setFulfillmentDetails((current) => ({ ...current, [key]: event.target.value }))} placeholder={field.helperText || field.label} /></label>; })}</div><div className="selection-price"><span>VAMNUX price</span><strong>{formatPrice(selectedItem.price)}</strong><small>{selectedItem.priceNote}</small></div><div className="digital-selection-actions"><button type="button" onClick={toggleFavorite} disabled={toggleSavedProduct.isPending} className={isSaved ? "saved" : ""}>{isSaved ? "Favorited" : "Favorite"} <Heart size={15} fill={isSaved ? "currentColor" : "none"} /></button><button className="product-selection-add" onClick={() => addToCart(selectedItem)} aria-label={`Add ${family.name} ${selectedItem.product} to cart`} title="Add selected item to cart"><ShoppingCart size={19} /><span>Add to cart</span></button><button type="button" className="product-selection-buy-now" onClick={() => buyNow(selectedItem)} aria-label={`Buy ${family.name} ${selectedItem.product} now`}><span>Buy now</span><ArrowRight size={17} /></button></div><small className="selection-note">Buy now opens this selected item in the protected wallet checkout. Automatic ordering and delivery remain inactive.</small></aside>
        </div>}
      </section>

      <div className={cartOpen ? "cart-overlay open" : "cart-overlay"} onClick={() => setCartOpen(false)} />
      <aside className={cartOpen ? "cart-drawer open" : "cart-drawer"} aria-label="Shopping cart" aria-hidden={!cartOpen}>
        <div className="cart-drawer-head"><div><span className="section-marker">YOUR SELECTION</span><h2>Cart <em>({cart.length})</em></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={22} /></button></div>
        <div className="cart-items">{cart.length === 0 ? <div className="cart-empty"><ShoppingBag size={35} /><h3>Your cart is clear.</h3><p>Choose a product to add it here.</p></div> : cart.map((item, index) => <div className="cart-item" key={`${item.id}-${index}`}>{item.image ? <img src={item.image} alt="" /> : <span className="cart-item-fallback">{item.name.slice(0, 1)}</span>}<div><span>{item.name}</span><strong>{item.product}</strong><small>{formatPrice(item.price)}</small></div><button onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${item.product}`}><X size={16} /></button></div>)}</div>
        {cart.length > 0 && <div className="cart-checkout"><p>Cart total: <strong>{formatPrice(cartTotal)}</strong>. VAMNUX products are wallet-only: this USD order requires sufficient settled USD wallet balance. {isAuthenticated ? <><br />Your current wallet: <strong>{customerDashboard.data ? `${customerDashboard.data.wallet.currency} ${Number(customerDashboard.data.wallet.availableBalance).toFixed(2)}` : "Loading wallet…"}</strong>.</> : " Sign in to check your wallet balance."} No direct product payment is offered.</p><div className="cart-fulfillment-fields">{cart.flatMap((item, itemIndex) => item.inputRequirements.map((field) => { const key = createFulfillmentFieldKey(item.id, field.key); return <label key={`${key}-${itemIndex}`}><span>{item.name} · {field.label}{field.required ? " *" : ""}</span><input type={field.type === "email" ? "email" : "text"} value={fulfillmentDetails[key] ?? ""} onChange={(event) => setFulfillmentDetails((current) => ({ ...current, [key]: event.target.value }))} placeholder={field.helperText || field.label} required={field.required} /></label>; }))}</div><button onClick={saveDraft} disabled={createDraftOrder.isPending}>{createDraftOrder.isPending ? "Checking wallet…" : "Check wallet eligibility"} <ArrowRight size={18} /></button></div>}
      </aside>
    </main>
  );
}
