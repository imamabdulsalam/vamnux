/**
 * VAMNUX Global Exchange: a clean marketplace header, USD-first price display,
 * technology-led colour rotation, and compact transactional product information.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import SelectedProductBrowser from "@/components/SelectedProductBrowser";
import FooterNavigation from "@/components/FooterNavigation";
import UniversalMarketplaceSearch from "@/components/UniversalMarketplaceSearch";
import "./lowerStorefront.css";
import "./mobileCategoryMenu.css";
import "./gamesPlatformBrowser.css";
import { createFulfillmentFieldKey, groupLiveProductFamilies } from "@shared/marketplace";
import { digitalProductPath, gameFamilyPath } from "@shared/catalogRoutes";
import { filterGameFamiliesForScope } from "@shared/catalogVisibility";
import { categoryQuickLinks, interleaveTopUpFamilies } from "@shared/compactCatalog";
import { GAMES_PLATFORM_SUBCATEGORIES, type GamesPlatformCode } from "@shared/gamesPlatformCategories";
import { TOP_UP_SUBCATEGORIES, type TopUpSubcategoryCode } from "@shared/topUpSubcategories";
import { toLiveCatalogProduct, type LiveCatalogProduct, type ProductCategory } from "@/lib/liveCatalog";
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

const catalogCategoryForFilter: Partial<Record<ProductCategory, "top_up" | "gift_card" | "game_key" | "subscription" | "software" | "ai_tool" | "steam" | "steam_top_up" | "telegram_stars">> = {
  "Top-up": "top_up",
  "Gift cards": "gift_card",
  "Subscription": "subscription",
  "Software": "software",
  "AI tools": "ai_tool",
  "Games": "steam",
  "Steam Top-Up": "steam_top_up",
  "Telegram Stars": "telegram_stars",
};

const gamesPlatformFilters = GAMES_PLATFORM_SUBCATEGORIES;
type GamesPlatformFilter = GamesPlatformCode;
const topUpSubcategoryFilters = TOP_UP_SUBCATEGORIES;
type TopUpSubcategoryFilter = TopUpSubcategoryCode;

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

const productCategories: ProductCategory[] = ["Top-up", "Gift cards", "Subscription", "Software", "AI tools", "Games", "Steam Top-Up", "Telegram Stars"];
function isProductCategory(value: unknown): value is ProductCategory { return typeof value === "string" && productCategories.includes(value as ProductCategory); }

const categories = [
  { slug: "game-top-up", label: "Game top-up", icon: Coins, filter: "Top-up" as ProductCategory },
  { slug: "gift-cards", label: "Gift cards", icon: Gift, filter: "Gift cards" as ProductCategory },
  { slug: "subscriptions", label: "Subscriptions", icon: Tv, filter: "Subscription" as ProductCategory },
  { slug: "software", label: "Software", icon: Laptop, filter: "Software" as ProductCategory },
  { slug: "ai-tools", label: "AI tools", icon: Sparkles, filter: "AI tools" as ProductCategory },
  { slug: "games", label: "Games", icon: Gamepad2, filter: "Games" as ProductCategory },
  { slug: "steam-top-up", label: "Steam Top-Up", icon: Gamepad2, filter: "Steam Top-Up" as ProductCategory },
  { slug: "telegram-stars", label: "Telegram Stars", icon: Send, filter: "Telegram Stars" as ProductCategory },
];

const unavailableCategoryDescriptions: Record<Exclude<ProductCategory, "Top-up">, string> = {
  "Gift cards": "Gift Card products will appear here after VAMNUX connects an authorised supplier with live codes and regional pricing.",
  Subscription: "Subscription services are planned for this category and will appear after an approved supplier is connected.",
  Software: "Software licences will appear here after VAMNUX connects an authorised software supplier.",
  "AI tools": "AI tool subscriptions and licences will appear here after an authorised catalog source is connected.",
  Games: "Game keys and digital game products will appear here when an authorised supplier exposes an eligible product.",
  "Steam Top-Up": "Steam Top-Up services will appear here when an authorised supplier exposes an eligible service.",
  "Telegram Stars": "Telegram Stars will appear here when an authorised supplier exposes an eligible denomination.",
};

function DigitalProductIcon({ category }: { category: ProductCategory }) {
  if (category === "Gift cards") return <Gift size={28} />;
  if (category === "Subscription") return <Tv size={28} />;
  if (category === "Software") return <Laptop size={28} />;
  if (category === "Games" || category === "Steam Top-Up") return <Gamepad2 size={28} />;
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
  const [location, setLocation] = useLocation();
  const publicCategories = trpc.marketplace.categories.useQuery(undefined, { refetchInterval: 15_000, refetchOnWindowFocus: true });
  const publishedContentBlocks = trpc.marketplace.siteContentBlocks.useQuery();
  const customerDashboard = trpc.marketplace.customerDashboard.useQuery(undefined, { enabled: isAuthenticated });

  const [activeCategory, setActiveCategory] = useState<"All" | ProductCategory>("All");
  const [activeGamesPlatform, setActiveGamesPlatform] = useState<GamesPlatformFilter>("all");
  const [activeTopUpMode, setActiveTopUpMode] = useState<TopUpSubcategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [catalogSearchTerm, setCatalogSearchTerm] = useState("");
  const [cart, setCart] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [activeSlide, setActiveSlide] = useState(0);
  const [openMegaCategory, setOpenMegaCategory] = useState<ProductCategory | null>(null);
  const [mobileCategoryMenuOpen, setMobileCategoryMenuOpen] = useState(false);
  const [fulfillmentDetails, setFulfillmentDetails] = useState<Record<string, string>>({});
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const catalogSearchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cart") === "open") setCartOpen(true);
    const receiveCurrency = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (["USD", "EUR", "GBP", "NGN"].includes(next)) setCurrency(next as CurrencyCode);
    };
    window.addEventListener("vamnux:display-currency", receiveCurrency);
    return () => window.removeEventListener("vamnux:display-currency", receiveCurrency);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setCatalogSearchTerm(query.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [query]);
  const catalogInput = useMemo(() => ({
    page: 1,
    pageSize: 10_000,
    scope: "primary" as const,
    category: activeCategory === "All" ? undefined : catalogCategoryForFilter[activeCategory],
    gamePlatform: activeCategory === "Games" && activeGamesPlatform !== "all" ? activeGamesPlatform : undefined,
    topUpMode: activeCategory === "Top-up" && activeTopUpMode !== "all" ? activeTopUpMode : undefined,
    search: catalogSearchTerm || undefined,
  }), [activeCategory, activeGamesPlatform, activeTopUpMode, catalogSearchTerm]);
  const supplierCatalog = trpc.marketplace.catalog.useQuery(catalogInput, { staleTime: 5 * 60_000, refetchOnWindowFocus: false, refetchOnReconnect: false, refetchOnMount: false });
  const catalogSummary = trpc.marketplace.catalog.useQuery({ page: 1, pageSize: 12, scope: "primary" as const, includeMetadata: true }, { staleTime: 5 * 60_000, refetchOnWindowFocus: false });
  const [loadedCatalogItems, setLoadedCatalogItems] = useState<NonNullable<typeof supplierCatalog.data>["items"]>([]);
  const revealCatalog = (focusSearch = false) => {
    const catalog = document.getElementById("products");
    if (!catalog) return;
    const header = document.querySelector(".commerce-header");
    const headerOffset = header instanceof HTMLElement ? header.getBoundingClientRect().height + 12 : 12;
    const targetTop = Math.max(0, window.scrollY + catalog.getBoundingClientRect().top - headerOffset);
    window.scrollTo({ top: targetTop, behavior: "auto" });
    if (focusSearch) window.setTimeout(() => catalogSearchRef.current?.focus({ preventScroll: true }), 40);
  };
  const subscribeNewsletter = trpc.marketplace.subscribeNewsletter.useMutation({
    onSuccess: () => {
      toast.success("Interest saved", { description: "VAMNUX will only email you after a messaging provider is configured." });
      setNewsletterEmail("");
    },
    onError: (error) => toast.error(error.message || "We could not save your email interest."),
  });
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

  useEffect(() => {
    if (!supplierCatalog.data) return;
    setLoadedCatalogItems(supplierCatalog.data.items);
  }, [supplierCatalog.data]);
  const publicProducts = useMemo<Product[]>(() => loadedCatalogItems.map(toLiveCatalogProduct), [loadedCatalogItems]);
  const filteredProducts = publicProducts;

  const visibleCategories = useMemo(() => {
    if (!publicCategories.data) return [];
    const visibleSlugs = new Set(publicCategories.data.map((category) => category.slug));
    return categories.filter((category) => visibleSlugs.has(category.slug));
  }, [publicCategories.data]);
  const selectedCategory = visibleCategories.find((category) => category.filter === activeCategory);

  useEffect(() => {
    if (!publicCategories.data) return;
    if (activeCategory !== "All" && !visibleCategories.some((category) => category.filter === activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, publicCategories.data, visibleCategories]);

  useLayoutEffect(() => {
    const routeParams = new URLSearchParams(window.location.search);
    if (routeParams.get("section") === "why-us" || window.location.hash === "#why-us") {
      const revealWhyUs = () => {
        const target = document.getElementById("why-us");
        if (!target) return;
        target.scrollIntoView({ block: "start", behavior: "auto" });
      };
      revealWhyUs();
      const confirmScroll = window.requestAnimationFrame(revealWhyUs);
      const postRouteScroll = window.setTimeout(revealWhyUs, 90);
      return () => { window.cancelAnimationFrame(confirmScroll); window.clearTimeout(postRouteScroll); };
    }
    const requestedCategory = routeParams.get("category");
    const legacyCategory = requestedCategory === "Steam" ? "Games" : requestedCategory === "Voucher" ? "Gift cards" : requestedCategory;
    if (legacyCategory !== "All" && !isProductCategory(legacyCategory)) return;
    if (requestedCategory) {
      setLocation(legacyCategory === "All" ? "/catalog" : `/catalog?category=${encodeURIComponent(legacyCategory)}`, { replace: true });
      return;
    }
    const nextCategory = legacyCategory === "All" ? "All" : legacyCategory;
    setActiveCategory(nextCategory);
    setQuery("");
    revealCatalog(true);
    const confirmScroll = window.requestAnimationFrame(() => revealCatalog(true));
    return () => window.cancelAnimationFrame(confirmScroll);
  }, [location]);

  useEffect(() => {
    const activateFooterCatalog = (event: Event) => {
      const detail = (event as CustomEvent<{ category?: string; focusSearch?: boolean }>).detail;
      const category = detail?.category === "Steam" ? "Games" : detail?.category === "Voucher" ? "Gift cards" : detail?.category;
      if (category !== "All" && !isProductCategory(category)) return;
      setActiveCategory(category === "All" ? "All" : category);
      setQuery("");
      setOpenMegaCategory(null);
      revealCatalog(Boolean(detail?.focusSearch));
      window.requestAnimationFrame(() => revealCatalog(Boolean(detail?.focusSearch)));
    };
    window.addEventListener("vamnux:catalog-filter", activateFooterCatalog);
    return () => window.removeEventListener("vamnux:catalog-filter", activateFooterCatalog);
  }, []);

  useEffect(() => {
    const revealWhyUs = () => {
      const target = document.getElementById("why-us");
      if (!target) return;
      target.scrollIntoView({ block: "start", behavior: "auto" });
      window.requestAnimationFrame(() => target.scrollIntoView({ block: "start", behavior: "auto" }));
    };
    window.addEventListener("vamnux:why-us", revealWhyUs);
    return () => window.removeEventListener("vamnux:why-us", revealWhyUs);
  }, []);

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
    if (isAuthenticated) recordCartAddition.mutate({ productId: item.id });
    toast.success(`${item.product} added to your cart`, {
      description: `${formatPrice(item.price)} shown in ${currency}. VAMNUX products use wallet-only purchase; no direct payment is offered.`,
    });
  };

  const toggleFavorite = (item: Product) => {
    if (!isAuthenticated) {
      toast.message("Sign in to favorite products", { description: "Favorites are private to your VAMNUX account." });
      startLogin();
      return;
    }
    toggleSavedProduct.mutate({ productId: item.id });
  };

  const chooseCategory = (category: ProductCategory) => {
    setLocation(`/catalog?category=${encodeURIComponent(category)}`);
  };

  const chooseGamesPlatform = (platform: GamesPlatformFilter) => {
    setActiveCategory("Games");
    setActiveGamesPlatform(platform);
    setQuery("");
  };

  const chooseQuickLink = (category: ProductCategory, label: string) => {
    setLocation(`/catalog?category=${encodeURIComponent(category)}&q=${encodeURIComponent(label)}`);
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
          <UniversalMarketplaceSearch
            value={query}
            onValueChange={setQuery}
            products={publicProducts}
            categories={visibleCategories.map(({ label, filter }) => ({ label, filter }))}
            onChooseCategory={(category) => chooseCategory(category as ProductCategory)}
            onOpenProduct={(product) => {
              const matchingProduct = publicProducts.find((candidate) => candidate.id === product.id);
              if (matchingProduct) openCompactProduct(matchingProduct);
            }}
            onNavigate={setLocation}
          />
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
            {isAuthenticated ? <button className="header-icon" onClick={openAccount} aria-label="Open account"><UserRound size={20} /><span>Account</span></button> : <div className="header-auth-actions"><button className="header-signin" type="button" onClick={() => setLocation("/login")}>Sign in</button><button className="header-create-account" type="button" onClick={() => setLocation("/login?mode=signup")}>Create account</button></div>}
            <button className="header-icon favourite-button" onClick={() => isAuthenticated ? setLocation("/account?tab=saved") : startLogin()} aria-label="Open favorites"><Heart size={20} /><span>Favorites</span></button>
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
                {links.length > 0 ? <div className="category-mega-links">{links.map((link) => <button type="button" key={link} onClick={() => chooseQuickLink(filter, link)}>{link}</button>)}</div> : <p>No products are available in this category yet. Please check back soon.</p>}
              </div>
            </div>;
          })}
          <button className="compact-all-categories" type="button" onClick={() => setLocation("/catalog")}><Search size={17} /> All catalog</button>
          <span className="scope-status"><ShieldCheck size={16} /> Product availability updates</span>
        </nav>
        <section className="mobile-category-menu" aria-label="Mobile marketplace category menu">
          <button type="button" className="mobile-category-trigger" aria-expanded={mobileCategoryMenuOpen} aria-controls="mobile-category-drawer" onClick={() => setMobileCategoryMenuOpen((open) => !open)}>
            <span className="mobile-category-lines" aria-hidden="true"><i /><i /><i /></span>
            <span>Browse categories</span>
            <ChevronDown size={17} className={mobileCategoryMenuOpen ? "mobile-category-chevron open" : "mobile-category-chevron"} />
          </button>
          <div id="mobile-category-drawer" className="mobile-category-drawer" data-open={mobileCategoryMenuOpen}>
            <button type="button" className="mobile-category-all" onClick={() => setLocation("/catalog")}><Search size={16} /> All active products <ArrowRight size={15} /></button>
            <div className="mobile-category-list">
              {visibleCategories.map(({ label, icon: Icon, filter }) => {
                const links = catalogQuickLinks.get(filter) ?? [];
                return <details key={filter}>
                  <summary><span><Icon size={17} /> {label}</span><ChevronDown size={15} /></summary>
                  <div>
                    <button type="button" onClick={() => { chooseCategory(filter); setMobileCategoryMenuOpen(false); }}>Browse {label}<ArrowRight size={14} /></button>
                    {links.length ? <div className="mobile-category-quick-links">{links.slice(0, 8).map((link) => <button type="button" key={link} onClick={() => { chooseQuickLink(filter, link); setMobileCategoryMenuOpen(false); }}>{link}</button>)}</div> : <p>Browse current active products in this category.</p>}
                  </div>
                </details>;
              })}
            </div>
            <span className="mobile-category-status"><ShieldCheck size={14} /> Categories update with Admin visibility settings.</span>
          </div>
        </section>
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
              <button onClick={() => setLocation("/catalog?category=Top-up")} className="carousel-secondary">Browse catalogue <ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="carousel-terminal" aria-hidden="true">
            <div className="terminal-top"><span>VAMNUX // MARKET VIEW</span><i /></div>
            <div className="terminal-price"><strong>{slide.metric}</strong><span>{slide.note}</span></div>
            <div className="terminal-bars"><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="terminal-bottom"><span>READY</span><span>{String(activeSlide + 1).padStart(2, "0")} / {String(carouselSlides.length).padStart(2, "0")}</span></div>
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
            const catalogCategory = catalogCategoryForFilter[filter];
            const productCount = catalogCategory ? catalogSummary.data?.categoryCounts[catalogCategory] ?? 0 : 0;
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
          <p>Choose a game that is already active on VAMNUX. Each card stays within VAMNUX and opens its available denominations, account requirements, and VAMNUX display prices.</p>
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
            <p>Search or use a category menu to go straight to available VAMNUX products. Each compact card keeps region, USD-based price, details, and draft-only add-to-cart action within reach.</p>
            <button className="all-products-button" onClick={() => setLocation("/catalog")}>Browse VAMNUX products <ArrowRight size={17} /></button>
          </div>
        </div>

        <div className="filter-row" aria-label="Filter product list">
          {(["All", ...visibleCategories.map((category) => category.filter)] as Array<"All" | ProductCategory>).map((filter) => (
            <button key={filter} onClick={() => { setActiveCategory(filter); setActiveGamesPlatform("all"); setActiveTopUpMode("all"); }} className={activeCategory === filter ? "filter-chip active" : "filter-chip"}>
              {filter === "All" ? "All picks" : filter}
            </button>
          ))}
          <span className="price-display-note">Prices shown in <strong>{currency}</strong></span>
        </div>

        {activeCategory === "Games" && <div className="games-platform-browser" aria-label="Games platform subcategories">
          <div className="games-platform-browser-heading"><span>Games</span><strong>Browse by platform</strong></div>
          <div className="games-platform-tabs" role="tablist" aria-label="Games platform filters">
            {gamesPlatformFilters.map((platform) => <button key={platform.code} type="button" role="tab" aria-selected={activeGamesPlatform === platform.code} className={activeGamesPlatform === platform.code ? "games-platform-tab active" : "games-platform-tab"} onClick={() => chooseGamesPlatform(platform.code)}>
              <span aria-hidden="true">{platform.code === "all" ? "•" : platform.label.slice(0, 1)}</span>{platform.label}
            </button>)}
          </div>
          <p>{activeGamesPlatform === "all" ? "All existing Games products remain visible here." : `Showing Games with verified ${gamesPlatformFilters.find((platform) => platform.code === activeGamesPlatform)?.label} platform data.`}</p>
        </div>}
        {activeCategory === "Top-up" && <div className="games-platform-browser" aria-label="Top-up subcategories">
          <div className="games-platform-browser-heading"><span>Top-up</span><strong>Choose a fulfillment type</strong></div>
          <div className="games-platform-tabs" role="tablist" aria-label="Top-up subcategory filters">
            {topUpSubcategoryFilters.map((subcategory) => <button key={subcategory.code} type="button" role="tab" aria-selected={activeTopUpMode === subcategory.code} className={activeTopUpMode === subcategory.code ? "games-platform-tab active" : "games-platform-tab"} onClick={() => { setActiveTopUpMode(subcategory.code); setActiveCategory("Top-up"); }}><span aria-hidden="true">{subcategory.code === "all" ? "•" : subcategory.label.slice(0, 1)}</span>{subcategory.label}</button>)}
          </div>
          <p>{activeTopUpMode === "all" ? "All existing Top-up products remain visible here." : activeTopUpMode === "direct" ? "Showing Top-up products with verified required customer input." : "Showing products with verified Activation Code metadata."}</p>
        </div>}

        <div className="catalog-keyword-search" aria-label="Search live game listings">
          <div><Search size={21} /><label htmlFor="compact-catalog-search">Find your game or service</label></div>
          <div className="catalog-keyword-input"><input ref={catalogSearchRef} id="compact-catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try PUBG, Free Fire, diamonds, UC, Valorant…" /><button onClick={() => setQuery("")} disabled={!query} aria-label="Clear catalog search"><X size={17} /></button></div>
          <p>{query.trim() ? "Showing matching VAMNUX products." : "Search by game, gift card, subscription, software, region, or Player ID requirement."}</p>
        </div>

        <div className="product-family-list compact-catalog-results">
          {compactProducts.length > 0 && <SelectedProductBrowser products={compactProducts} formatPrice={formatPrice} onOpenProduct={openCompactProduct} onAddToCart={addToCart} favoriteProductIds={customerDashboard.data?.savedProducts.map((product) => product.id) ?? []} onToggleFavorite={toggleFavorite} />}
          {supplierCatalog.isSuccess && compactProducts.length === 0 && (
            <div className="empty-results">
              <Search size={28} />
              {activeCategory !== "All" && activeCategory !== "Top-up" ? <>
                <h3>{selectedCategory?.label ?? activeCategory} are planned.</h3>
                <p>{unavailableCategoryDescriptions[activeCategory]}</p>
                <button onClick={() => setLocation("/catalog")}>Browse live inventory</button>
              </> : <>
                <h3>No live match yet.</h3>
                <p>{query.trim() ? `No active VAMNUX service matches “${query.trim()}”. Try a game name, denomination, region, or requirement.` : "Try a game family or denomination. VAMNUX shows only active synchronised services and never redirects customers to a supplier catalogue."}</p>
                <button onClick={() => setLocation("/catalog")}>Reset catalog</button>
              </>}
            </div>
          )}
        </div>
          <p className="catalog-note"><CircleDollarSign size={16} /> <strong>SHOP WITH CONFIDENCE:</strong> Explore clear product details, requirements and transparent pricing before you choose. Every listing is organised to help you decide with confidence, with support available when you need help.</p>
      </section>

      <section id="why-us" className="why-vamnux-section" aria-labelledby="why-vamnux-title">
        <div className="why-vamnux-heading">
          <div><p className="section-marker">WHY VAMNUX</p><h2 id="why-vamnux-title">TRUST, MADE<br /><em>PRACTICAL.</em></h2></div>
          <div><p>VAMNUX makes the important parts of a digital purchase visible before you move forward: product requirements, final display pricing, account records, and the operational status of checkout.</p><div className="why-vamnux-actions"><button type="button" onClick={() => setLocation("/catalog")}>Browse active products <ArrowRight size={16} /></button><button type="button" onClick={() => setLocation("/help")}>Visit Help Center</button></div></div>
        </div>
        <div className="why-vamnux-grid">
          <article className="why-vamnux-card trust-payment"><span className="why-vamnux-icon"><ShieldCheck size={21} /></span><div><p>PAYMENT READINESS</p><h3>Secure payment pathway</h3><span>Checkout is enabled only through configured supported providers. VAMNUX does not treat an unverified payment as wallet funding.</span></div></article>
          <article className="why-vamnux-card trust-fulfillment"><span className="why-vamnux-icon"><Zap size={21} /></span><div><p>DIGITAL ORDER FLOW</p><h3>Clear fulfilment status</h3><span>Each product shows its delivery format and requirements. Eligible automation begins only after payment and supplier operations are approved.</span></div></article>
          <article className="why-vamnux-card trust-pricing"><span className="why-vamnux-icon"><CircleDollarSign size={21} /></span><div><p>TRANSPARENT PRICING</p><h3>Know the final display price</h3><span>Review the customer price, currency display, region, and account requirements before you add a product to your cart.</span></div></article>
          <article className="why-vamnux-card trust-orders"><span className="why-vamnux-icon"><Ticket size={21} /></span><div><p>ORDER VISIBILITY</p><h3>Keep your activity together</h3><span>Your VAMNUX account keeps saved products, qualifying order records, wallet context, and support history in one protected place.</span></div></article>
          <article className="why-vamnux-card trust-support"><span className="why-vamnux-icon"><Headphones size={21} /></span><div><p>CUSTOMER SUPPORT</p><h3>Help when you need it</h3><span>Use the Help Center or your account support area to ask questions, receive updates, and retain ticket history.</span></div></article>
        </div>
      </section>

      <section id="how-it-works" className="process-section process-section-refined" aria-labelledby="process-title">
        <div className="process-intro">
          <div className="section-marker">A CLEARER WAY TO BUY DIGITAL</div>
          <h2 id="process-title">FIND.<br /><em>CHECK.</em><br />CHOOSE.</h2>
          <p>Browse active digital products, review the listed region and requirements, then save the option that fits your account before checkout is available.</p>
          <a href="/catalog">Browse digital products <ArrowRight size={18} /></a>
        </div>
        <div className="steps-list">
          <article className="step-item">
            <span>01</span>
            <div><h3>Find your match</h3><p>Search live games, gift cards, subscriptions, software, and more from one focused marketplace.</p></div>
            <Gamepad2 size={29} />
          </article>
          <article className="step-item">
            <span>02</span>
            <div><h3>Check the details</h3><p>Review region, product requirements, delivery format, and the final VAMNUX price before adding an item.</p></div>
            <Smartphone size={29} />
          </article>
          <article className="step-item">
            <span>03</span>
            <div><h3>Stay in control</h3><p>Your saved product and order information remain in your VAMNUX account, with support available when needed.</p></div>
            <ShieldCheck size={29} />
          </article>
        </div>
      </section>

      <section className="trust-section trust-section-refined" aria-label="VAMNUX marketplace principles">
        <div className="trust-card trust-dark"><ShieldCheck size={24} /><span className="trust-ticket">PRICE CLARITY</span><h3>Final price, up front.</h3><p>Customer views show the final VAMNUX price with an optional display-currency estimate.</p></div>
        <div className="trust-card trust-lime"><Zap size={24} /><span className="trust-ticket">PRODUCT DETAILS</span><h3>Know what you need.</h3><p>Requirements and delivery format stay close to each product so there are fewer surprises.</p></div>
        <div className="trust-card trust-coral"><Headphones size={24} /><span className="trust-ticket">ACCOUNT SUPPORT</span><h3>Help when it matters.</h3><p>Use the Help Center or your account support area for clear next steps and protected ticket history.</p></div>
      </section>

      <section id="support" className="support-cta support-cta-refined">
        <div className="section-marker">VAMNUX / DIGITAL MARKETPLACE</div>
        <h2>YOUR NEXT<br /><em>DIGITAL PICK</em><br />STARTS HERE.</h2>
        <p><b>CURATED / CLEAR / READY TO BROWSE</b><br />Explore active products, compare the details, and choose what works for your digital life.</p>
        <form className="storefront-email-interest" onSubmit={(event) => { event.preventDefault(); subscribeNewsletter.mutate({ email: newsletterEmail, consent: true }); }}>
          <div><span>STAY IN THE LOOP</span><strong>Product availability and VAMNUX updates</strong><small>We record your interest only. Marketing emails are not active until delivery is configured.</small></div>
          <label><span className="sr-only">Email address</span><input type="email" value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} placeholder="you@email.com" autoComplete="email" required /></label>
          <label className="email-consent"><input type="checkbox" required /> <span>I agree to receive future VAMNUX product updates.</span></label>
          <button type="submit" disabled={subscribeNewsletter.isPending}>{subscribeNewsletter.isPending ? "Saving…" : "Save my interest"} <ArrowRight size={16} /></button>
        </form>
        <div className="support-cta-actions"><a href="/catalog">Browse digital products <ArrowRight size={18} /></a><a href="/help">Visit Help Center</a></div>
        <aside className="marketplace-summary" aria-label="Browse VAMNUX by need">
          <div className="marketplace-summary-head"><span>Browse by need</span><small>Choose a product category</small></div>
          <button className="summary-choice summary-choice-blue" onClick={() => setLocation("/catalog?category=Top-up")}><Gamepad2 size={18} /><span><strong>Games & top-ups</strong><small>Credits, passes, and vouchers</small></span><ArrowRight size={16} /></button>
          <button className="summary-choice summary-choice-violet" onClick={() => setLocation("/catalog?category=Gift%20cards")}><Gift size={18} /><span><strong>Gift cards</strong><small>Digital codes and everyday picks</small></span><ArrowRight size={16} /></button>
          <button className="summary-choice summary-choice-mint" onClick={() => setLocation("/catalog?category=Subscription")}><Tv size={18} /><span><strong>Subscriptions</strong><small>Entertainment and digital access</small></span><ArrowRight size={16} /></button>
          <button className="summary-choice summary-choice-coral" onClick={() => setLocation("/catalog?category=AI%20tools")}><Sparkles size={18} /><span><strong>Tools & services</strong><small>Software and AI-ready categories</small></span><ArrowRight size={16} /></button>
        </aside>
      </section>

      <FooterNavigation />

      <div className={cartOpen ? "cart-overlay open" : "cart-overlay"} onClick={() => setCartOpen(false)} />
      <aside className={cartOpen ? "cart-drawer open" : "cart-drawer"} aria-label="Shopping cart" aria-hidden={!cartOpen}>
        <div className="cart-drawer-head"><div><span className="section-marker">YOUR SELECTION</span><h2>Cart <em>({cart.length})</em></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={22} /></button></div>
        <div className="cart-items">
          {cart.length === 0 ? <div className="cart-empty"><ShoppingBag size={35} /><h3>Your cart is clear.</h3><p>Pick a digital product and it will appear here.</p><button onClick={() => { setCartOpen(false); setLocation("/catalog"); }}>Browse products</button></div> : cart.map((item, index) => (
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
