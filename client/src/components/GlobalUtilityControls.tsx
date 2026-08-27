import { ChevronDown, ShoppingBag } from "lucide-react";
import { useState } from "react";

export function GlobalUtilityControls({ onOpenCart }: { onOpenCart: () => void }) {
  const [currency, setCurrency] = useState("USD");

  return <div className="vamnux-utility-bar" role="presentation">
    <div className="vamnux-utility-controls" aria-label="Marketplace utilities">
      <label className="vamnux-utility-currency" title="Change display currency">
        <select value={currency} onChange={(event) => setCurrency(event.target.value)} aria-label="Display currency">
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="NGN">NGN</option>
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </label>
      <button type="button" className="vamnux-utility-cart" onClick={onOpenCart} aria-label="Open cart" title="Open cart">
        <ShoppingBag size={19} aria-hidden="true" />
        <span>Cart</span>
      </button>
    </div>
  </div>;
}
