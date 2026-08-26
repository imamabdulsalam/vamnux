import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, ChevronDown, CircleDollarSign, Gamepad2, Gift, Grid2X2, Heart, ImageIcon, Laptop, Search, Send, ShieldCheck, Sparkles, Tv, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { digitalProductPath, gameFamilyPath } from "@shared/catalogRoutes";
import { GAMES_PLATFORM_SUBCATEGORIES, gamesPlatformCatalogPath, type GamesPlatformCode } from "@shared/gamesPlatformCategories";
import { TOP_UP_SUBCATEGORIES, topUpCatalogPath, type TopUpSubcategoryCode } from "@shared/topUpSubcategories";
import { toLiveCatalogProduct, type LiveCatalogProduct, type ProductCategory } from "@/lib/liveCatalog";
import "./fullCatalogPage.css";
import "./catalogGamesPlatformBrowser.css";
import "./fullCatalogMobileOverride.css";
import "./catalogVirtualGrid.css";
import "./catalogSearchSuggestions.css";
import "./catalogArtworkFallback.css";

type CatalogFilter = "All" | ProductCategory;
type SortMode = "featured" | "price-low" | "price-high" | "name";

const categoryOptions: Array<{ label: string; value: CatalogFilter; api?: "top_up" | "gift_card" | "subscription" | "software" | "ai_tool" | "steam" | "steam_top_up" | "telegram_stars"; icon: typeof Grid2X2 }> = [
  { label: "All picks", value: "All", icon: Grid2X2 },
  { label: "Top-up", value: "Top-up", api: "top_up", icon: Gamepad2 },
  { label: "Gift cards", value: "Gift cards", api: "gift_card", icon: Gift },
  { label: "Subscription", value: "Subscription", api: "subscription", icon: Tv },
  { label: "Software", value: "Software", api: "software", icon: Laptop },
  { label: "AI tools", value: "AI tools", api: "ai_tool", icon: Sparkles },
  { label: "Games", value: "Games", api: "steam", icon: Gamepad2 },
  { label: "Steam Top-Up", value: "Steam Top-Up", api: "steam_top_up", icon: Gamepad2 },
  { label: "Telegram Stars", value: "Telegram Stars", api: "telegram_stars", icon: Send },
];

const categoryValues = new Set(categoryOptions.map((option) => option.value));
const QUICK_CATALOG_PAGE_SIZE = 100;
const COMPLETE_CATALOG_PAGE_SIZE = 50_000;

function productPath(product: LiveCatalogProduct) {
  if (product.id === 390015) return "/steam-top-up";
  return product.category === "Top-up" ? gameFamilyPath(product.name) : digitalProductPath(product.slug);
}

function ProductArtwork({ product }: { product: LiveCatalogProduct }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (product.image && !imageFailed) return <img src={product.image} alt={`${product.name} product artwork`} loading="lazy" onError={() => setImageFailed(true)} />;
  return <span className={`catalog-product-fallback tone-${product.tone}`} aria-label={`${product.name} digital product`}><ImageIcon size={31} aria-hidden="true" /></span>;
}

function VirtualCatalogGrid({ products, favoriteProductIds, onToggleFavorite, favoritePendingProductId }: {
  products: LiveCatalogProduct[];
  favoriteProductIds: Set<number>;
  onToggleFavorite: (productId: number) => void;
  favoritePendingProductId: number | null;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: typeof window === "undefined" ? 1280 : window.innerWidth, scrollY: typeof window === "undefined" ? 0 : window.scrollY, height: typeof window === "undefined" ? 720 : window.innerHeight });
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewport({ width: window.innerWidth, scrollY: window.scrollY, height: window.innerHeight }));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const columns = viewport.width <= 390 ? 1 : viewport.width <= 760 ? 2 : viewport.width <= 1050 ? 4 : 5;
  const rowHeight = viewport.width <= 760 ? 300 : 322;
  const totalRows = Math.ceil(products.length / columns);
  const top = gridRef.current ? Math.max(0, viewport.scrollY - (gridRef.current.getBoundingClientRect().top + viewport.scrollY)) : 0;
  const startRow = Math.max(0, Math.floor(top / rowHeight) - 2);
  const endRow = Math.min(totalRows, Math.ceil((top + viewport.height) / rowHeight) + 3);
  const visibleProducts = products.slice(startRow * columns, endRow * columns);

  return <div ref={gridRef} className="full-catalog-virtualized" style={{ height: totalRows * rowHeight }}>
    <div className="full-catalog-grid full-catalog-grid-window" style={{ top: startRow * rowHeight }}>
      {visibleProducts.map((product) => {
        const isFavorite = favoriteProductIds.has(product.id);
        const isPending = favoritePendingProductId === product.id;
        return <article key={product.id} className="full-catalog-card">
        <button type="button" className={isFavorite ? "full-catalog-favorite saved" : "full-catalog-favorite"} onClick={() => onToggleFavorite(product.id)} disabled={isPending} aria-label={isFavorite ? `Remove ${product.product} from favorites` : `Add ${product.product} to favorites`} aria-pressed={isFavorite} title={isFavorite ? "Remove from favorites" : "Add to favorites"}><Heart size={16} fill={isFavorite ? "currentColor" : "none"} /></button>
        <Link href={productPath(product)} className="full-catalog-art"><ProductArtwork product={product} /></Link>
        <div className="full-catalog-card-copy"><span>{product.badge}</span><h2>{product.name}</h2><p>{product.product}</p></div>
        <div className="full-catalog-card-bottom"><strong>${product.price.toFixed(2)}</strong><small>{product.region}</small><Link href={productPath(product)}>View details <ArrowRight size={14} /></Link></div>
      </article>;
      })}
    </div>
  </div>;
}

export default function CatalogPage() {
  const [location, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { isAuthenticated } = useAuth();
  const initialParams = new URLSearchParams(window.location.search);
  const initialCategory = initialParams.get("category") as CatalogFilter | null;
  const [category, setCategory] = useState<CatalogFilter>(initialCategory && categoryValues.has(initialCategory) ? initialCategory : "All");
  const initialPlatform = initialParams.get("platform") as GamesPlatformCode | null;
  const [gamesPlatform, setGamesPlatform] = useState<GamesPlatformCode>(GAMES_PLATFORM_SUBCATEGORIES.some((option) => option.code === initialPlatform) ? initialPlatform! : "all");
  const initialTopUpMode = initialParams.get("topUpMode") as TopUpSubcategoryCode | null;
  const [topUpMode, setTopUpMode] = useState<TopUpSubcategoryCode>(TOP_UP_SUBCATEGORIES.some((option) => option.code === initialTopUpMode) ? initialTopUpMode! : "all");
  const [query, setQuery] = useState(initialParams.get("q") ?? "");
  const [sort, setSort] = useState<SortMode>("featured");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<number, boolean>>({});
  const [favoritePendingProductId, setFavoritePendingProductId] = useState<number | null>(null);
  const deferredQuery = useDeferredValue(query.trim());
  const customerDashboard = trpc.marketplace.customerDashboard.useQuery(undefined, { enabled: isAuthenticated, staleTime: 5 * 60_000, refetchOnWindowFocus: false });
  const toggleSavedProduct = trpc.marketplace.toggleSavedProduct.useMutation({
    onMutate: ({ productId }) => {
      setFavoritePendingProductId(productId);
      const priorSaved = favoriteOverrides[productId] ?? customerDashboard.data?.savedProducts.some((product) => product.id === productId) ?? false;
      setFavoriteOverrides((current) => ({ ...current, [productId]: !priorSaved }));
      return { productId, priorSaved };
    },
    onError: (error, _variables, context) => {
      if (context) setFavoriteOverrides((current) => ({ ...current, [context.productId]: context.priorSaved }));
      toast.error(error.message || "Could not update your favorites.");
    },
    onSuccess: async (result, variables) => {
      setFavoriteOverrides((current) => ({ ...current, [variables.productId]: result.saved }));
      toast.success(result.saved ? "Product added to your favorites." : "Product removed from your favorites.");
      await customerDashboard.refetch();
    },
    onSettled: () => setFavoritePendingProductId(null),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextCategory = params.get("category") as CatalogFilter | null;
    const nextPlatform = params.get("platform") as GamesPlatformCode | null;
    const nextTopUpMode = params.get("topUpMode") as TopUpSubcategoryCode | null;
    const nextQuery = params.get("q") ?? "";
    if (nextCategory && categoryValues.has(nextCategory)) setCategory(nextCategory);
    else if (!nextCategory) setCategory("All");
    setGamesPlatform(GAMES_PLATFORM_SUBCATEGORIES.some((option) => option.code === nextPlatform) ? nextPlatform! : "all");
    setTopUpMode(TOP_UP_SUBCATEGORIES.some((option) => option.code === nextTopUpMode) ? nextTopUpMode! : "all");
    setQuery(nextQuery);
  }, [location]);

  useEffect(() => {
    if (category === "Steam Top-Up") setLocation("/steam-top-up");
  }, [category, setLocation]);

  const selectedCategory = categoryOptions.find((option) => option.value === category) ?? categoryOptions[0];
  const catalogInput = useMemo(() => ({
    page: 1,
    pageSize: COMPLETE_CATALOG_PAGE_SIZE,
    scope: "all" as const,
    category: selectedCategory.api,
    gamePlatform: category === "Games" && gamesPlatform !== "all" ? gamesPlatform : undefined,
    topUpMode: category === "Top-up" && topUpMode !== "all" ? topUpMode : undefined,
    search: deferredQuery || undefined,
  }), [category, deferredQuery, gamesPlatform, selectedCategory.api, topUpMode]);
  const quickCatalogInput = useMemo(() => ({ ...catalogInput, pageSize: QUICK_CATALOG_PAGE_SIZE }), [catalogInput]);
  const suggestionInput = useMemo(() => ({
    query: deferredQuery,
    scope: "all" as const,
    category: selectedCategory.api,
    gamePlatform: category === "Games" && gamesPlatform !== "all" ? gamesPlatform : undefined,
    topUpMode: category === "Top-up" && topUpMode !== "all" ? topUpMode : undefined,
  }), [category, deferredQuery, gamesPlatform, selectedCategory.api, topUpMode]);
  const catalogQueryOptions = {
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  } as const;
  const quickCatalog = trpc.marketplace.catalog.useQuery(quickCatalogInput, catalogQueryOptions);
  const completeCatalog = trpc.marketplace.catalog.useQuery(catalogInput, { ...catalogQueryOptions, enabled: Boolean(quickCatalog.data) });
  const suggestionsQuery = trpc.marketplace.catalogSuggestions.useQuery(suggestionInput, { ...catalogQueryOptions, enabled: searchFocused && deferredQuery.length >= 2 });
  const [visibleItems, setVisibleItems] = useState<NonNullable<typeof quickCatalog.data>["items"]>([]);
  useEffect(() => {
    if (quickCatalog.data) setVisibleItems(quickCatalog.data.items);
  }, [quickCatalog.data]);
  useEffect(() => {
    if (completeCatalog.data) setVisibleItems(completeCatalog.data.items);
  }, [completeCatalog.data]);

  const products = useMemo(() => {
    const mapped = visibleItems.map(toLiveCatalogProduct);
    if (sort === "price-low") return mapped.sort((left, right) => left.price - right.price || left.name.localeCompare(right.name));
    if (sort === "price-high") return mapped.sort((left, right) => right.price - left.price || left.name.localeCompare(right.name));
    if (sort === "name") return mapped.sort((left, right) => left.name.localeCompare(right.name) || left.product.localeCompare(right.product));
    return mapped;
  }, [sort, visibleItems]);
  const suggestions = deferredQuery.length >= 2 ? suggestionsQuery.data ?? [] : [];
  const favoriteProductIds = useMemo(() => {
    const ids = new Set(customerDashboard.data?.savedProducts.map((product) => product.id) ?? []);
    for (const [productId, isFavorite] of Object.entries(favoriteOverrides)) {
      if (isFavorite) ids.add(Number(productId));
      else ids.delete(Number(productId));
    }
    return ids;
  }, [customerDashboard.data?.savedProducts, favoriteOverrides]);

  const toggleCatalogFavorite = (productId: number) => {
    if (!isAuthenticated) {
      toast.message("Sign in to favorite products", { description: "Favorites are private to your VAMNUX account." });
      startLogin();
      return;
    }
    if (favoritePendingProductId !== null) return;
    toggleSavedProduct.mutate({ productId });
  };

  const selectCategory = (next: CatalogFilter) => {
    if (next === "Steam Top-Up") {
      setLocation("/steam-top-up");
      return;
    }
    setCategory(next);
    setGamesPlatform("all");
    setTopUpMode("all");
    setQuery("");
    setLocation(next === "All" ? "/catalog" : `/catalog?category=${encodeURIComponent(next)}`);
  };

  const selectGamesPlatform = (nextPlatform: GamesPlatformCode) => {
    setCategory("Games");
    setGamesPlatform(nextPlatform);
    setTopUpMode("all");
    setQuery("");
    setLocation(gamesPlatformCatalogPath(nextPlatform));
  };

  const selectTopUpMode = (nextMode: TopUpSubcategoryCode) => {
    setCategory("Top-up");
    setGamesPlatform("all");
    setTopUpMode(nextMode);
    setQuery("");
    setLocation(topUpCatalogPath(nextMode));
  };

  const prefetchCatalog = (nextCategory: CatalogFilter, nextPlatform: GamesPlatformCode = "all", nextTopUpMode: TopUpSubcategoryCode = "all") => {
    const option = categoryOptions.find((entry) => entry.value === nextCategory) ?? categoryOptions[0];
    void utils.marketplace.catalog.prefetch({
      page: 1,
      pageSize: QUICK_CATALOG_PAGE_SIZE,
      scope: "all",
      category: option.api,
      gamePlatform: nextCategory === "Games" && nextPlatform !== "all" ? nextPlatform : undefined,
      topUpMode: nextCategory === "Top-up" && nextTopUpMode !== "all" ? nextTopUpMode : undefined,
    });
  };

  const onSearchChange = (value: string) => {
    setQuery(value);
    setActiveSuggestionIndex(-1);
    const params = new URLSearchParams();
    if (category !== "All") params.set("category", category);
    if (category === "Games" && gamesPlatform !== "all") params.set("platform", gamesPlatform);
    if (category === "Top-up" && topUpMode !== "all") params.set("topUpMode", topUpMode);
    if (value.trim()) params.set("q", value.trim());
    setLocation(params.size ? `/catalog?${params.toString()}` : "/catalog", { replace: true });
  };

  const selectSearchSuggestion = (value: string) => {
    onSearchChange(value);
    setSearchFocused(false);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      selectSearchSuggestion(suggestions[activeSuggestionIndex].name);
    } else if (event.key === "Escape") {
      setSearchFocused(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const catalogTotal = completeCatalog.data?.total ?? quickCatalog.data?.total ?? products.length;

  return <main className="full-catalog-page">
    <header className="full-catalog-header">
      <Link href="/" className="full-catalog-brand"><span>V</span>VAM<em>NUX</em></Link>
      <nav aria-label="Catalog page navigation"><Link href="/">Home</Link><Link href="/catalog" className="active">All products</Link><Link href="/help">Help centre</Link></nav>
      <Link href="/account" className="full-catalog-account">Account <ArrowRight size={15} /></Link>
    </header>

    <section className="full-catalog-hero">
      <div className="full-catalog-hero-grid" aria-hidden="true" />
      <div><p>VAMNUX / CATALOGUE</p><span><Link href="/">Home</Link> <i>›</i> All Products</span><h1>{category === "All" ? "All Products" : category}</h1><small>{catalogTotal.toLocaleString()} products available</small></div>
      <aside><ShieldCheck size={20} /><strong>Browse with clarity</strong><span>Search, compare details, and open an eligible product inside VAMNUX.</span></aside>
    </section>

    <section className="full-catalog-content" aria-label="All VAMNUX products">
      <div className="full-catalog-category-row" role="tablist" aria-label="Product categories">
        {categoryOptions.map((option) => <button key={option.value} type="button" role="tab" aria-selected={category === option.value} className={category === option.value ? "active" : ""} onPointerEnter={() => prefetchCatalog(option.value)} onFocus={() => prefetchCatalog(option.value)} onClick={() => selectCategory(option.value)}><option.icon size={15} />{option.label}</button>)}
      </div>
      {category === "Games" && <section className="full-catalog-games-platforms" aria-label="Games platform subcategories"><div><span>Games</span><strong>Browse by platform</strong></div><div>{GAMES_PLATFORM_SUBCATEGORIES.map((option) => <button key={option.code} type="button" className={gamesPlatform === option.code ? "active" : ""} onPointerEnter={() => prefetchCatalog("Games", option.code)} onFocus={() => prefetchCatalog("Games", option.code)} onClick={() => selectGamesPlatform(option.code)}><i>{option.label.slice(0, 1)}</i>{option.label}</button>)}</div><p>All keeps every existing Games product visible.</p></section>}
      {category === "Top-up" && <section className="full-catalog-games-platforms" aria-label="Top-up subcategories"><div><span>Top-up</span><strong>Choose a fulfillment type</strong></div><div>{TOP_UP_SUBCATEGORIES.map((option) => <button key={option.code} type="button" className={topUpMode === option.code ? "active" : ""} onPointerEnter={() => prefetchCatalog("Top-up", "all", option.code)} onFocus={() => prefetchCatalog("Top-up", "all", option.code)} onClick={() => selectTopUpMode(option.code)}><i>{option.code === "all" ? "•" : option.label.slice(0, 1)}</i>{option.label}</button>)}</div><p>{topUpMode === "all" ? "All keeps every existing Top-up product visible." : topUpMode === "direct" ? "Direct Top Up uses verified customer account or player input." : "Activation Codes appears when explicit supplier code-delivery metadata is available."}</p></section>}
      <div className="full-catalog-controls">
        <div className="full-catalog-search-shell"><label className="full-catalog-search"><Search size={20} /><input value={query} onChange={(event) => onSearchChange(event.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)} onKeyDown={handleSearchKeyDown} placeholder="Search products, games, services, regions…" aria-label="Search all products" aria-autocomplete="list" aria-controls="catalog-search-suggestions" aria-expanded={searchFocused && suggestions.length > 0} />{query && <button type="button" onClick={() => onSearchChange("")} aria-label="Clear product search"><X size={17} /></button>}</label>{searchFocused && suggestions.length > 0 && <div id="catalog-search-suggestions" className="full-catalog-search-suggestions" role="listbox" aria-label="Matching product suggestions">{suggestions.map((suggestion, index) => <button key={`${suggestion.name}-${suggestion.region}`} type="button" role="option" aria-selected={activeSuggestionIndex === index} className={activeSuggestionIndex === index ? "active" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSearchSuggestion(suggestion.name)}><strong>{suggestion.name}</strong><span>{suggestion.region}</span></button>)}</div>}</div>
        <label className="full-catalog-sort"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Sort products"><option value="featured">Featured</option><option value="price-low">Price: Low to high</option><option value="price-high">Price: High to low</option><option value="name">Name: A to Z</option></select><ChevronDown size={17} /></label>
      </div>
      <div className="full-catalog-summary"><span>{catalogTotal.toLocaleString()} products in this view</span><span><CircleDollarSign size={15} />Prices shown in USD</span></div>
      {quickCatalog.isLoading && visibleItems.length === 0 ? <div className="full-catalog-initial-state" role="status"><span /><strong>Preparing your catalogue</strong></div> : products.length > 0 ? <VirtualCatalogGrid products={products} favoriteProductIds={favoriteProductIds} onToggleFavorite={toggleCatalogFavorite} favoritePendingProductId={favoritePendingProductId} /> : <div className="full-catalog-empty"><Search size={30} /><h2>No matching products</h2><p>Try a product name, category, region, or service requirement.</p><button type="button" onClick={() => { selectCategory("All"); onSearchChange(""); }}>Reset catalog</button></div>}
    </section>
  </main>;
}
