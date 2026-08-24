import { ArrowRight, Grid2X2 } from "lucide-react";
import { Link } from "wouter";

type PublicCategory = { slug: string; name: string; description?: string | null };

const catalogLinks: Record<string, string> = {
  "game-top-up": "/catalog?category=Top-up",
  "gift-cards": "/catalog?category=Gift%20cards",
  subscriptions: "/catalog?category=Subscription",
  software: "/catalog?category=Software",
  "ai-tools": "/catalog?category=AI%20tools",
  games: "/catalog?category=Games",
  "steam-top-up": "/catalog?category=Steam%20Top-Up",
  "telegram-stars": "/catalog?category=Telegram%20Stars",
};

export function UserDashboardCategoryBrowser({ categories, loading }: { categories: PublicCategory[]; loading: boolean }) {
  return <section className="user-panel user-categories-panel">
    <div className="user-panel-heading"><div><span>MARKETPLACE CATEGORIES</span><h2>Find what you need</h2><p>Browse VAMNUX categories and open the complete product catalogue whenever you are ready.</p></div><Grid2X2 size={22} /></div>
    <div className="user-category-grid">
      {categories.map((category) => <Link key={category.slug} href={catalogLinks[category.slug] || "/catalog"} className="user-category-link"><span>{category.name}</span><small>{category.description || "Browse current VAMNUX availability"}</small><ArrowRight size={16} /></Link>)}
    </div>
    {!loading && categories.length === 0 ? <div className="user-empty-state"><div className="user-empty-mark"><Grid2X2 size={22} /></div><h3>No categories are currently available</h3><p>VAMNUX categories will appear here when enabled by the marketplace owner.</p></div> : null}
  </section>;
}
