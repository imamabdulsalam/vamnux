/**
 * VAMNUX Global Exchange: a clean marketplace header, USD-first price display,
 * technology-led colour rotation, and compact transactional product information.
 */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
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

type ProductCategory = "Top-up" | "Voucher" | "Subscription" | "Software";
type CurrencyCode = "USD" | "EUR" | "GBP" | "NGN";

type Product = {
  id: number;
  category: ProductCategory;
  name: string;
  product: string;
  description: string;
  price: number;
  priceNote: string;
  region: string;
  delivery: string;
  image: string;
  tone: string;
  badge: string;
};

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
    description: "Shop gift cards and digital vouchers for gaming, entertainment, shopping and more.",
    cta: "Explore gift cards",
    category: "Voucher" as ProductCategory,
    metric: "Gift cards",
    note: "Digital vouchers for more ways to play.",
  },
  {
    key: "ember",
    kicker: "03 / DIGITAL SERVICES",
    title: "UPGRADE YOUR\nDIGITAL LIFE.",
    emphasis: "DIGITAL LIFE.",
    description: "Discover AI, software, subscriptions and premium digital services built for the way you live and work.",
    cta: "Explore digital products",
    category: "Subscription" as ProductCategory,
    metric: "Digital services",
    note: "AI, software & subscriptions together.",
  },
];

const categories = [
  { label: "Game top-up", icon: Coins, filter: "Top-up" as ProductCategory },
  { label: "Gift cards", icon: Gift, filter: "Voucher" as ProductCategory },
  { label: "Subscriptions", icon: Tv, filter: "Subscription" as ProductCategory },
];

const supplierCategoryLabels: Record<string, ProductCategory> = {
  top_up: "Top-up",
  gift_card: "Voucher",
  subscription: "Subscription",
  software: "Software",
  game_key: "Voucher",
  ai_tool: "Subscription",
};

const productTones = ["ember", "ice", "lime", "coral", "cobalt"];

function supplierDeliveryLabel(item: { requiresPlayerId: boolean; requiresServerId: boolean; deliveryType: string }) {
  if (item.requiresPlayerId && item.requiresServerId) return "Player ID + Server required";
  if (item.requiresPlayerId) return "Player ID required";
  return item.deliveryType.replaceAll("_", " ");
}

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

  useEffect(() => {
    const interval = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 5200);
    return () => window.clearInterval(interval);
  }, []);

  const formatPrice = (basePrice: number) => {
    const config = currencies[currency];
    return new Intl.NumberFormat(config.locale, { style: "currency", currency, maximumFractionDigits: currency === "NGN" ? 0 : 2 }).format(basePrice * config.rate);
  };

  const liveProducts = useMemo<Product[]>(() => (supplierCatalog.data ?? []).map((item, index) => {
    const nameParts = item.name.split(" — ");
    const fields = Array.isArray(item.inputRequirements) ? item.inputRequirements as Array<{ label?: string; required?: boolean }> : [];
    const category = supplierCategoryLabels[item.category] ?? "Top-up";
    return {
      id: item.id,
      category,
      name: nameParts[0] || item.name,
      product: nameParts.slice(1).join(" — ") || item.name,
      description: fields.length > 0
        ? `Enter ${fields.filter((field) => field.required).map((field) => field.label || "supplier-required details").join(" and ") || "the supplier-required account details"} before fulfilment.`
        : "Verified supplier service. Availability and delivery format are shown before purchase.",
      price: Number(item.basePrice),
      priceNote: item.supplierEligible ? "Live supplier price" : "Supplier availability paused",
      region: item.regionLabel || "Supplier region rules",
      delivery: supplierDeliveryLabel(item),
      image: item.imageUrl || "",
      tone: productTones[index % productTones.length],
      badge: category === "Voucher" ? "Gift card" : category,
    };
  }), [supplierCatalog.data]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return liveProducts.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch = !normalized || [item.name, item.product, item.category, item.region]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, liveProducts, query]);

  const cartTotal = useMemo(() => cart.reduce((total, item) => total + item.price, 0), [cart]);

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
    toast.message("Checkout setup comes next", {
      description: "Your account is ready. Connect an authorised supplier and payment provider before accepting live orders.",
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
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games, gift cards, subscriptions & software" />
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
          <a href="#products" onClick={() => chooseCategory("Subscription")}><Tv size={19} /> Subscriptions</a>
          <a href="#products" onClick={() => chooseCategory("Voucher")}><Gift size={19} /> Gift cards</a>
          <button onClick={() => toast.message("Deals are ready to configure", { description: "Use supplier-approved products and live pricing before publishing discounts." })}><Zap size={18} fill="currentColor" /> Deals</button>
          <button onClick={() => toast.message("Reseller access comes next", { description: "A reseller area needs account roles and an authorised pricing system." })}>Resellers</button>
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

      <section id="products" className="product-section global-product-section" aria-labelledby="products-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow dark-eyebrow"><span /> Global picks, clearly priced</div>
            <h2 id="products-title">POPULAR<br /><em>RIGHT NOW.</em></h2>
          </div>
          <div className="section-heading-right">
            <p>Browse game credit, global vouchers, AI subscriptions, and useful software. Product cards highlight the region and delivery format first.</p>
            <button className="all-products-button" onClick={() => { setActiveCategory("All"); setQuery(""); }}>View all products <ArrowRight size={17} /></button>
          </div>
        </div>

        <div className="filter-row" aria-label="Filter product list">
          {(["All", "Top-up", "Voucher", "Subscription"] as const).map((filter) => (
            <button key={filter} onClick={() => setActiveCategory(filter)} className={activeCategory === filter ? "filter-chip active" : "filter-chip"}>
              {filter === "All" ? "All picks" : filter}
            </button>
          ))}
          <span className="price-display-note">Prices shown in <strong>{currency}</strong></span>
        </div>

        <div className="product-grid">
          {supplierCatalog.isLoading && <div className="empty-results"><Search size={28} /><h3>Loading verified supplier products…</h3><p>VAMNUX is retrieving live availability from FlashTopUp.</p></div>}
          {supplierCatalog.error && <div className="empty-results"><ShieldCheck size={28} /><h3>Supplier catalog is temporarily unavailable.</h3><p>Try again shortly. No payment or order attempt has been made.</p></div>}
          {filteredProducts.map((item, index) => (
            <article className={`product-card tone-${item.tone}`} key={item.id} style={{ animationDelay: `${index * 45}ms` }}>
              <div className="product-image-wrap">
                {item.image ? <img src={item.image} alt="" /> : <div className="product-image-fallback" style={{ display: "grid", height: "100%", placeItems: "center", background: "linear-gradient(135deg, #172153, #6937c8)", color: "#b8ff43" }}><Ticket size={38} /></div>}
                <span className="product-badge ticket-chip">{item.badge}</span>
                <span className="play-frame" aria-hidden="true" />
                <span className="corner-mark">{currency}</span>
              </div>
              <div className="product-content">
                <p className="product-name">{item.name}</p>
                <h3>{item.product}</h3>
                <div className="market-tags"><span>{item.region}</span><span>{item.delivery}</span></div>
                <p className="product-description">{item.description}</p>
                <div className="product-buy-row">
                  <div><strong>{formatPrice(item.price)}</strong><small>{item.priceNote} · USD base</small></div>
                  <button onClick={() => addToCart(item)} aria-label={`Add ${item.name} ${item.product} to cart`}><ShoppingBag size={18} /><span>Add</span></button>
                </div>
              </div>
            </article>
          ))}
          {!supplierCatalog.isLoading && !supplierCatalog.error && filteredProducts.length === 0 && (
            <div className="empty-results">
              <Search size={28} />
              <h3>No quick match yet.</h3>
              <p>Try a product family like “top-up”, “gift card”, or “subscription”.</p>
              <button onClick={() => { setActiveCategory("All"); setQuery(""); }}>Reset catalog</button>
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
        {cart.length > 0 && <div className="cart-checkout"><p>Cart total: <strong>{formatPrice(cartTotal)}</strong>. Final currency and delivery details are confirmed at checkout.</p><button onClick={checkoutPreview}>Continue to checkout <ArrowRight size={18} /></button></div>}
      </aside>
    </main>
  );
}
