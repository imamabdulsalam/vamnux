import { ArrowRight, BookOpen, FolderSearch, Search } from "lucide-react";
import { helpArticles } from "@/lib/helpCenter";
import { useMemo, useState } from "react";
import "./universalMarketplaceSearch.css";

type SearchProduct = {
  id: number;
  name: string;
  product: string;
  category: string;
  region: string;
  price: number;
};

type SearchCategory = {
  label: string;
  filter: string;
};

type Destination = {
  label: string;
  detail: string;
  href: string;
  keywords: string[];
};

const destinations: Destination[] = [
  { label: "Help Center", detail: "Account, wallet, orders, products, refunds and security guidance", href: "/help", keywords: ["help", "guide", "wallet", "order", "refund", "security"] },
  { label: "Frequently asked questions", detail: "Quick answers about VAMNUX marketplace features", href: "/faq", keywords: ["faq", "question", "answer", "delivery", "region"] },
  { label: "Contact support", detail: "Account-protected support and ticket guidance", href: "/support", keywords: ["support", "contact", "ticket", "problem", "issue"] },
  { label: "Track orders", detail: "Private order status is available inside your account", href: "/track-order", keywords: ["track", "order", "status", "delivery"] },
  { label: "About VAMNUX", detail: "How the VAMNUX digital marketplace works", href: "/about", keywords: ["about", "vamnux", "marketplace"] },
  { label: "Payment policy", detail: "Wallet-first purchase and funding readiness information", href: "/payment-policy", keywords: ["payment", "paystack", "korapay", "crypto", "fund", "funding", "wallet"] },
  { label: "Delivery policy", detail: "Product-specific digital delivery and fulfilment information", href: "/delivery-policy", keywords: ["delivery", "fulfillment", "fulfilment", "instant"] },
  { label: "Privacy policy", detail: "VAMNUX privacy and account information policy", href: "/privacy", keywords: ["privacy", "data", "personal"] },
];

type Result =
  | { key: string; group: "Products"; title: string; detail: string; action: () => void }
  | { key: string; group: "Categories"; title: string; detail: string; action: () => void }
  | { key: string; group: "Help Centre" | "Help & pages"; title: string; detail: string; action: () => void };

export default function UniversalMarketplaceSearch({
  value,
  onValueChange,
  products,
  categories,
  onChooseCategory,
  onOpenProduct,
  onNavigate,
}: {
  value: string;
  onValueChange: (value: string) => void;
  products: SearchProduct[];
  categories: SearchCategory[];
  onChooseCategory: (category: string) => void;
  onOpenProduct: (product: SearchProduct) => void;
  onNavigate: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const normalized = value.trim().toLowerCase();

  const results = useMemo<Result[]>(() => {
    if (!normalized) return [];
    const productResults = products.filter((product) => `${product.name} ${product.product} ${product.category} ${product.region}`.toLowerCase().includes(normalized)).slice(0, 5).map((product) => ({
      key: `product-${product.id}`,
      group: "Products" as const,
      title: product.product || product.name,
      detail: `${product.category} · ${product.region || "Region shown on product"}`,
      action: () => onOpenProduct(product),
    }));
    const categoryResults = categories.filter((category) => `${category.label} ${category.filter}`.toLowerCase().includes(normalized)).slice(0, 4).map((category) => ({
      key: `category-${category.filter}`,
      group: "Categories" as const,
      title: category.label,
      detail: "Browse active products in this category",
      action: () => onChooseCategory(category.filter),
    }));
    const searchTerms = normalized.split(/\s+/).filter(Boolean);
    const helpResults = helpArticles.filter((article) => {
      const haystack = `${article.question} ${article.answer} ${article.keywords.join(" ")} ${article.section}`.toLowerCase();
      return searchTerms.every((term) => haystack.includes(term));
    }).slice(0, 6).map((article) => ({
      key: `help-${article.id}`,
      group: "Help Centre" as const,
      title: article.question,
      detail: `${article.section} · ${article.answer}`,
      action: () => onNavigate(`/help?q=${encodeURIComponent(article.keywords[0] || article.question)}`),
    }));
    const pageResults = destinations.filter((destination) => `${destination.label} ${destination.detail} ${destination.keywords.join(" ")}`.toLowerCase().includes(normalized)).slice(0, 5).map((destination) => ({
      key: `page-${destination.href}`,
      group: "Help & pages" as const,
      title: destination.label,
      detail: destination.detail,
      action: () => onNavigate(destination.href),
    }));
    return [...productResults, ...categoryResults, ...helpResults, ...pageResults];
  }, [categories, normalized, onChooseCategory, onNavigate, onOpenProduct, products]);

  const choose = (result: Result) => {
    setOpen(false);
    onValueChange("");
    result.action();
  };

  const groups = ["Products", "Categories", "Help Centre", "Help & pages"] as const;
  return <div className="universal-search-shell">
    <label className="market-search" aria-label="Search VAMNUX products, categories and help">
      <Search size={21} />
      <input
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => { onValueChange(event.target.value); setOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "Enter" && results[0]) { event.preventDefault(); choose(results[0]); }
        }}
        aria-expanded={open && Boolean(normalized)}
        aria-controls="universal-search-results"
        placeholder="Search products, categories, help or FAQs"
      />
      <span className="search-category">Search VAMNUX <ArrowRight size={15} /></span>
    </label>
    {open && normalized && <div id="universal-search-results" className="universal-search-results" role="region" aria-label="Search results">
      {results.length ? groups.map((group) => {
        const groupResults = results.filter((result) => result.group === group);
        if (!groupResults.length) return null;
        const Icon = group === "Products" ? Search : group === "Categories" ? FolderSearch : BookOpen;
        return <section key={group}><h2><Icon size={14} />{group}</h2>{groupResults.map((result) => <button type="button" key={result.key} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(result)}><span><strong>{result.title}</strong><small>{result.detail}</small></span><ArrowRight size={15} /></button>)}</section>;
      }) : <div className="universal-search-empty"><Search size={18} /><strong>No VAMNUX results yet</strong><span>Try a product, category, Help topic, FAQ, delivery, wallet, or support keyword.</span></div>}
    </div>}
  </div>;
}
