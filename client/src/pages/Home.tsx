/**
 * NaijaPlay / Arcade Exchange design: dark editorial commerce, Signal Lime action states,
 * asymmetrical exchange-board sections, and sharp Barlow Condensed + DM Sans hierarchy.
 */
import { useMemo, useState } from "react";
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
  Laptop,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Ticket,
  Tv,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

type ProductCategory = "Top-up" | "Voucher" | "Subscription" | "Software";

type Product = {
  id: number;
  category: ProductCategory;
  name: string;
  product: string;
  description: string;
  price: string;
  priceNote: string;
  region: string;
  delivery: string;
  image: string;
  tone: string;
  badge: string;
};

const products: Product[] = [
  {
    id: 1,
    category: "Top-up",
    name: "Free Fire",
    product: "530 Diamonds",
    description: "Recharge using your player ID and regional details.",
    price: "₦5,600",
    priceNote: "Select pack",
    region: "Global top-up",
    delivery: "Player ID required",
    image: "/manus-storage/naijaplay-freefire_145b08b0.png",
    tone: "ember",
    badge: "Top-up",
  },
  {
    id: 2,
    category: "Top-up",
    name: "PUBG Mobile",
    product: "660 UC",
    description: "Competitive currency credit for your mobile account.",
    price: "₦9,900",
    priceNote: "Select pack",
    region: "Global top-up",
    delivery: "Player ID required",
    image: "/manus-storage/naijaplay-pubg_fc62cfdf.png",
    tone: "ice",
    badge: "Top-up",
  },
  {
    id: 3,
    category: "Voucher",
    name: "Steam Wallet",
    product: "US $20 Gift Card",
    description: "Digital voucher for your next PC game library pick.",
    price: "₦32,500",
    priceNote: "US region",
    region: "United States",
    delivery: "Digital code",
    image: "/manus-storage/naijaplay-vouchers_77a26ca2.png",
    tone: "lime",
    badge: "Voucher",
  },
  {
    id: 4,
    category: "Subscription",
    name: "ChatGPT Plus",
    product: "1 Month Access",
    description: "A premium AI subscription option for focused work.",
    price: "₦38,000",
    priceNote: "1 month",
    region: "Region listed",
    delivery: "Access format",
    image: "/manus-storage/naijaplay-vouchers_77a26ca2.png",
    tone: "coral",
    badge: "Subscription",
  },
  {
    id: 5,
    category: "Software",
    name: "Microsoft 365",
    product: "Personal · 12 Months",
    description: "Everyday productivity software for work and study.",
    price: "₦80,500",
    priceNote: "12 months",
    region: "Global / listed",
    delivery: "Digital licence",
    image: "/manus-storage/naijaplay-hero_63707a55.png",
    tone: "cobalt",
    badge: "Software",
  },
];

const categories = [
  { label: "Game top-up", icon: Coins, filter: "Top-up" as ProductCategory },
  { label: "Gift cards", icon: Gift, filter: "Voucher" as ProductCategory },
  { label: "Vouchers", icon: Ticket, filter: "Voucher" as ProductCategory },
  { label: "Subscriptions", icon: Tv, filter: "Subscription" as ProductCategory },
  { label: "AI tools", icon: Sparkles, filter: "Subscription" as ProductCategory },
  { label: "Software", icon: Laptop, filter: "Software" as ProductCategory },
];

function Logo() {
  return (
    <a className="brand" href="#top" aria-label="NaijaPlay home">
      <img src="/manus-storage/naijaplay-logo_0a937b1e.png" alt="" />
      <span>Naija<span>Play</span></span>
    </a>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<"All" | ProductCategory>("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch = !normalized || [item.name, item.product, item.category]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, query]);

  const addToCart = (item: Product) => {
    setCart((current) => [...current, item]);
    toast.success(`${item.product} added to your cart`, {
      description: "Choose your delivery details at checkout.",
    });
  };

  const chooseCategory = (category: ProductCategory) => {
    setActiveCategory(category);
    setQuery("");
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCart = () => {
    setCartOpen(true);
    setMobileOpen(false);
  };

  const checkoutPreview = () => {
    toast.message("Checkout setup comes next", {
      description: "Connect your authorized supplier and payment provider before accepting live orders.",
    });
  };

  return (
    <main id="top" className="site-shell">
      <div className="utility-bar">
        <div className="utility-inner">
          <span><Zap size={14} fill="currentColor" /> Digital goods, set in NGN</span>
          <span className="utility-right"><ShieldCheck size={14} /> Secure purchase flow <i /> <Globe2 size={14} /> Nigeria</span>
        </div>
      </div>

      <header className="main-nav">
        <div className="nav-inner">
          <Logo />
          <nav className="desktop-links" aria-label="Main navigation">
            <a href="#products">Shop</a>
            <a href="#categories">Categories <ChevronDown size={14} /></a>
            <a href="#how-it-works">How it works</a>
            <a href="#support">Support</a>
          </nav>
          <div className="nav-actions">
            <label className="compact-search" aria-label="Search product catalog">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search catalog" />
            </label>
            <button className="cart-button" onClick={openCart} aria-label="Open cart">
              <ShoppingBag size={20} />
              <span>Cart</span>
              {cart.length > 0 && <b>{cart.length}</b>}
            </button>
            <button className="menu-button" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle menu">
              {mobileOpen ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="mobile-links" aria-label="Mobile navigation">
            <a href="#products" onClick={() => setMobileOpen(false)}>Shop</a>
            <a href="#categories" onClick={() => setMobileOpen(false)}>Categories</a>
            <a href="#how-it-works" onClick={() => setMobileOpen(false)}>How it works</a>
            <a href="#support" onClick={() => setMobileOpen(false)}>Support</a>
          </nav>
        )}
      </header>

      <section className="hero-section" aria-labelledby="hero-title">
        <img className="hero-image" src="/manus-storage/naijaplay-hero_63707a55.png" alt="Gamer in a dynamic digital arena" />
        <div className="hero-overlay" />
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="eyebrow exchange-eyebrow"><span /> Nigeria’s digital goods exchange <b>NGN // 01</b></div>
          <h1 id="hero-title">YOUR NEXT <em>WIN</em><br />STARTS HERE.</h1>
          <p>Game credit, vouchers, subscriptions and software—arranged for a fast, clear purchase journey in naira.</p>
          <div className="hero-actions">
            <a className="primary-action" href="#products">Explore top picks <ArrowRight size={18} /></a>
            <button className="text-action" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>How it works <ChevronRight size={18} /></button>
          </div>
          <div className="hero-market-line"><span>₦ NGN pricing</span><i /> <span>Region-aware delivery</span><i /> <span>Authorised supply</span></div>
        </div>
        <div className="hero-cue">
          <span>SCROLL TO EXPLORE</span>
          <i />
        </div>
        <div className="hero-counter">
          <span>01</span><i /><span>05</span>
        </div>
      </section>

      <section id="categories" className="category-strip" aria-label="Product categories">
        <div className="section-marker">001 / BROWSE THE EXCHANGE</div>
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

      <section id="products" className="product-section" aria-labelledby="products-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow dark-eyebrow"><span /> Curated for play & progress</div>
            <h2 id="products-title">POPULAR<br /><em>PICKS</em></h2>
          </div>
          <div className="section-heading-right">
            <p>Start with the essentials—game top-ups, global vouchers, work subscriptions, and useful software.</p>
            <button className="all-products-button" onClick={() => { setActiveCategory("All"); setQuery(""); }}>View all products <ArrowRight size={17} /></button>
          </div>
        </div>

        <div className="filter-row" aria-label="Filter product list">
          {(["All", "Top-up", "Voucher", "Subscription", "Software"] as const).map((filter) => (
            <button key={filter} onClick={() => setActiveCategory(filter)} className={activeCategory === filter ? "filter-chip active" : "filter-chip"}>
              {filter === "All" ? "All picks" : filter}
            </button>
          ))}
          <label className="mobile-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a product" />
          </label>
        </div>

        <div className="product-grid">
          {filteredProducts.map((item, index) => (
            <article className={`product-card tone-${item.tone}`} key={item.id} style={{ animationDelay: `${index * 45}ms` }}>
              <div className="product-image-wrap">
                <img src={item.image} alt="" />
                <span className="product-badge ticket-chip">{item.badge}</span>
                <span className="play-frame" aria-hidden="true" />
                <span className="corner-mark">NGN</span>
              </div>
              <div className="product-content">
                <p className="product-name">{item.name}</p>
                <h3>{item.product}</h3>
                <div className="market-tags"><span>{item.region}</span><span>{item.delivery}</span></div>
                <p className="product-description">{item.description}</p>
                <div className="product-buy-row">
                  <div><strong>{item.price}</strong><small>{item.priceNote}</small></div>
                  <button onClick={() => addToCart(item)} aria-label={`Add ${item.name} ${item.product} to cart`}><ShoppingBag size={18} /><span>Add</span></button>
                </div>
              </div>
            </article>
          ))}
          {filteredProducts.length === 0 && (
            <div className="empty-results">
              <Search size={28} />
              <h3>No quick match yet.</h3>
              <p>Try a product family like “top-up”, “voucher”, or “software”.</p>
              <button onClick={() => { setActiveCategory("All"); setQuery(""); }}>Reset catalog</button>
            </div>
          )}
        </div>
        <p className="catalog-note"><CircleDollarSign size={16} /> <strong>NAIJAPLAY MARKET NOTE:</strong> Display prices are configured as NGN catalog rates. Confirm current supplier pricing and delivery rules before live fulfilment.</p>
      </section>

      <section className="promo-band" aria-label="Why buy from NaijaPlay">
        <div className="promo-arrow"><ArrowRight /></div>
        <div className="promo-text"><span>Top up faster. Gift bigger. Work smarter.</span> <b>Top up faster. Gift bigger. Work smarter.</b></div>
      </section>

      <section id="how-it-works" className="process-section" aria-labelledby="process-title">
        <div className="process-intro">
          <div className="section-marker">002 / SIMPLE BY DESIGN</div>
          <h2 id="process-title">THE SMART<br />WAY TO <em>LOAD UP.</em></h2>
          <p>A dependable digital-goods storefront depends on clear choices, good information, and a checkout that knows exactly what every product needs.</p>
          <a href="#products">Choose your product <ArrowRight size={18} /></a>
        </div>
        <div className="steps-list">
          <article className="step-item">
            <span>01</span>
            <div><h3>Pick your product</h3><p>Browse game credit, digital vouchers, subscriptions, and software from one catalog.</p></div>
            <Gamepad2 size={29} />
          </article>
          <article className="step-item">
            <span>02</span>
            <div><h3>Share the right details</h3><p>For top-ups, enter the player ID or account information the selected product requires.</p></div>
            <Smartphone size={29} />
          </article>
          <article className="step-item">
            <span>03</span>
            <div><h3>Complete your purchase</h3><p>Checkout captures the destination, region, and delivery format before submitting an order.</p></div>
            <ShieldCheck size={29} />
          </article>
        </div>
      </section>

      <section className="trust-section" aria-label="Service principles">
        <div className="trust-card trust-dark">
          <ShieldCheck size={27} />
          <span className="trust-ticket">NGN / CLARITY</span>
          <h3>NGN clarity, upfront</h3>
          <p>See naira pricing, region guidance, and the delivery details your selected product needs before you proceed.</p>
        </div>
        <div className="trust-card trust-lime">
          <Zap size={27} fill="currentColor" />
          <span className="trust-ticket">LOAD / PLAY</span>
          <h3>Made for the moments that matter</h3>
          <p>From a match-night recharge to software for Monday morning, find digital essentials in one place.</p>
        </div>
        <div className="trust-card trust-coral">
          <Headphones size={27} />
          <span className="trust-ticket">SUPPLIER / READY</span>
          <h3>Supplier-aware delivery</h3>
          <p>Route codes, licences, account access, and player top-ups through product-specific delivery guidance.</p>
        </div>
      </section>

      <section id="support" className="support-cta">
        <div className="terminal-stack" aria-hidden="true"><i /><i /><i /></div>
        <div className="section-marker">003 / KEEP THE GOOD STUFF CLOSE</div>
        <h2>YOUR DIGITAL<br /><em>ADVANTAGE,</em><br />ON DEMAND.</h2>
        <p><b>NAIJA / NGN / READY</b><br />New drops, voucher categories, and gaming essentials belong in one sharp, easy-to-search marketplace.</p>
        <button onClick={() => toast.message("Account access is ready to connect", { description: "Add customer authentication when you are ready to launch live orders." })}>Create an account <ArrowRight size={18} /></button>
      </section>

      <footer>
        <div className="footer-top">
          <Logo />
          <p>Digital goods for game time, life admin, and everything in between.</p>
          <div className="footer-links">
            <a href="#products">Shop</a><a href="#categories">Categories</a><a href="#how-it-works">How it works</a><a href="#support">Help center</a>
          </div>
        </div>
        <div className="footer-bottom"><span>© 2026 NaijaPlay. A digital-goods marketplace concept.</span><span>Powered by authorised suppliers.</span></div>
      </footer>

      <div className={cartOpen ? "cart-overlay open" : "cart-overlay"} onClick={() => setCartOpen(false)} />
      <aside className={cartOpen ? "cart-drawer open" : "cart-drawer"} aria-label="Shopping cart" aria-hidden={!cartOpen}>
        <div className="cart-drawer-head"><div><span className="section-marker">YOUR SELECTION</span><h2>Cart <em>({cart.length})</em></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={22} /></button></div>
        <div className="cart-items">
          {cart.length === 0 ? <div className="cart-empty"><ShoppingBag size={35} /><h3>Your cart is clear.</h3><p>Pick a digital product and it will appear here.</p><button onClick={() => { setCartOpen(false); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}>Browse products</button></div> : cart.map((item, index) => (
            <div className="cart-item" key={`${item.id}-${index}`}><img src={item.image} alt="" /><div><span>{item.name}</span><strong>{item.product}</strong><small>{item.price}</small></div><button onClick={() => setCart((current) => current.filter((_, i) => i !== index))} aria-label={`Remove ${item.product}`}><X size={16} /></button></div>
          ))}
        </div>
        {cart.length > 0 && <div className="cart-checkout"><p>Final pricing and delivery details are confirmed at checkout.</p><button onClick={checkoutPreview}>Continue to checkout <ArrowRight size={18} /></button></div>}
      </aside>
    </main>
  );
}
