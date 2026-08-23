import type { LiveCatalogProduct, ProductCategory } from "@/lib/liveCatalog";
import { catalogProductPresentation } from "@/lib/liveCatalog";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { groupLiveProductFamilies } from "@shared/marketplace";

type CompactCatalogProps = {
  products: LiveCatalogProduct[];
  activeCategory: "All" | ProductCategory;
  keyword: string;
  formatPrice: (price: number) => string;
  onOpenProduct: (product: LiveCatalogProduct) => void;
  onOpenFamily: (familyName: string) => void;
  onAddToCart: (product: LiveCatalogProduct) => void;
};

function categoryLabel(category: ProductCategory) {
  return category === "Gift cards" ? "Gift card" : category;
}

export default function CompactCatalog({ products, activeCategory, keyword, formatPrice, onOpenProduct, onOpenFamily, onAddToCart }: CompactCatalogProps) {
  const [visibleCount, setVisibleCount] = useState(18);
  useEffect(() => setVisibleCount(18), [activeCategory, keyword, products.length]);
  const visibleProducts = products.slice(0, visibleCount);
  const topUpFamilies = groupLiveProductFamilies(products.filter((product) => product.category === "Top-up"));
  const showGameFamilyBrowse = activeCategory === "Top-up" && !keyword.trim();

  if (!products.length) return null;

  if (showGameFamilyBrowse) return <div className="compact-catalog-shell">
    <div className="compact-catalog-meta"><span>{topUpFamilies.length} verified game {topUpFamilies.length === 1 ? "family" : "families"}</span><span>Choose a game to see denominations</span></div>
    <div className="compact-family-grid">
      {topUpFamilies.map((family, index) => <button className="compact-family-card" key={family.name} onClick={() => onOpenFamily(family.name)} style={{ animationDelay: `${Math.min(index, 12) * 24}ms` }}>
        <div className="compact-family-art">{family.image ? <img src={family.image} alt={`${family.name} supplier artwork`} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span>{family.name.slice(0, 1)}</span>}</div>
        <div><p>{family.items.length} active {family.items.length === 1 ? "option" : "options"}</p><strong>{family.name}</strong><span>From {formatPrice(Math.min(...family.items.map((item) => item.price)))} <ArrowRight size={14} /></span></div>
      </button>)}
    </div>
  </div>;

  return <div className="compact-catalog-shell">
    <div className="compact-catalog-meta"><span>{products.length} live {products.length === 1 ? "product" : "products"}</span><span>Supplier-backed pricing</span></div>
    <div className="compact-product-grid">
      {visibleProducts.map((product, index) => {
        const presentation = catalogProductPresentation(product);
        const showCardArtwork = Boolean(product.image) && product.category !== "Top-up";
        return <article className="compact-product-card" key={product.id} style={{ animationDelay: `${Math.min(index, 12) * 24}ms` }}>
        <button className="compact-product-visual" onClick={() => onOpenProduct(product)} aria-label={`View ${product.product} details`}>
          <span className="compact-product-category">{product.badge}</span>
          {showCardArtwork ? <img src={product.image} alt={`${presentation.serviceName} supplier artwork`} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span className="compact-product-text-visual"><small>{product.badge}</small><strong>{presentation.serviceName}</strong><span>{presentation.offerName}</span></span>}
        </button>
        <div className="compact-product-copy">
          <p>{product.badge} · {presentation.requirementLabel}</p>
          <button className="compact-product-title" onClick={() => onOpenProduct(product)}>{presentation.serviceName}</button>
          <span className="compact-product-offer">{presentation.offerName}</span>
          <span className="compact-product-region">{product.region} · {product.delivery}</span>
        </div>
        <div className="compact-product-footer">
          <div><strong>{formatPrice(product.price)}</strong><small>{product.priceNote}</small></div>
          <div className="compact-product-actions"><button className="compact-product-details" onClick={() => onOpenProduct(product)}>Details <ArrowRight size={14} /></button><button className="compact-product-add" onClick={() => onAddToCart(product)} aria-label={`Add ${product.product} to cart`} title="Add to cart"><ShoppingCart size={16} /></button></div>
        </div>
      </article>;
      })}
    </div>
    {visibleCount < products.length && <button className="compact-catalog-more" onClick={() => setVisibleCount((count) => count + 18)}>Show more products <ArrowRight size={16} /></button>}
  </div>;
}
