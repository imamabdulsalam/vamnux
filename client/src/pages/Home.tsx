/**
 * VAMNUX Global Exchange: a clean marketplace header, USD-first price display,
 * technology-led colour rotation, and compact transactional product information.
 */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import SelectedProductBrowser from "@/components/SelectedProductBrowser";
import FooterNavigation from "@/components/FooterNavigation";
import { createFulfillmentFieldKey, groupLiveProductFamilies } from "@shared/marketplace";
import { digitalProductPath, gameFamilyPath } from "@shared/catalogRoutes";
import { filterGameFamiliesForScope, filterPrimaryMarketProducts } from "@shared/catalogVisibility";
import { categoryQuickLinks, interleaveTopUpFamilies } from "@shared/compactCatalog";
import { productMatchesKeyword, toLiveCatalogProduct, type LiveCatalogProduct, type ProductCategory } from "@/lib/liveCatalog";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Coins,
  Facebook,
  Gamepad2,
  Gift,
  Globe2,
  Headphones,
  Heart,
  Instagram,
  Laptop,
  Linkedin,
  Search,
  Send,
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
    kicker: "01 / DIGITAL MARKETPLACE",
    title: "CLEAR CHOICES.\nREADY TO BROWSE.",
    emphasis: "READY TO BROWSE.",
    description: "Explore VAMNUX categories with product details, requirements, and final prices kept easy to understand.",
    cta: "Browse marketplace",
    category: "Top-up" as ProductCategory,
    metric: "Discover",
    note: "Digital products in one focused marketplace.",
  },
  {
    key: "jade",
    kicker: "02 / PRODUCT CLARITY",
    title: "KNOW BEFORE\nYOU SELECT.",
    emphasis: "YOU SELECT.",
    description: "See the information that matters—region guidance, account requirements, format, and final payable price.",
    cta: "View top-ups",
    category: "Top-up" as ProductCategory,
    metric: "Details",
    note: "Requirements stay close to each listing.",
  },
  {
    key: "ember",
    kicker: "03 / CATEGORIES",
    title: "FIND YOUR\nDIGITAL PICK.",
    emphasis: "DIGITAL PICK.",
    description: "Move directly from category browsing to the products currently available in that part of VAMNUX.",
    cta: "Explore categories",
    category: "Top-up" as ProductCategory,
    metric: "Categories",
    note: "Browse only active marketplace categories.",
  },
  {
    key: "violet",
    kicker: "04 / WALLET-FIRST",
    title: "YOUR ACCOUNT.\nONE PLACE.",
    emphasis: "ONE PLACE.",
    description: "Your dashboard keeps wallet activity, orders, saved products, account settings, and support within reach.",
    cta: "Browse VAMNUX",
    category: "Top-up" as ProductCategory,
    metric: "Account",
    note: "A focused view of your VAMNUX activity.",
  },
  {
    key: "jade",
    kicker: "05 / SUPPORT",
    title: "GUIDANCE WHEN\nYOU NEED IT.",
    emphasis: "YOU NEED IT.",
    description: "Product-specific guidance and a protected support path help keep your VAMNUX journey straightforward.",
    cta: "Explore VAMNUX",
    category: "Top-up" as ProductCategory,
    metric: "Support",
    note: "Help options are available from your account.",
  },
  {
    key: "ember",
    kicker: "06 / AVAILABLE NOW",
    title: "LIVE CATEGORIES.\nREAL OPTIONS.",
    emphasis: "REAL OPTIONS.",
    description: "VAMNUX only shows categories and products that are active for customer discovery at the moment you browse.",
    cta: "See available products",
    category: "Subscription" as ProductCategory,
    metric: "Availability",
    note: "Active categories update with marketplace settings.",
  },
  {
    key: "violet",
    kicker: "07 / REVIEW-READY",
    title: "FEEDBACK THAT\nCAN BE VERIFIED.",
    emphasis: "CAN BE VERIFIED.",
    description: "Verified customer feedback can appear here after it is approved. VAMNUX does not invent reviews or identities.",
    cta: "Explore VAMNUX",
    category: "Top-up" as ProductCategory,
    metric: "Feedback",
    note: "Approved customer feedback appears here when available.",
  },
];

const productCategories: ProductCategory[] = ["Top-up", "Voucher", "Subscription", "Software", "AI tools", "Steam", "Telegram Stars"];
function isProductCategory(value: unknown): value is ProductCategory { return typeof value === "string" && productCategories.includes(value as ProductCategory); }

const categories = [
  { slug: "game-top-up", label: "Game top-up", icon: Coins, filter: "Top-up" as ProductCategory },
  { slug: "gift-cards", label: "Gift cards", icon: Gift, filter: "Voucher" as ProductCategory },
  { slug: "subscriptions", label: "Subscriptions", icon: Tv, filter: "Subscription" as ProductCategory },
  { slug: "software", label: "Software", icon: Laptop, filter: "Software" as ProductCategory },
  { slug: "ai-tools", label: "AI tools", icon: Sparkles, filter: "AI tools" as ProductCategory },
  { slug: "steam", label: "Steam", icon: Gamepad2, filter: "Steam" as ProductCategory },
  { slug: "telegram-stars", label: "Telegram Stars", icon: Send, filter: "Telegram Stars" as ProductCategory },
];

const unavailableCategoryDescriptions: Record<Exclude<ProductCategory, "Top-up">, string> = {
  Voucher: "Gift Card products will appear here after VAMNUX connects an authorised supplier with live codes and regional pricing.",
  Subscription: "Subscription services are planned for this category and will appear after an approved supplier is connected.",
  Software: "Software licences will appear here after VAMNUX connects an authorised software supplier.",
  "AI tools": "AI tool subscriptions and licences will appear here after an authorised catalog source is connected.",
  Steam: "Global Steam offers will appear here when an authorised supplier exposes an eligible product.",
  "Telegram Stars": "Telegram Stars will appear here when an authorised supplier exposes an eligible denomination.",
};

function DigitalProductIcon({ category }: { category: ProductCategory }) {
  if (category === "Voucher") return <Gift size={28} />;
  if (category === "Subscription") return <Tv size={28} />;
  if (category === "Software") return <Laptop size={28} />;
  if (category === "Steam") return <Gamepad2 size={28} />;
  if (category === "Telegram Stars") return <Send size={28} />;
  return <Sparkles size={28} />;
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
  const publicCategories = trpc.marketplace.categories.useQuery(undefined, { refetchInterval: 15_000, refetchOnWindowFocus: true });
  const publishedContentBlocks = trpc.marketplace.siteContentBlocks.useQuery();
  const customerDashboard = trpc.marketplace.customerDashboard.useQuery(undefined, { enabled: isAuthenticated });

  const [activeCategory, setActiveCategory] = useState<"All" | ProductCategory>("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [activeSlide, setActiveSlide] = useState(0);
  const [openMegaCategory, setOpenMegaCategory] = useState<ProductCategory | null>(null);
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

  const carouselSlides = useMemo(() => {
    const heroBlocks = (publishedContentBlocks.data ?? []).filter((block) => block.blockType === "hero_slide");
    const validSlides = heroBlocks.map((block, index) => {
      const content = block.content && typeof block.content === "object" && !Array.isArray(block.content) ? block.content as Record<string, unknown> : {};
      const category = isProductCategory(content.category) ? content.category : "Top-up" as ProductCategory;
      const headline = typeof content.headline === "string" ? content.headline.trim() : typeof content.title === "string" ? content.title.trim() : block.title?.trim() || "";
      const [titleLine = "", emphasis = ""] = headline.split("\n");
      const description = typeof content.description === "string" ? content.description.trim() : "";
      if (!titleLine || !description) return null;
      return {
        key: ["violet", "jade", "ember"][index % 3],
        kicker: typeof content.kicker === "string" ? content.kicker.trim() : `VAMNUX / ${category.toUpperCase()}`,
        title: headline,
        emphasis: emphasis || titleLine,
        description,
        cta: block.ctaLabel || (typeof content.cta === "string" ? content.cta : "Explore now"),
        category,
        metric: typeof content.metric === "string" ? content.metric : category,
        note: typeof content.note === "string" ? content.note : "VAMNUX marketplace selection.",
      };
    }).filter((slide): slide is NonNullable<typeof slide> => Boolean(slide));
    return validSlides.length >= 5 ? validSlides.slice(0, 7) : slides;
  }, [publishedContentBlocks.data]);

  useEffect(() => {
    setActiveSlide((current) => current % carouselSlides.length);
    const interval = window.setInterval(() => setActiveSlide((current) => (current + 1) % carouselSlides.length), 5200);
    return () => window.clearInterval(interval);
  }, [carouselSlides.length]);

  const formatPrice = (basePrice: number) => {
    const config = currencies[currency];
    return new Intl.NumberFormat(config.locale, { style: "currency", currency, maximumFractionDigits: currency === "NGN" ? 0 : 2 }).format(basePrice * config.rate);
  };

  const liveProducts = useMemo<Product[]>(() => (supplierCatalog.data ?? []).map(toLiveCatalogProduct), [supplierCatalog.data]);

  const publicProducts = useMemo(() => filterPrimaryMarketProducts(liveProducts), [liveProducts]);
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return publicProducts.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch = productMatchesKeyword(item, normalized);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, publicProducts, query]);

  const visibleCategories = useMemo(() => {
    if (!publicCategories.data) return [];
    const visibleSlugs = new Set(publicCategories.data.map((category) => category.slug));
    return categories.filter((category) => visibleSlugs.has(category.slug));
  }, [publicCategories.data]);
  const selectedCategory = visibleCategories.find((category) => category.filter === activeCategory);

  useEffect(() => {
    if (activeCategory !== "All" && !visibleCategories.some((category) => category.filter === activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, visibleCategories]);

  const cartTotal = useMemo(() => cart.reduce((total, item) => total + item.price, 0), [cart]);
  const gameProducts = useMemo(() => filteredProducts.filter((product) => product.category === "Top-up"), [filteredProducts]);
  const allProductFamilies = useMemo(() => groupLiveProductFamilies(gameProducts), [gameProducts]);
  const productFamilies = useMemo(() => filterGameFamiliesForScope(allProductFamilies, "curated"), [allProductFamilies]);
  const internalGameFamilies = useMemo(() => groupLiveProductFamilies(publicProducts.filter((product) => product.category === "Top-up")), [publicProducts]);
  const compactProducts = useMemo(() => {
    const sortForRecognition = (products: Product[]) => [...products].sort((left, right) => {
      const topUpRank = (product: Product) => {
        if (product.category !== "Top-up") return 3;
        const name = product.name.toLowerCase();
        if (/free fire|pubg mobile|mobile legends/.test(name)) return 0;
        return 1;
      };
      const categoryDifference = topUpRank(left) - topUpRank(right);
      if (categoryDifference !== 0) return categoryDifference;
      return left.name.localeCompare(right.name) || left.product.localeCompare(right.product);
    });
    const curatedTopUpNames = new Set(productFamilies.map((family) => family.name.toLowerCase()));
    return interleaveTopUpFamilies(sortForRecognition(filteredProducts.filter((product) => product.category !== "Top-up" || curatedTopUpNames.has(product.name.toLowerCase()))));
  }, [filteredProducts, productFamilies]);
  const catalogQuickLinks = useMemo(() => new Map(visibleCategories.map(({ filter }) => [filter, categoryQuickLinks(publicProducts, filter, 6)])), [publicProducts, visibleCategories]);

  const addToCart = (item: Product) => {
    setCart((current) => [...current, item]);
    toast.success(`${item.product} added to your cart`, {
      description: `${formatPrice(item.price)} shown in ${currency}. VAMNUX products use wallet-only purchase; no direct payment is offered.`,
    });
  };

  const chooseCategory = (category: ProductCategory) => {
    setActiveCategory(category);
    setQuery("");
    setOpenMegaCategory(null);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const chooseQuickLink = (category: ProductCategory, label: string) => {
    setActiveCategory(category);
    setQuery(label);
    setOpenMegaCategory(null);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCompactProduct = (product: Product) => {
    setLocation(product.category === "Top-up" ? gameFamilyPath(product.name) : digitalProductPath(product.slug));
  };

  const openCart = () => setCartOpen(true);

  const checkoutPreview = () => {
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

  const openAccount = () => {
    if (loading) return;
    if (!isAuthenticated) {
      toast.message("Sign in to access VAMNUX", { description: "Use an account to view orders, wallet activity, saved products, and support." });
      setLocation("/login");
      return;
    }
    setLocation("/account");
  };

  const openFooterCatalog = (category: "All" | ProductCategory) => {
    setActiveCategory(category);
    setQuery("");
    requestAnimationFrame(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const showFooterUnavailable = (label: string, description = "This VAMNUX destination is being prepared.") => {
    toast.message(`${label} is not available yet`, { description });
  };

  const handleCurrencyChange = (next: CurrencyCode) => {
    setCurrency(next);
    toast.message(`Prices now display in ${next}`, { description: "This storefront preview uses USD as the base price. Live checkout should confirm final FX and currency availability." });
  };

  const slide = carouselSlides[activeSlide] ?? carouselSlides[0];

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
            <div className="header-socials" aria-label="VAMNUX social channels">
              <button type="button" className="header-social-button" onClick={() => toast.message("VAMNUX social channel links are awaiting the official account URLs.")} aria-label="VAMNUX on Instagram" title="Instagram"><Instagram size={17} /></button>
              <button type="button" className="header-social-button" onClick={() => toast.message("VAMNUX social channel links are awaiting the official account URLs.")} aria-label="VAMNUX on Facebook" title="Facebook"><Facebook size={17} /></button>
              <button type="button" className="header-social-button" onClick={() => toast.message("VAMNUX social channel links are awaiting the official account URLs.")} aria-label="VAMNUX on LinkedIn" title="LinkedIn"><Linkedin size={17} /></button>
              <button type="button" className="header-social-button" onClick={() => toast.message("VAMNUX social channel links are awaiting the official account URLs.")} aria-label="VAMNUX on Telegram" title="Telegram"><Send size={17} /></button>
            </div>
            <label className="currency-switcher" title="Change display currency">
              <Globe2 size={17} />
              <select value={currency} onChange={(event) => handleCurrencyChange(event.target.value as CurrencyCode)} aria-label="Display currency">
                {Object.entries(currencies).map(([code, details]) => <option key={code} value={code}>{details.label}</option>)}
              </select>
            </label>
            {isAuthenticated ? <button className="header-icon" onClick={openAccount} aria-label="Open account"><UserRound size={20} /><span>Account</span></button> : <div className="header-auth-actions"><button className="header-signin" type="button" onClick={() => setLocation("/login")}>Sign in</button><button className="header-create-account" type="button" onClick={() => setLocation("/login")}>Create account</button></div>}
            <button className="header-icon favourite-button" onClick={() => toast.message("Favourites are ready to connect", { description: "Add customer accounts to save products between visits." })} aria-label="Favourites"><Heart size={20} /></button>
            <button className="header-cart" onClick={openCart} aria-label="Open cart"><ShoppingBag size={21} /><span>Cart</span>{cart.length > 0 && <b>{cart.length}</b>}</button>
          </div>
        </div>
        <nav className="commerce-categories compact-category-nav" aria-label="Marketplace categories">
          {visibleCategories.map(({ label, icon: Icon, filter }) => {
            const links = catalogQuickLinks.get(filter) ?? [];
            const isOpen = openMegaCategory === filter;
            return <div className="compact-category-menu" key={filter} onMouseEnter={() => setOpenMegaCategory(filter)}>
              <button type="button" aria-expanded={isOpen} aria-controls={`category-panel-${filter}`} onClick={() => setOpenMegaCategory((current) => current === filter ? null : filter)}><Icon size={18} /> {label} <ChevronDown className={isOpen ? "menu-chevron open" : "menu-chevron"} size={14} /></button>
              <div className="category-mega-panel" id={`category-panel-${filter}`} data-open={isOpen}>
                <div className="category-mega-heading"><span><Icon size={17} /> {label}</span><button type="button" onClick={() => chooseCategory(filter)}>Browse category <ArrowRight size={14} /></button></div>
                {links.length > 0 ? <div className="category-mega-links">{links.map((link) => <button type="button" key={link} onClick={() => chooseQuickLink(filter, link)}>{link}</button>)}</div> : <p>Nothing verified for this category yet. VAMNUX shows supplier inventory only after it is synchronised and active.</p>}
              </div>
            </div>;
          })}
          <button className="compact-all-categories" type="button" onClick={() => { setActiveCategory("All"); setQuery(""); setOpenMegaCategory(null); document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><Search size={17} /> All catalog</button>
          <span className="scope-status"><ShieldCheck size={16} /> Verified supplier inventory</span>
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
              <button onClick={() => chooseCategory("Top-up")} className="carousel-secondary">Browse catalogue <ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="carousel-terminal" aria-hidden="true">
            <div className="terminal-top"><span>VAMNUX // MARKET VIEW</span><i /></div>
            <div className="terminal-price"><strong>{slide.metric}</strong><span>{slide.note}</span></div>
            <div className="terminal-bars"><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="terminal-bottom"><span>READY</span><span>{String(activeSlide + 1).padStart(2, "0")} / {String(carouselSlides.length).padStart(2, "0")}</span></div>
          </div>
          <div className="carousel-controls" aria-label="Carousel slides">
            {carouselSlides.map((item, index) => <button key={`${item.key}-${index}`} onClick={() => setActiveSlide(index)} aria-label={`Show ${item.kicker}`} className={activeSlide === index ? "active" : ""}>{String(index + 1).padStart(2, "0")}</button>)}
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
        <div className="category-browser-heading">
          <div>
            <p className="global-section-label">BROWSE / DIGITAL CATEGORIES</p>
            <h2>Everything digital,<br /><em>one clear place.</em></h2>
          </div>
          <p>Choose a category to see its available VAMNUX products, prices, and requirements.</p>
        </div>
        <div className="category-list category-browser-grid">
          {visibleCategories.map(({ label, icon: Icon, filter }) => {
            const productCount = publicProducts.filter((product) => product.category === filter).length;
            return (
            <button key={label} onClick={() => chooseCategory(filter)} className="category-button category-browser-card">
              <span className="category-browser-icon"><Icon size={20} strokeWidth={1.9} /></span>
              <span className="category-browser-copy"><strong>{label}</strong><small>{productCount > 0 ? `${productCount} available ${productCount === 1 ? "product" : "products"}` : "Explore this category"}</small></span>
              <ArrowRight className="category-browser-arrow" size={17} />
            </button>
            );
          })}
        </div>
      </section>

      <section className="supplier-recognition" aria-labelledby="supplier-recognition-title">
        <div className="supplier-recognition-head">
          <div><p className="eyebrow"><span /> VAMNUX game catalogue</p><h2 id="supplier-recognition-title">PLAYABLE<br /><em>GAME FAMILIES.</em></h2></div>
          <p>Choose a game that is already active on VAMNUX. Each card stays within VAMNUX and opens its real supplier-backed denominations, account requirements, and VAMNUX display prices.</p>
        </div>
        <div className="supplier-game-grid">
          {internalGameFamilies.map((game) => <button key={game.name} type="button" className="supplier-game-card" onClick={() => setLocation(gameFamilyPath(game.name))} title={`View ${game.name} on VAMNUX`}>{game.image ? <img src={game.image} alt={`${game.name} game artwork`} loading="lazy" /> : <span className="supplier-game-fallback">{game.name.slice(0, 1)}</span>}<div><span>View on VAMNUX</span><strong>{game.name}</strong></div></button>)}
        </div>
      </section>

      <section id="products" className="product-section global-product-section" aria-labelledby="products-title">
        <div className="section-heading compact-catalog-heading">
          <div>
            <div className="eyebrow dark-eyebrow"><span /> Curated VAMNUX inventory</div>
            <h2 id="products-title">FIND YOUR<br /><em>DIGITAL PICK.</em></h2>
          </div>
          <div className="section-heading-right">
            <p>Search or use a category menu to go straight to real supplier products. Each compact card keeps region, USD-based price, details, and draft-only add-to-cart action within reach.</p>
            <button className="all-products-button" onClick={() => { setActiveCategory("All"); setQuery(""); }}>Browse VAMNUX products <ArrowRight size={17} /></button>
          </div>
        </div>

        <div className="filter-row" aria-label="Filter product list">
          {(["All", ...visibleCategories.map((category) => category.filter)] as Array<"All" | ProductCategory>).map((filter) => (
            <button key={filter} onClick={() => setActiveCategory(filter)} className={activeCategory === filter ? "filter-chip active" : "filter-chip"}>
              {filter === "All" ? "All picks" : filter}
            </button>
          ))}
          <span className="price-display-note">Prices shown in <strong>{currency}</strong></span>
        </div>

        <div className="catalog-keyword-search" aria-label="Search live game listings">
          <div><Search size={21} /><label htmlFor="compact-catalog-search">Find your game or service</label></div>
          <div className="catalog-keyword-input"><input id="compact-catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try PUBG, Free Fire, diamonds, UC, Valorant…" /><button onClick={() => setQuery("")} disabled={!query} aria-label="Clear catalog search"><X size={17} /></button></div>
          <p>{query.trim() ? `${compactProducts.length} live ${compactProducts.length === 1 ? "product" : "products"} match “${query.trim()}”` : "Search by game, gift card, subscription, software, region, or Player ID requirement."}</p>
        </div>

        <div className="product-family-list compact-catalog-results">
          {supplierCatalog.isLoading && <div className="empty-results"><Search size={28} /><h3>Loading verified supplier products…</h3><p>VAMNUX is retrieving active availability from configured suppliers.</p></div>}
          {supplierCatalog.error && <div className="empty-results"><ShieldCheck size={28} /><h3>Supplier catalog is temporarily unavailable.</h3><p>Try again shortly. No payment or order attempt has been made.</p></div>}
          {!supplierCatalog.isLoading && !supplierCatalog.error && compactProducts.length > 0 && <SelectedProductBrowser products={compactProducts} formatPrice={formatPrice} onOpenProduct={openCompactProduct} onAddToCart={addToCart} />}
          {!supplierCatalog.isLoading && !supplierCatalog.error && compactProducts.length === 0 && (
            <div className="empty-results">
              <Search size={28} />
              {activeCategory !== "All" && activeCategory !== "Top-up" ? <>
                <h3>{selectedCategory?.label ?? activeCategory} are planned.</h3>
                <p>{unavailableCategoryDescriptions[activeCategory]}</p>
                <button onClick={() => { setActiveCategory("All"); setQuery(""); }}>Browse live inventory</button>
              </> : <>
                <h3>No live match yet.</h3>
                <p>{query.trim() ? `No active VAMNUX service matches “${query.trim()}”. Try a game name, denomination, region, or requirement.` : "Try a game family or denomination. VAMNUX shows only active synchronised services and never redirects customers to a supplier catalogue."}</p>
                <button onClick={() => { setActiveCategory("All"); setQuery(""); }}>Reset catalog</button>
              </>}
            </div>
          )}
        </div>
          <p className="catalog-note"><CircleDollarSign size={16} /> <strong>VAMNUX SUPPLIER NOTE:</strong> Listings are synchronised from configured suppliers. Display conversion is informational only; customer payment, wallet funding, and supplier fulfilment remain inactive.</p>
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

      <FooterNavigation />

      <div className={cartOpen ? "cart-overlay open" : "cart-overlay"} onClick={() => setCartOpen(false)} />
      <aside className={cartOpen ? "cart-drawer open" : "cart-drawer"} aria-label="Shopping cart" aria-hidden={!cartOpen}>
        <div className="cart-drawer-head"><div><span className="section-marker">YOUR SELECTION</span><h2>Cart <em>({cart.length})</em></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={22} /></button></div>
        <div className="cart-items">
          {cart.length === 0 ? <div className="cart-empty"><ShoppingBag size={35} /><h3>Your cart is clear.</h3><p>Pick a digital product and it will appear here.</p><button onClick={() => { setCartOpen(false); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}>Browse products</button></div> : cart.map((item, index) => (
            <div className="cart-item" key={`${item.id}-${index}`}>{item.image ? <img src={item.image} alt="" /> : <span className="cart-item-fallback">{item.name.slice(0, 1)}</span>}<div><span>{item.name}</span><strong>{item.product}</strong><small>{formatPrice(item.price)}</small></div><button onClick={() => setCart((current) => current.filter((_, i) => i !== index))} aria-label={`Remove ${item.product}`}><X size={16} /></button></div>
          ))}
        </div>
        {cart.length > 0 && <div className="cart-checkout"><p>Cart total: <strong>{formatPrice(cartTotal)}</strong>. VAMNUX products are wallet-only: this USD order requires sufficient settled USD wallet balance. {isAuthenticated ? <><br />Your current wallet: <strong>{customerDashboard.data ? `${customerDashboard.data.wallet.currency} ${Number(customerDashboard.data.wallet.availableBalance).toFixed(2)}` : "Loading wallet…"}</strong>.</> : " Sign in to check your wallet balance."} No direct product payment is offered.</p><div className="cart-fulfillment-fields">{cart.flatMap((item, itemIndex) => item.inputRequirements.map((field) => {
          const fieldKey = createFulfillmentFieldKey(item.id, field.key);
          return <label key={`${fieldKey}-${itemIndex}`}><span>{item.name} · {field.label}{field.required ? " *" : ""}</span><input type={field.type === "email" ? "email" : "text"} value={fulfillmentDetails[fieldKey] ?? ""} onChange={(event) => setFulfillmentDetails((current) => ({ ...current, [fieldKey]: event.target.value }))} placeholder={field.helperText || field.label} required={field.required} /></label>;
        }))}</div><button onClick={checkoutPreview} disabled={createDraftOrder.isPending}>{createDraftOrder.isPending ? "Checking wallet…" : "Check wallet eligibility"} <ArrowRight size={18} /></button></div>}
      </aside>
    </main>
  );
}
