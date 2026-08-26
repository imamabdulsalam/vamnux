import { ChevronDown, ShoppingBag } from "lucide-react";

export function GlobalUtilityControls({ onOpenCart }: { onOpenCart: () => void }) {
  return <div className="vamnux-utility-bar" role="presentation">
    <div className="vamnux-utility-controls" aria-label="Marketplace utilities">
      <button type="button" className="vamnux-utility-currency" aria-label="Display currency: USD" title="Display currency: USD">
        <span>USD</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <button type="button" className="vamnux-utility-cart" onClick={onOpenCart} aria-label="Open cart" title="Open cart">
        <ShoppingBag size={19} aria-hidden="true" />
        <span>Cart</span>
      </button>
    </div>
  </div>;
}
