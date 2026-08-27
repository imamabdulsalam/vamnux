import type { LiveCatalogProduct } from "@/lib/liveCatalog";
import { catalogProductPresentation } from "@/lib/liveCatalog";
import { ArrowRight, CircleDollarSign, Heart, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type SelectedProductBrowserProps = {
  products: LiveCatalogProduct[];
  formatPrice: (price: number) => string;
  onOpenProduct: (product: LiveCatalogProduct) => void;
  onAddToCart: (product: LiveCatalogProduct) => void;
  favoriteProductIds?: number[];
  onToggleFavorite?: (product: LiveCatalogProduct) => void;
};

function PreviewArtwork({ src, alt, fallback }: { src?: string; alt: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img src={src} alt={alt} loading="eager" decoding="async" fetchPriority="high" onError={() => setFailed(true)} />;
  return <>{fallback}</>;
}

export default function SelectedProductBrowser({ products, formatPrice, onOpenProduct, onAddToCart, favoriteProductIds = [], onToggleFavorite }: SelectedProductBrowserProps) {
  const [rotationTick, setRotationTick] = useState(0);
  const imageBackedProducts = useMemo(() => {
    const productsWithImages = products.filter((product) => Boolean(product.image));
    return productsWithImages.length >= 2 ? productsWithImages : products;
  }, [products]);
  const rotatingProducts = useMemo(() => {
    const pool = [...imageBackedProducts];
    const picks: LiveCatalogProduct[] = [];
    while (pool.length && picks.length < 2) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return picks;
  }, [imageBackedProducts, rotationTick]);
  useEffect(() => {
    if (imageBackedProducts.length < 2) return;
    const rotation = window.setInterval(() => setRotationTick((tick) => tick + 1), 6_000);
    return () => window.clearInterval(rotation);
  }, [imageBackedProducts.length]);

  if (!rotatingProducts.length) return null;

  return <div className="selected-product-browser selected-product-browser-dual" key={rotationTick} aria-live="polite" aria-label="Two randomly selected VAMNUX product previews">
    {rotatingProducts.map((product) => {
          const presentation = catalogProductPresentation(product);
          const isFavorite = favoriteProductIds.includes(product.id);
          return <article className="selected-browser-preview" key={product.id}>
      <div className="selected-preview-art"><PreviewArtwork src={product.image} alt={`${presentation.serviceName} artwork`} fallback={<span>{presentation.serviceName.slice(0, 1)}</span>} /></div>
      <div className="selected-preview-copy">
        <p>{product.badge} · {presentation.requirementLabel}</p>
        <h3>{presentation.serviceName}</h3>
        <strong>{presentation.offerName}</strong>
        <span>{product.region} · {product.delivery}</span>
      </div>
      <div className="selected-preview-price"><div><span>Final price</span><strong>{formatPrice(product.price)}</strong></div><CircleDollarSign size={22} /></div>
      <div className="selected-preview-actions"><button type="button" onClick={() => onOpenProduct(product)}>View details <ArrowRight size={16} /></button>{onToggleFavorite && <button type="button" className={isFavorite ? "saved" : ""} onClick={() => onToggleFavorite(product)} aria-label={`${isFavorite ? "Remove" : "Add"} ${presentation.serviceName} from favorites`} title={isFavorite ? "Remove from favorites" : "Add to favorites"}><Heart size={17} fill={isFavorite ? "currentColor" : "none"} /></button>}<button type="button" onClick={() => onAddToCart(product)} aria-label={`Add ${presentation.serviceName} to cart`} title="Add to cart"><ShoppingCart size={18} /></button></div>
    </article>;
        })}
  </div>;
}
