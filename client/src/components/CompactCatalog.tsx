import type { LiveCatalogProduct, ProductCategory } from "@/lib/liveCatalog";
import { catalogProductPresentation } from "@/lib/liveCatalog";
import { ArrowRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";

type CompactCatalogProps = {
  products: LiveCatalogProduct[];
  activeCategory: "All" | ProductCategory;
  keyword: string;
  formatPrice: (price: number) => string;
  onOpenProduct: (product: LiveCatalogProduct) => void;
  onAddToCart: (product: LiveCatalogProduct) => void;
};

function categoryLabel(category: ProductCategory) {
  return category === "Voucher" ? "Gift card" : category;
}

export default function CompactCatalog({ products, activeCategory, keyword, formatPrice, onOpenProduct, onAddToCart }: CompactCatalogProps) {
  const [visibleCount, setVisibleCount] = useState(18);
  useEffect(() => setVisibleCount(18), [activeCategory, keyword, products.length]);
  const visibleProducts = products.slice(0, visibleCount);

  if (!products.length) return null;

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
          <div className="compact-product-actions"><button className="compact-product-details" onClick={() => onOpenProduct(product)}>Details <ArrowRight size={14} /></button><button className="compact-product-add" onClick={() => onAddToCart(product)} aria-label={`Add ${product.product} to cart`}><Plus size={16} /><span>Add</span></button></div>
        </div>
      </article>;
      })}
    </div>
    {visibleCount < products.length && <button className="compact-catalog-more" onClick={() => setVisibleCount((count) => count + 18)}>Show more products <ArrowRight size={16} /></button>}
  </div>;
}
