import { Moon, ShoppingCart, Sun } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import "./globalUtilityControls.css";

const displayCurrencies = ["USD", "NGN", "EUR", "GBP"] as const;

export default function GlobalUtilityControls() {
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const currency = typeof window === "undefined" ? "USD" : localStorage.getItem("vamnux-display-currency") || "USD";

  const changeCurrency = (next: string) => {
    localStorage.setItem("vamnux-display-currency", next);
    window.dispatchEvent(new CustomEvent("vamnux:display-currency", { detail: next }));
    window.location.reload();
  };

  return <div className="vamnux-global-utilities" aria-label="VAMNUX display and cart controls">
    <button type="button" className="vamnux-utility-theme" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
      {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}<span>{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
    <label className="vamnux-utility-currency"><span className="sr-only">Display currency</span><select value={currency} onChange={(event) => changeCurrency(event.target.value)} aria-label="Display currency">{displayCurrencies.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
    <button type="button" className="vamnux-utility-cart" onClick={() => setLocation("/?cart=open")} aria-label="Open shopping cart"><ShoppingCart size={21} /></button>
  </div>;
}
