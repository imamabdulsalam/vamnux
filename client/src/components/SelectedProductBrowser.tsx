import type { LiveCatalogProduct } from "@/lib/liveCatalog";
import { catalogProductPresentation } from "@/lib/liveCatalog";
import { ArrowRight, CircleDollarSign, Heart, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SelectedProductBrowserProps = {
  products: LiveCatalogProduct[];
  formatPrice: (price: number) => string;
  onOpenProduct: (product: LiveCatalogProduct) => void;
  onAddToCart: (product: LiveCatalogProduct) => void;
  favoriteProductIds?: number[];
  onToggleFavorite?: (product: LiveCatalogProduct) => void;
};

export default function SelectedProductBrowser({ products, formatPrice, onOpenProduct, onAddToCart, favoriteProductIds = [], onToggleFavorite }: SelectedProductBrowserProps) {
  const [selectedId, setSelectedId] = useState<number | null>(products[0]?.id ?? null);
  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedId) ?? products[0], [products, selectedId]);

  useEffect(() => {
    if (!products.some((product) => product.id === selectedId)) setSelectedId(products[0]?.id ?? null);
  }, [products, selectedId]);

  if (!selectedProduct) return null;
  const selectedPresentation = catalogProductPresentation(selectedProduct);

  return <div className="selected-product-browser">
    <div className="selected-browser-list" aria-label="Available products">
      <div className="selected-browser-list-head"><span>{products.length} available {products.length === 1 ? "product" : "products"}</span><span>Choose one to preview</span></div>
      <div className="selected-browser-scroll" aria-label="Scroll through all available products">
        {products.map((product) => {
          const presentation = catalogProductPresentation(product);
          const isSelected = selectedProduct.id === product.id;
          const isFavorite = favoriteProductIds.includes(product.id);
          return <div key={product.id} className={isSelected ? "selected-browser-row active" : "selected-browser-row"}>
            <button type="button" className="selected-browser-row-main" onClick={() => setSelectedId(product.id)} onMouseEnter={() => setSelectedId(product.id)} aria-pressed={isSelected}>
              <span className="selected-browser-art">{product.image ? <img src={product.image} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span>{presentation.serviceName.slice(0, 1)}</span>}</span>
              <span className="selected-browser-row-copy"><strong>{presentation.serviceName}</strong><small>{presentation.offerName || product.category}</small></span>
              <span className="selected-browser-row-price">{formatPrice(product.price)}</span>
            </button>
            {onToggleFavorite && <button type="button" className={isFavorite ? "selected-browser-favorite saved" : "selected-browser-favorite"} onClick={() => onToggleFavorite(product)} aria-label={`${isFavorite ? "Remove" : "Add"} ${presentation.serviceName} ${presentation.offerName} ${isFavorite ? "from" : "to"} favorites`} title={isFavorite ? "Remove from favorites" : "Add to favorites"}><Heart size={15} fill={isFavorite ? "currentColor" : "none"} /></button>}
          </div>;
        })}
      </div>
    </div>

    <aside className="selected-browser-preview" aria-live="polite">
      <div className="selected-preview-art">{selectedProduct.image ? <img src={selectedProduct.image} alt={`${selectedPresentation.serviceName} artwork`} onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span>{selectedPresentation.serviceName.slice(0, 1)}</span>}</div>
      <div className="selected-preview-copy">
        <p>{selectedProduct.badge} · {selectedPresentation.requirementLabel}</p>
        <h3>{selectedPresentation.serviceName}</h3>
        <strong>{selectedPresentation.offerName}</strong>
        <span>{selectedProduct.region} · {selectedProduct.delivery}</span>
      </div>
      <div className="selected-preview-price"><div><span>Final price</span><strong>{formatPrice(selectedProduct.price)}</strong></div><CircleDollarSign size={22} /></div>
      <div className="selected-preview-actions"><button type="button" onClick={() => onOpenProduct(selectedProduct)}>View details <ArrowRight size={16} /></button>{onToggleFavorite && <button type="button" className={favoriteProductIds.includes(selectedProduct.id) ? "saved" : ""} onClick={() => onToggleFavorite(selectedProduct)} aria-label={`${favoriteProductIds.includes(selectedProduct.id) ? "Remove" : "Add"} ${selectedPresentation.serviceName} from favorites`} title={favoriteProductIds.includes(selectedProduct.id) ? "Remove from favorites" : "Add to favorites"}><Heart size={17} fill={favoriteProductIds.includes(selectedProduct.id) ? "currentColor" : "none"} /></button>}<button type="button" onClick={() => onAddToCart(selectedProduct)} aria-label={`Add ${selectedPresentation.serviceName} to cart`} title="Add to cart"><ShoppingCart size={18} /></button></div>
    </aside>
  </div>;
}
