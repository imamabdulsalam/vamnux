import type { LiveCatalogProduct } from "@/lib/liveCatalog";
import { catalogProductPresentation } from "@/lib/liveCatalog";
import { ArrowRight, CircleDollarSign, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SelectedProductBrowserProps = {
  products: LiveCatalogProduct[];
  formatPrice: (price: number) => string;
  onOpenProduct: (product: LiveCatalogProduct) => void;
  onAddToCart: (product: LiveCatalogProduct) => void;
};

export default function SelectedProductBrowser({ products, formatPrice, onOpenProduct, onAddToCart }: SelectedProductBrowserProps) {
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
      <div className="selected-browser-scroll">
        {products.map((product) => {
          const presentation = catalogProductPresentation(product);
          const isSelected = selectedProduct.id === product.id;
          return <button key={product.id} type="button" className={isSelected ? "selected-browser-row active" : "selected-browser-row"} onClick={() => setSelectedId(product.id)} onMouseEnter={() => setSelectedId(product.id)} aria-pressed={isSelected}>
            <span className="selected-browser-art">{product.image ? <img src={product.image} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span>{presentation.serviceName.slice(0, 1)}</span>}</span>
            <span className="selected-browser-row-copy"><strong>{presentation.serviceName}</strong><small>{presentation.offerName || product.category}</small></span>
            <span className="selected-browser-row-price">{formatPrice(product.price)}</span>
          </button>;
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
      <div className="selected-preview-actions"><button type="button" onClick={() => onOpenProduct(selectedProduct)}>View details <ArrowRight size={16} /></button><button type="button" onClick={() => onAddToCart(selectedProduct)} aria-label={`Add ${selectedPresentation.serviceName} to cart`} title="Add to cart"><ShoppingCart size={18} /></button></div>
    </aside>
  </div>;
}
