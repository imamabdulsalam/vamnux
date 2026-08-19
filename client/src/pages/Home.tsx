/**
 * VAMNUX Global Exchange: a clean marketplace header, USD-first price display,
 * technology-led colour rotation, and compact transactional product information.
 */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { createFulfillmentFieldKey, groupLiveProductFamilies } from "@shared/marketplace";
import { gameFamilyPath } from "@shared/catalogRoutes";
import { productMatchesKeyword, toLiveCatalogProduct, type LiveCatalogProduct, type ProductCategory } from "@/lib/liveCatalog";
import { findPublicSupplierDiscoveryMatches, PUBLIC_FLASHTOPUP_DISCOVERY } from "@shared/supplierDiscovery";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Coins,
  Gamepad2,
  Gift,
  Globe2,
  Headphones,
  Heart,
  Laptop,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Ticket,
  Tv,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import "./cartFields.css";

type CurrencyCode = "USD" | "EUR" | "GBP" | "NGN";
type Product = LiveCatalogProduct;

const currencies: Record<CurrencyCode, { label: string; locale: string; rate: number }> = {
  USD: { label: "USD", locale: "en-US", rate: 1 },
  EUR: { label: "EUR", locale: "de-DE", rate: 0.92 },
  GBP: { label: "GBP", locale: "en-GB", rate: 0.78 },
  NGN: { label: "NGN", locale: "en-NG", rate: 1600 },
};

const slides = [
  {
    key: "violet",
    kicker: "01 / GAMING",
    title: "LEVEL UP.\nPLAY MORE.",
    emphasis: "PLAY MORE.",
    description: "Instant access to game credits, passes and gaming vouchers for the games you love.",
    cta: "Explore games",
    category: "Top-up" as ProductCategory,
    metric: "Gaming",
    note: "Game credits, passes & vouchers.",
  },
  {
    key: "jade",
    kicker: "02 / GIFT CARDS",
    title: "EVERYTHING DIGITAL.\nONE PLACE.",
    emphasis: "ONE PLACE.",
    description: "Browse gift cards and digital vouchers for gaming, entertainment, shopping, and more as approved sources are connected.",
    cta: "Explore gift cards",
    category: "Voucher" as ProductCategory,
    metric: "Gift cards",
    note: "Approved sources unlock availability.",
  },
  {
    key: "ember",
    kicker: "03 / DIGITAL SERVICES",
    title: "UPGRADE YOUR\nDIGITAL LIFE.",
    emphasis: "DIGITAL LIFE.",
    description: "Discover subscriptions, software, AI tools, and premium digital services as their authorised suppliers are added to VAMNUX.",
    cta: "Explore services",
    category: "Subscription" as ProductCategory,
    metric: "Digital services",
    note: "Subscriptions, software & AI tools.",
  },
];

const categories = [
  { label: "Game top-up", icon: Coins, filter: "Top-up" as ProductCategory },
  { label: "Gift cards", icon: Gift, filter: "Voucher" as ProductCategory },
  { label: "Subscriptions", icon: Tv, filter: "Subscription" as ProductCategory },
  { label: "Software", icon: Laptop, filter: "Software" as ProductCategory },
  { label: "AI tools", icon: Sparkles, filter: "AI tools" as ProductCategory },
];

const unavailableCategoryDescriptions: Record<Exclude<ProductCategory, "Top-up">, string> = {
  Voucher: "Gift Card products will appear here after VAMNUX connects an authorised supplier with live codes and regional pricing.",
  Subscription: "Subscription services are planned for this category and will appear after an approved supplier is connected.",
  Software: "Software licences will appear here after VAMNUX connects an authorised software supplier.",
  "AI tools": "AI tool subscriptions and licences will appear here after an authorised catalog source is connected.",
};

function Logo() {
  return (
    <a className="brand" href="#top" aria-label="VAMNUX home">
      <img src="/manus-storage/naijaplay-logo_0a937b1e.png" alt="" />
      <span>VAM<span>NUX</span></span>
    </a>
  );
}

export default function Home() {
  // The useAuth hook provides authentication state.
  // To implement login/logout, call logout(), or start login from an event
  // handler: onClick={() => startLogin()} (imported from "@/const"). Never call
  // startLogin() during render (no href={startLogin()}) — it mints a one-time
  // nonce cookie and must run only at the moment of navigation.
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const supplierCatalog = trpc.marketplace.catalog.useQuery();

  const [activeCategory, setActiveCategory] = useState<"All" | ProductCategory>("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [activeSlide, setActiveSlide] = useState(0);
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

  useEffect(() => {
    const interval = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 5200);
    return () => window.clearInterval(interval);
  }, []);

  const formatPrice = (basePrice: number) => {
    const config = currencies[currency];
    return new Intl.NumberFormat(config.locale, { style: "currency", currency, maximumFractionDigits: currency === "NGN" ? 0 : 2 }).format(basePrice * config.rate);
  };

  const liveProducts = useMemo<Product[]>(() => (supplierCatalog.data ?? []).map(toLiveCatalogProduct), [supplierCatalog.data]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return liveProducts.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch = productMatchesKeyword(item, normalized);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, liveProducts, query]);

  const discoveryMatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized || (activeCategory !== "All" && activeCategory !== "Top-up")) return [];
    return findPublicSupplierDiscoveryMatches(normalized);
  }, [activeCategory, query]);

  const selectedCategory = categories.find((category) => category.filter === activeCategory);

  const cartTotal = useMemo(() => cart.reduce((total, item) => total + item.price, 0), [cart]);
  const productFamilies = useMemo(() => groupLiveProductFamilies(filteredProducts), [filteredProducts]);

  const addToCart = (item: Product) => {
    setCart((current) => [...current, item]);
    toast.success(`${item.product} added to your cart`, {
      description: `${formatPrice(item.price)} shown in ${currency}. Payments are not active, so this remains a saved selection only.`,
    });
  };

  const chooseCategory = (category: ProductCategory) => {
    setActiveCategory(category);
    setQuery("");
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCart = () => setCartOpen(true);

  const checkoutPreview = () => {
    if (!isAuthenticated) {
      toast.message("Sign in to continue to checkout", { description: "Your account keeps orders, digital delivery details, and wallet activity together." });
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

  const openAccount = () => {
    if (loading) return;
    if (!isAuthenticated) {
      toast.message("Sign in to access VAMNUX", { description: "Use an account to view orders, wallet activity, saved products, and support." });
      startLogin();
      return;
    }
    setLocation("/account");
  };

  const handleCurrencyChange = (next: CurrencyCode) => {
    setCurrency(next);
    toast.message(`Prices now display in ${next}`, { description: "This storefront preview uses USD as the base price. Live checkout should confirm final FX and currency availability." });
  };

  const slide = slides[activeSlide];

  return (
    <main id="top" className="global-marketplace">
      <div className="global-announcement">
        <span><Globe2 size={13} /> GLOBAL DIGITAL MARKETPLACE</span>
        <strong>Digital products. Instantly delivered.</strong>
        <span><CircleDollarSign size={13} /> USD base display · Switch currency anytime</span>
      </div>

      <header className="commerce-header">
        <div className="commerce-top">
          <Logo />
          <label className="market-search" aria-label="Search VAMNUX product catalog">
            <Search size={21} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games, gift cards, subscriptions, software & AI tools" />
            <span className="search-category">All products <ChevronDown size={15} /></span>
          </label>
          <div className="header-actions">
            <label className="currency-switcher" title="Change display currency">
              <Globe2 size={17} />
              <select value={currency} onChange={(event) => handleCurrencyChange(event.target.value as CurrencyCode)} aria-label="Display currency">
                {Object.entries(currencies).map(([code, details]) => <option key={code} value={code}>{details.label}</option>)}
              </select>
            </label>
            <button className="header-icon" onClick={openAccount} aria-label="Account"><UserRound size={20} /><span>{user?.name ? "Account" : "Login"}</span></button>
            <button className="header-icon favourite-button" onClick={() => toast.message("Favourites are ready to connect", { description: "Add customer accounts to save products between visits." })} aria-label="Favourites"><Heart size={20} /></button>
            <button className="header-cart" onClick={openCart} aria-label="Open cart"><ShoppingBag size={21} /><span>Cart</span>{cart.length > 0 && <b>{cart.length}</b>}</button>
          </div>
        </div>
        <nav className="commerce-categories" aria-label="Marketplace categories">
          <a href="#products" onClick={() => chooseCategory("Top-up")}><Gamepad2 size={19} /> Gaming top-ups</a>
          <a href="#products" onClick={() => chooseCategory("Voucher")}><Gift size={19} /> Gift cards</a>
          <a href="#products" onClick={() => chooseCategory("Subscription")}><Tv size={19} /> Subscriptions</a>
          <a href="#products" onClick={() => chooseCategory("Software")}><Laptop size={19} /> Software</a>
          <a href="#products" onClick={() => chooseCategory("AI tools")}><Sparkles size={19} /> AI tools</a>
          <a href="#supplier-recognition-title"><ShieldCheck size={19} /> Supplier catalogue</a>
          <span className="scope-status"><ShieldCheck size={16} /> Live services update by supplier</span>
        </nav>
      </header>

      <section className="commerce-carousel" aria-label="VAMNUX marketplace highlights">
        <div className={`carousel-panel palette-${slide.key}`}>
          <div className="carousel-grid" />
          <div className="carousel-content" key={slide.key}>
            <p className="carousel-kicker"><span /> {slide.kicker}</p>
            <h1>{slide.title.split("\n")[0]}<br /><em>{slide.emphasis}</em></h1>
            <p className="carousel-copy">{slide.description}</p>
            <div className="carousel-actions">
              <button onClick={() => chooseCategory(slide.category)} className="carousel-primary">{slide.cta} <ArrowRight size={18} /></button>
              <button onClick={() => chooseCategory("Top-up")} className="carousel-secondary">Top up a game <ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="carousel-terminal" aria-hidden="true">
            <div className="terminal-top"><span>LIVE // MARKET VIEW</span><i /></div>
            <div className="terminal-price"><strong>{slide.metric}</strong><span>{slide.note}</span></div>
            <div className="terminal-bars"><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="terminal-bottom"><span>READY</span><span>01 / 03</span></div>
          </div>
          <div className="carousel-controls" aria-label="Carousel slides">
            {slides.map((item, index) => <button key={item.key} onClick={() => setActiveSlide(index)} aria-label={`Show ${item.kicker}`} className={activeSlide === index ? "active" : ""}>{String(index + 1).padStart(2, "0")}</button>)}
          </div>
        </div>
      </section>

      <section className="global-promises" aria-label="Marketplace service highlights">
        <div><Zap size={20} fill="currentColor" /><span><strong>Digital delivery</strong><small>Format shown before checkout</small></span></div>
        <div><ShieldCheck size={20} /><span><strong>Clear product details</strong><small>Region and delivery requirements</small></span></div>
        <div><Globe2 size={20} /><span><strong>Global-ready pricing</strong><small>USD base with manual display switch</small></span></div>
        <div><Headphones size={20} /><span><strong>Support-led buying</strong><small>Product-specific order guidance</small></span></div>
      </section>

      <section id="categories" className="global-category-row" aria-label="Product categories">
        <div className="global-section-label">EXPLORE / WHAT ARE YOU LOOKING FOR?</div>
        <div className="category-list">
          {categories.map(({ label, icon: Icon, filter }) => (
            <button key={label} onClick={() => chooseCategory(filter)} className="category-button exchange-ticket">
              <Icon size={22} strokeWidth={1.8} />
              <span>{label}</span>
              <ArrowRight size={17} />
            </button>
          ))}
        </div>
      </section>

      <section className="supplier-recognition" aria-labelledby="supplier-recognition-title">
        <div className="supplier-recognition-head">
          <div><p className="eyebrow"><span /> FlashTopUp public catalogue</p><h2 id="supplier-recognition-title">RECOGNISED<br /><em>GAME FAMILIES.</em></h2></div>
          <p>Browse real game identities from FlashTopUp’s public catalogue. A game becomes purchasable on VAMNUX only after a service is synchronised and active for this reseller account.</p>
        </div>
        <div className="supplier-game-grid">
          {PUBLIC_FLASHTOPUP_DISCOVERY.map((game) => <a key={game.name} className="supplier-game-card" href={game.href} target="_blank" rel="noreferrer" title={`Open ${game.name} in the official FlashTopUp catalogue`}><img src={game.image} alt={`${game.name} official FlashTopUp category artwork`} loading="lazy" /><div><span>Browse official catalogue</span><strong>{game.name}</strong></div></a>)}
        </div>
      </section>

      <section id="products" className="product-section global-product-section" aria-labelledby="products-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow dark-eyebrow"><span /> Live supplier inventory</div>
            <h2 id="products-title">SHOP WHAT’S<br /><em>LIVE NOW.</em></h2>
          </div>
          <div className="section-heading-right">
            <p>Only services synchronised from approved suppliers are purchasable. Search can also show public supplier-catalogue matches, clearly marked as awaiting VAMNUX synchronisation.</p>
            <button className="all-products-button" onClick={() => { setActiveCategory("All"); setQuery(""); }}>View all products <ArrowRight size={17} /></button>
          </div>
        </div>

        <div className="filter-row" aria-label="Filter product list">
          {(["All", "Top-up", "Voucher", "Subscription", "Software", "AI tools"] as const).map((filter) => (
            <button key={filter} onClick={() => setActiveCategory(filter)} className={activeCategory === filter ? "filter-chip active" : "filter-chip"}>
              {filter === "All" ? "All picks" : filter}
            </button>
          ))}
          <span className="price-display-note">Prices shown in <strong>{currency}</strong></span>
        </div>

        <div className="catalog-keyword-search" aria-label="Search live game listings">
          <div><Search size={21} /><label htmlFor="compact-catalog-search">Find your game or service</label></div>
          <div className="catalog-keyword-input"><input id="compact-catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try PUBG, Free Fire, diamonds, UC, Valorant…" /><button onClick={() => setQuery("")} disabled={!query} aria-label="Clear catalog search"><X size={17} /></button></div>
          <p>{query.trim() ? `${productFamilies.length} live ${productFamilies.length === 1 ? "game family" : "game families"} match “${query.trim()}”` : "Search by game, denomination, region, or Player ID requirement."}</p>
        </div>

        <div className="product-family-list">
          {supplierCatalog.isLoading && <div className="empty-results"><Search size={28} /><h3>Loading verified supplier products…</h3><p>VAMNUX is retrieving live availability from FlashTopUp.</p></div>}
          {supplierCatalog.error && <div className="empty-results"><ShieldCheck size={28} /><h3>Supplier catalog is temporarily unavailable.</h3><p>Try again shortly. No payment or order attempt has been made.</p></div>}
          {productFamilies.map((family, familyIndex) => {
            const fromPrice = Math.min(...family.items.map((item) => item.price));
            return <article className="compact-game-listing" key={family.name} style={{ animationDelay: `${familyIndex * 35}ms` }}>
              <button className="compact-game-listing-button" onClick={() => setLocation(gameFamilyPath(family.name))} aria-label={`View ${family.name} services`}>
                <div className="compact-game-image"><div className="live-game-family-fallback"><Gamepad2 size={28} /></div>{family.image && <img src={family.image} alt={`${family.name} official supplier artwork`} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />}<span>{family.category}</span></div>
                <div className="compact-game-copy"><p>Verified supplier family</p><h3>{family.name}</h3><span>{family.items.length} active services · from {formatPrice(fromPrice)}</span></div>
                <div className="compact-game-action">View services <ArrowRight size={18} /></div>
              </button>
            </article>;
          })}
          {!supplierCatalog.isLoading && !supplierCatalog.error && filteredProducts.length === 0 && (
            <div className="empty-results">
              <Search size={28} />
              {discoveryMatches.length > 0 ? <>
                <h3>Found in the supplier catalogue.</h3>
                <p>These real FlashTopUp game families are not yet synchronised as purchasable VAMNUX services. Open the official listing or wait for the supplier sync.</p>
                <div className="discovery-match-grid">
                  {discoveryMatches.map((game) => <a key={game.name} className="discovery-match" href={game.href} target="_blank" rel="noreferrer"><img src={game.image} alt="" /><span><strong>{game.name}</strong><small>Awaiting VAMNUX sync <ArrowRight size={14} /></small></span></a>)}
                </div>
              </> : activeCategory !== "All" && activeCategory !== "Top-up" ? <>
                <h3>{selectedCategory?.label ?? activeCategory} are planned.</h3>
                <p>{unavailableCategoryDescriptions[activeCategory]}</p>
                <button onClick={() => { setActiveCategory("All"); setQuery(""); }}>Browse live inventory</button>
              </> : <>
                <h3>No live match yet.</h3>
                <p>{query.trim() ? `No active VAMNUX service matches “${query.trim()}”. Try a game name, denomination, region, or requirement.` : "Try a game family or denomination. Public supplier-catalogue matches are shown when available, while purchasable items stay limited to synchronised services."}</p>
                <button onClick={() => { setActiveCategory("All"); setQuery(""); }}>Reset catalog</button>
              </>}
            </div>
          )}
        </div>
        <p className="catalog-note"><CircleDollarSign size={16} /> <strong>VAMNUX SUPPLIER NOTE:</strong> These products are synchronized from FlashTopUp. Display conversion is informational only; customer payment and wallet funding remain inactive.</p>
      </section>

      <section id="how-it-works" className="process-section" aria-labelledby="process-title">
        <div className="process-intro">
          <div className="section-marker">HOW IT WORKS / CLEAR BY DESIGN</div>
          <h2 id="process-title">CHOOSE.<br />CHECK.<br /><em>RECEIVE.</em></h2>
          <p>VAMNUX keeps each digital purchase specific: choose the product, confirm the delivery requirements, then proceed using the available checkout method.</p>
          <a href="#products">Choose your product <ArrowRight size={18} /></a>
        </div>
        <div className="steps-list">
          <article className="step-item">
            <span>01</span>
            <div><h3>Choose a product</h3><p>Browse game credit, digital vouchers, subscriptions, AI tools, and software from one marketplace.</p></div>
            <Gamepad2 size={29} />
          </article>
          <article className="step-item">
            <span>02</span>
            <div><h3>Check region & format</h3><p>Confirm your region and whether your product is a code, activation link, licence, or account top-up.</p></div>
            <Smartphone size={29} />
          </article>
          <article className="step-item">
            <span>03</span>
            <div><h3>Complete & receive</h3><p>Checkout confirms the final order details and directs your digital delivery through its specified route.</p></div>
            <ShieldCheck size={29} />
          </article>
        </div>
      </section>

      <section className="trust-section" aria-label="Service principles">
        <div className="trust-card trust-dark"><ShieldCheck size={27} /><span className="trust-ticket">PRICE / CLARITY</span><h3>USD first. Clearer choice.</h3><p>Start with a consistent USD base and switch your display currency manually whenever it helps you compare.</p></div>
        <div className="trust-card trust-lime"><Zap size={27} fill="currentColor" /><span className="trust-ticket">FORMAT / FIRST</span><h3>Delivery type upfront</h3><p>Products label their expected delivery format so you know what you are selecting before the order flow begins.</p></div>
        <div className="trust-card trust-coral"><Headphones size={27} /><span className="trust-ticket">GLOBAL / READY</span><h3>Region-aware buying</h3><p>Gift cards, licences, and subscriptions keep the intended region visible alongside their price and delivery information.</p></div>
      </section>

      <section id="support" className="support-cta">
        <div className="terminal-stack" aria-hidden="true"><i /><i /><i /></div>
        <div className="section-marker">VAMNUX / DIGITAL MARKETPLACE</div>
        <h2>ONE MARKET.<br /><em>MANY WAYS</em><br />TO GO DIGITAL.</h2>
        <p><b>USD / GLOBAL / READY</b><br />One destination for game time, gift giving, AI tools, subscriptions, and everyday software.</p>
        <button onClick={openAccount}>{isAuthenticated ? "Open my account" : "Create an account"} <ArrowRight size={18} /></button>
      </section>

      <footer>
        <div className="footer-top"><Logo /><p>Digital products for game time, work flow, and everything in between.</p><div className="footer-links"><a href="#products">Browse</a><a href="#categories">Categories</a><a href="#how-it-works">How it works</a><a href="#support">Help center</a></div></div>
        <div className="footer-bottom"><span>© 2026 VAMNUX. A global digital-products marketplace concept.</span><span>USD base display · Region rules apply by product.</span></div>
      </footer>

      <div className={cartOpen ? "cart-overlay open" : "cart-overlay"} onClick={() => setCartOpen(false)} />
      <aside className={cartOpen ? "cart-drawer open" : "cart-drawer"} aria-label="Shopping cart" aria-hidden={!cartOpen}>
        <div className="cart-drawer-head"><div><span className="section-marker">YOUR SELECTION</span><h2>Cart <em>({cart.length})</em></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={22} /></button></div>
        <div className="cart-items">
          {cart.length === 0 ? <div className="cart-empty"><ShoppingBag size={35} /><h3>Your cart is clear.</h3><p>Pick a digital product and it will appear here.</p><button onClick={() => { setCartOpen(false); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}>Browse products</button></div> : cart.map((item, index) => (
            <div className="cart-item" key={`${item.id}-${index}`}><img src={item.image} alt="" /><div><span>{item.name}</span><strong>{item.product}</strong><small>{formatPrice(item.price)}</small></div><button onClick={() => setCart((current) => current.filter((_, i) => i !== index))} aria-label={`Remove ${item.product}`}><X size={16} /></button></div>
          ))}
        </div>
        {cart.length > 0 && <div className="cart-checkout"><p>Cart total: <strong>{formatPrice(cartTotal)}</strong>. Payment and wallet funding are inactive; save a draft after entering any supplier-required details.</p><div className="cart-fulfillment-fields">{cart.flatMap((item, itemIndex) => item.inputRequirements.map((field) => {
          const fieldKey = createFulfillmentFieldKey(item.id, field.key);
          return <label key={`${fieldKey}-${itemIndex}`}><span>{item.name} · {field.label}{field.required ? " *" : ""}</span><input type={field.type === "email" ? "email" : "text"} value={fulfillmentDetails[fieldKey] ?? ""} onChange={(event) => setFulfillmentDetails((current) => ({ ...current, [fieldKey]: event.target.value }))} placeholder={field.helperText || field.label} required={field.required} /></label>;
        }))}</div><button onClick={checkoutPreview} disabled={createDraftOrder.isPending}>{createDraftOrder.isPending ? "Saving draft…" : "Save draft order"} <ArrowRight size={18} /></button></div>}
      </aside>
    </main>
  );
}
