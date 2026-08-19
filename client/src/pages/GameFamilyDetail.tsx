import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, CircleDollarSign, Gamepad2, Globe2, Search, ShieldCheck, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { createFulfillmentFieldKey, groupLiveProductFamilies } from "@shared/marketplace";
import { decodeGameFamilySegment } from "@shared/catalogRoutes";
import { toLiveCatalogProduct, type LiveCatalogProduct } from "@/lib/liveCatalog";
import "./cartFields.css";

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
  const supplierCatalog = trpc.marketplace.catalog.useQuery();
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [cart, setCart] = useState<LiveCatalogProduct[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [fulfillmentDetails, setFulfillmentDetails] = useState<Record<string, string>>({});
  const createDraftOrder = trpc.marketplace.createOrder.useMutation({
    onSuccess: (result) => {
      toast.success(`Draft order ${result.orderCode} created`, { description: "Payment and wallet funding remain inactive. No supplier order has been sent." });
      setCart([]);
      setFulfillmentDetails({});
      setCartOpen(false);
      setLocation("/account");
    },
    onError: (orderError) => toast.error(orderError.message || "We could not create your draft order."),
  });

  const products = useMemo(() => (supplierCatalog.data ?? []).map(toLiveCatalogProduct), [supplierCatalog.data]);
  const family = useMemo(() => groupLiveProductFamilies(products.filter((product) => product.name.toLowerCase() === familyName?.toLowerCase()))[0], [familyName, products]);
  const config = currencies[currency];
  const formatPrice = (price: number) => new Intl.NumberFormat(config.locale, { style: "currency", currency, maximumFractionDigits: currency === "NGN" ? 0 : 2 }).format(price * config.rate);
  const cartTotal = cart.reduce((total, item) => total + item.price, 0);

  const addToCart = (item: LiveCatalogProduct) => {
    setCart((current) => [...current, item]);
    setCartOpen(true);
    toast.success(`${item.product} added to your cart`, { description: "This is a saved selection only; payment and supplier fulfilment are inactive." });
  };

  const saveDraft = () => {
    if (!isAuthenticated) {
      toast.message("Sign in to continue to checkout", { description: "Your account keeps saved draft orders and supplier-required delivery details together." });
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

  if (supplierCatalog.isLoading) return <main className="family-page-loading"><Search size={28} /><p>Loading verified supplier services…</p></main>;
  if (!familyName || !family) return <main className="family-page-loading"><ShieldCheck size={28} /><h1>Game family unavailable.</h1><p>This family is not currently an active synchronised VAMNUX listing.</p><button onClick={() => setLocation("/")}>Back to catalog</button></main>;

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
          <div className="family-detail-art"><div className="live-game-family-fallback"><Gamepad2 size={40} /></div>{family.image && <img src={family.image} alt={`${family.name} official supplier artwork`} onError={(event) => { event.currentTarget.style.display = "none"; }} />}<span>{family.category}</span></div>
          <div className="family-detail-summary"><p className="detail-eyebrow">Verified supplier game family</p><h1>{family.name}</h1><p>{family.items.length} active supplier services are available. Choose a denomination below to view its real price and add it to your selection.</p><div><ShieldCheck size={17} /> Supplier-backed availability <CircleDollarSign size={17} /> USD base prices</div></div>
        </div>
      </section>

      <section className="family-services" aria-label={`${family.name} services`}>
        <div className="family-services-heading"><div><p className="detail-eyebrow">Choose a denomination</p><h2>AVAILABLE<br /><em>SERVICES.</em></h2></div><p>Prices, delivery format, regional rules, and required account details come from the currently synchronised supplier service.</p></div>
        <div className="family-service-list">
          {family.items.map((item) => <article className={`family-service-row tone-${item.tone}`} key={item.id}>
            <div className="family-service-name"><h3>{item.product}</h3><p>{item.description}</p><div className="market-tags"><span>{item.region}</span><span>{item.delivery}</span></div></div>
            <div className="family-service-price"><strong>{formatPrice(item.price)}</strong><small>{item.priceNote} · USD base</small></div>
            <button onClick={() => addToCart(item)} aria-label={`Add ${item.product} to cart`}>Add to cart <ArrowRight size={17} /></button>
          </article>)}
        </div>
      </section>

      <div className={cartOpen ? "cart-overlay open" : "cart-overlay"} onClick={() => setCartOpen(false)} />
      <aside className={cartOpen ? "cart-drawer open" : "cart-drawer"} aria-label="Shopping cart" aria-hidden={!cartOpen}>
        <div className="cart-drawer-head"><div><span className="section-marker">YOUR SELECTION</span><h2>Cart <em>({cart.length})</em></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={22} /></button></div>
        <div className="cart-items">{cart.length === 0 ? <div className="cart-empty"><ShoppingBag size={35} /><h3>Your cart is clear.</h3><p>Choose a supplier service to add it here.</p></div> : cart.map((item, index) => <div className="cart-item" key={`${item.id}-${index}`}><img src={item.image} alt="" /><div><span>{item.name}</span><strong>{item.product}</strong><small>{formatPrice(item.price)}</small></div><button onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${item.product}`}><X size={16} /></button></div>)}</div>
        {cart.length > 0 && <div className="cart-checkout"><p>Cart total: <strong>{formatPrice(cartTotal)}</strong>. Payment and wallet funding are inactive; save a draft only after entering required supplier details.</p><div className="cart-fulfillment-fields">{cart.flatMap((item, itemIndex) => item.inputRequirements.map((field) => { const key = createFulfillmentFieldKey(item.id, field.key); return <label key={`${key}-${itemIndex}`}><span>{item.name} · {field.label}{field.required ? " *" : ""}</span><input type={field.type === "email" ? "email" : "text"} value={fulfillmentDetails[key] ?? ""} onChange={(event) => setFulfillmentDetails((current) => ({ ...current, [key]: event.target.value }))} placeholder={field.helperText || field.label} required={field.required} /></label>; }))}</div><button onClick={saveDraft} disabled={createDraftOrder.isPending}>{createDraftOrder.isPending ? "Saving draft…" : "Save draft order"} <ArrowRight size={18} /></button></div>}
      </aside>
    </main>
  );
}
