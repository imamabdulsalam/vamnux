import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, ChevronDown, CircleDollarSign, Gamepad2, Gift, Grid2X2, Laptop, Search, Send, ShieldCheck, Sparkles, Tv, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { digitalProductPath, gameFamilyPath } from "@shared/catalogRoutes";
import { toLiveCatalogProduct, type LiveCatalogProduct, type ProductCategory } from "@/lib/liveCatalog";
import "./fullCatalogPage.css";
import "./fullCatalogMobileOverride.css";

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

function productPath(product: LiveCatalogProduct) {
  return product.category === "Top-up" ? gameFamilyPath(product.name) : digitalProductPath(product.slug);
}

function ProductArtwork({ product }: { product: LiveCatalogProduct }) {
  if (product.image) return <img src={product.image} alt="" loading="lazy" />;
  return <span className={`catalog-product-fallback tone-${product.tone}`}>{product.name.slice(0, 1)}</span>;
}

export default function CatalogPage() {
  const [location, setLocation] = useLocation();
  const initialParams = new URLSearchParams(window.location.search);
  const initialCategory = initialParams.get("category") as CatalogFilter | null;
  const [category, setCategory] = useState<CatalogFilter>(initialCategory && categoryValues.has(initialCategory) ? initialCategory : "All");
  const [query, setQuery] = useState(initialParams.get("q") ?? "");
  const [sort, setSort] = useState<SortMode>("featured");
  const deferredQuery = useDeferredValue(query.trim());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextCategory = params.get("category") as CatalogFilter | null;
    const nextQuery = params.get("q") ?? "";
    if (nextCategory && categoryValues.has(nextCategory)) setCategory(nextCategory);
    else if (!nextCategory) setCategory("All");
    setQuery(nextQuery);
  }, [location]);

  const selectedCategory = categoryOptions.find((option) => option.value === category) ?? categoryOptions[0];
  const catalogInput = useMemo(() => ({
    page: 1,
    pageSize: 10_000,
    scope: "primary" as const,
    category: selectedCategory.api,
    search: deferredQuery || undefined,
  }), [deferredQuery, selectedCategory.api]);
  const catalog = trpc.marketplace.catalog.useQuery(catalogInput, {
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
  const [visibleItems, setVisibleItems] = useState<NonNullable<typeof catalog.data>["items"]>([]);
  useEffect(() => {
    if (catalog.data) setVisibleItems(catalog.data.items);
  }, [catalog.data]);

  const products = useMemo(() => {
    const mapped = visibleItems.map(toLiveCatalogProduct);
    if (sort === "price-low") return mapped.sort((left, right) => left.price - right.price || left.name.localeCompare(right.name));
    if (sort === "price-high") return mapped.sort((left, right) => right.price - left.price || left.name.localeCompare(right.name));
    if (sort === "name") return mapped.sort((left, right) => left.name.localeCompare(right.name) || left.product.localeCompare(right.product));
    return mapped;
  }, [sort, visibleItems]);

  const selectCategory = (next: CatalogFilter) => {
    setCategory(next);
    setQuery("");
    setLocation(next === "All" ? "/catalog" : `/catalog?category=${encodeURIComponent(next)}`);
  };

  const onSearchChange = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams();
    if (category !== "All") params.set("category", category);
    if (value.trim()) params.set("q", value.trim());
    setLocation(params.size ? `/catalog?${params.toString()}` : "/catalog", { replace: true });
  };

  return <main className="full-catalog-page">
    <header className="full-catalog-header">
      <Link href="/" className="full-catalog-brand"><span>V</span>VAM<em>NUX</em></Link>
      <nav aria-label="Catalog page navigation"><Link href="/">Home</Link><Link href="/catalog" className="active">All products</Link><Link href="/help">Help centre</Link></nav>
      <Link href="/account" className="full-catalog-account">Account <ArrowRight size={15} /></Link>
    </header>

    <section className="full-catalog-hero">
      <div className="full-catalog-hero-grid" aria-hidden="true" />
      <div><p>VAMNUX / CATALOGUE</p><span>Home <i>›</i> All Products</span><h1>{category === "All" ? "All Products" : category}</h1><small>{products.length.toLocaleString()} products available</small></div>
      <aside><ShieldCheck size={20} /><strong>Browse with clarity</strong><span>Search, compare details, and open an eligible product inside VAMNUX.</span></aside>
    </section>

    <section className="full-catalog-content" aria-label="All VAMNUX products">
      <div className="full-catalog-category-row" role="tablist" aria-label="Product categories">
        {categoryOptions.map((option) => <button key={option.value} type="button" role="tab" aria-selected={category === option.value} className={category === option.value ? "active" : ""} onClick={() => selectCategory(option.value)}><option.icon size={15} />{option.label}</button>)}
      </div>
      <div className="full-catalog-controls">
        <label className="full-catalog-search"><Search size={20} /><input value={query} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search products, games, services, regions…" aria-label="Search all products" />{query && <button type="button" onClick={() => onSearchChange("")} aria-label="Clear product search"><X size={17} /></button>}</label>
        <label className="full-catalog-sort"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Sort products"><option value="featured">Featured</option><option value="price-low">Price: Low to high</option><option value="price-high">Price: High to low</option><option value="name">Name: A to Z</option></select><ChevronDown size={17} /></label>
      </div>
      <div className="full-catalog-summary"><span>{products.length.toLocaleString()} products in this view</span><span><CircleDollarSign size={15} />Prices shown in USD</span></div>
      {catalog.isLoading && visibleItems.length === 0 ? <div className="full-catalog-initial-state" role="status"><span /><strong>Preparing your catalogue</strong></div> : products.length > 0 ? <div className="full-catalog-grid">
        {products.map((product) => <article key={product.id} className="full-catalog-card">
          <Link href={productPath(product)} className="full-catalog-art"><ProductArtwork product={product} /></Link>
          <div className="full-catalog-card-copy"><span>{product.badge}</span><h2>{product.name}</h2><p>{product.product}</p></div>
          <div className="full-catalog-card-bottom"><strong>${product.price.toFixed(2)}</strong><small>{product.region}</small><Link href={productPath(product)}>View details <ArrowRight size={14} /></Link></div>
        </article>)}
      </div> : <div className="full-catalog-empty"><Search size={30} /><h2>No matching products</h2><p>Try a product name, category, region, or service requirement.</p><button type="button" onClick={() => { selectCategory("All"); onSearchChange(""); }}>Reset catalog</button></div>}
    </section>
  </main>;
}
