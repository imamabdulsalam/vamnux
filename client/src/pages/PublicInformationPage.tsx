import FooterNavigation from "@/components/FooterNavigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { helpArticles, helpSections } from "@/lib/helpCenter";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BadgeHelp, BookOpen, CheckCircle2, ChevronRight, CircleAlert, FileText, Headphones, Info, Landmark, LockKeyhole, PackageCheck, Search, ShieldCheck, ShoppingBag, Ticket, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

type CatalogCategory = "top_up" | "gift_card" | "game_key" | "subscription" | "software" | "ai_tool" | "steam" | "telegram_stars";
const CATALOG_HREF = "/?category=All#products";

type PageDefinition = {
  title: string;
  eyebrow: string;
  summary: string;
  kind: "about" | "contact" | "blog" | "reseller" | "affiliate" | "catalog" | "help" | "faq" | "support" | "track" | "policy";
  catalogCategory?: CatalogCategory;
  sections: Array<{ title: string; text: string; items?: string[] }>;
};

const definitions: Record<string, PageDefinition> = {
  "/about": { title: "Digital Products. Simple. Secure. Accessible.", eyebrow: "VAMNUX — ABOUT US", summary: "Welcome to VAMNUX—your marketplace for discovering and managing digital products in one straightforward place.", kind: "about", sections: [
    { title: "Everything Digital, In One Place", text: "VAMNUX was created to make it easier to discover and manage digital products people use every day. From game top-ups and gaming vouchers to gift cards, game keys, subscriptions, software, and AI tools, the marketplace brings multiple digital categories together in one user-friendly place." },
    { title: "Fast Digital Fulfillment", text: "VAMNUX is designed around clear ordering, secure payment readiness, and efficient digital fulfillment. When the relevant payment and supplier operations are verified and active, eligible products can be processed automatically; every product continues to show its own requirements and delivery format." },
    { title: "Security You Can Rely On", text: "Your account and transactions matter. VAMNUX is designed with protected account access and responsible transaction handling in mind, while supported payment and technology providers are shown only after their integrations have been verified and activated." },
    { title: "Built for the Digital Generation", text: "The way people access games, entertainment, software, and online services is changing. VAMNUX is built to make digital purchases convenient and straightforward, beginning with customers in Nigeria and with a vision to serve digital consumers beyond Nigeria." },
    { title: "Our Vision", text: "Our vision is simple: to become a trusted digital marketplace where people can easily discover, purchase, and manage the digital products they need. VAMNUX is continuously improving its customer experience, expanding authorized product selection, and developing better ways to serve customers." },
    { title: "Why VAMNUX?", text: "VAMNUX brings a clear marketplace experience to digital buying, with product details, current availability, account-based order context, and private support kept close to the customer journey.", items: ["One Marketplace. Access multiple categories of digital products in one place.", "Simple Experience. Browse, save, and manage eligible products and account activity with ease.", "Secure Payments. Funding methods appear only after their supported provider integration is active.", "Digital Convenience. Eligible products can use electronic delivery based on their stated configuration.", "Customer Support. Account-based support is available when you need assistance."] },
  ] },
  "/contact": { title: "We’re here to help", eyebrow: "Contact VAMNUX", summary: "Use your VAMNUX account to keep order and support conversations private. Never send passwords, card details, PINs, or authentication codes through support.", kind: "contact", sections: [
    { title: "Customer support", text: "For wallet, order, product, account, and refund questions, create a secure ticket from your account. The support workflow keeps the history scoped to the account that opened it." },
    { title: "Support contact details", text: "VAMNUX support email, WhatsApp, phone, and support hours are not published until the owner has configured verified contact channels." },
  ] },
  "/blog": { title: "VAMNUX guides & updates", eyebrow: "Blog", summary: "The VAMNUX editorial area will publish practical marketplace guides and product information when real articles are written and approved.", kind: "blog", sections: [
    { title: "Editorial standards", text: "VAMNUX does not invent company news, reviews, market claims, or promotions. Articles will appear here only after an authorized editor publishes them." },
    { title: "Topics planned", text: "Future articles may cover gaming, gift cards, subscriptions, AI tools, software, digital-product guidance, and marketplace updates. An empty editorial shelf is more useful than fabricated news." },
  ] },
  "/reseller": { title: "Build your digital business with VAMNUX", eyebrow: "Reseller program", summary: "The reseller information page explains the future program direction without promising pricing, tiers, discounts, wallet thresholds, or approval until those rules are configured.", kind: "reseller", sections: [
    { title: "How reselling is intended to work", text: "Create an account, submit an application when enrollment opens, meet any owner-configured eligibility checks, then access only the pricing and catalog permissions approved for your account." },
    { title: "Program readiness", text: "Reseller enrollment, tiers, discounts, and application review are not configured yet. VAMNUX will not accept applications until the owner publishes the actual eligibility and commercial terms." },
  ] },
  "/affiliate": { title: "Earn by sharing VAMNUX", eyebrow: "Affiliate program", summary: "This page explains the direction of a future VAMNUX referral program without displaying commission rates, payout dates, cookie periods, or eligibility rules that have not been configured.", kind: "affiliate", sections: [
    { title: "How affiliate links will work", text: "Once enabled, eligible account holders may receive tracked links and can review only the referral activity and payout rules that VAMNUX has formally configured." },
    { title: "Program readiness", text: "Affiliate enrollment, commissions, attribution windows, payout schedules, and eligible product rules are not active. VAMNUX will publish the actual rules before enrollment opens." },
  ] },
  "/game-top-up": { title: "Top up your favorite games", eyebrow: "Game top-up", summary: "Browse currently synchronized gaming products. Always check the player ID, server or region, and other listed requirements before you create an order.", kind: "catalog", catalogCategory: "top_up", sections: [{ title: "Before you order", text: "Select the game and denomination, then review every required account field. Incorrect player or server information can prevent successful fulfillment." }] },
  "/gift-cards": { title: "Gift cards for the platforms you love", eyebrow: "Gift cards", summary: "Discover current gift-card availability by the live VAMNUX catalog. Digital cards can carry currency, country, redemption, and region restrictions.", kind: "catalog", catalogCategory: "gift_card", sections: [{ title: "Region and redemption", text: "Review the product’s listed region, currency, and delivery information before ordering. VAMNUX does not assume that a gift card will redeem outside its stated region." }] },
  "/gaming-vouchers": { title: "Gaming vouchers", eyebrow: "Digital vouchers", summary: "Gaming vouchers may be used for eligible games, credits, memberships, or digital content depending on the listed voucher and its region rules.", kind: "catalog", catalogCategory: "top_up", sections: [{ title: "Availability changes by product", text: "The catalogue below reflects active records only. Open each product to check requirements, region, and delivery details." }] },
  "/game-keys": { title: "Game keys & digital codes", eyebrow: "Game keys", summary: "Browse only active VAMNUX listings that identify themselves as game keys or digital codes. This category does not create stock that the marketplace does not have.", kind: "catalog", sections: [{ title: "Digital-code care", text: "Read product format, platform, and region details before ordering. Delivered or redeemed digital products may have different support and refund considerations." }] },
  "/subscriptions": { title: "Digital subscriptions", eyebrow: "Subscriptions", summary: "Browse live subscription products with their listed service, term, region, price, and delivery information.", kind: "catalog", catalogCategory: "subscription", sections: [{ title: "Check the product details", text: "Subscription services can differ by region, service rules, and delivery method. VAMNUX displays only the current product record rather than inferring eligibility." }] },
  "/ai-tools": { title: "AI tools & digital services", eyebrow: "AI tools", summary: "Explore authorized AI-tool and related digital-service listings when they are active in the VAMNUX catalog.", kind: "catalog", catalogCategory: "ai_tool", sections: [{ title: "Current availability", text: "If this category is empty, VAMNUX has not yet synchronized an active authorized listing for it. No product is implied by this page." }] },
  "/deals": { title: "Current marketplace availability", eyebrow: "Deals", summary: "VAMNUX does not display unconfigured promotions as deals. Browse the active catalog below to find current customer-facing product prices.", kind: "catalog", sections: [{ title: "Promotions", text: "Any future promotional campaign will appear only after it is configured and published by the VAMNUX owner." }] },
  "/products": { title: "Browse digital products", eyebrow: "All products", summary: "Browse currently active VAMNUX catalog items across the marketplace. Categories with no active authorized products remain empty rather than showing invented listings.", kind: "catalog", sections: [{ title: "Live catalog", text: "Use the marketplace search and category pages to review current products, price, region, and fulfillment requirements." }] },
  "/help": { title: "Need help? We’re here to assist.", eyebrow: "VAMNUX Help Centre", summary: "Find quick answers about your VAMNUX account, payments, orders, game top-ups, gift cards, subscriptions, software, and other digital products.", kind: "help", sections: [] },
  "/faq": { title: "Frequently asked questions", eyebrow: "VAMNUX Help Centre", summary: "Browse clear answers about orders, wallet readiness, products, account security, subscriptions, software, and support.", kind: "faq", sections: [] },
  "/support": { title: "Account-based customer support", eyebrow: "Support", summary: "Support tickets are private to the customer account that creates them. Sign in to create, review, reply to, or close your real VAMNUX tickets.", kind: "support", sections: [{ title: "Privacy reminder", text: "Never send a password, payment-card detail, PIN, authenticator code, supplier credential, or wallet secret through a support message." }] },
  "/support/ticket": { title: "Submit a support ticket", eyebrow: "Support", summary: "Create a private request with its issue category, subject, message, and optional linked order. Attachments are not enabled yet, so do not send sensitive details through another channel.", kind: "support", sections: [] },
  "/track-order": { title: "Track your VAMNUX orders", eyebrow: "Order tracking", summary: "Order history and status are intentionally visible only inside the authenticated account that owns them. VAMNUX does not expose order data based on an order number alone.", kind: "track", sections: [{ title: "Private tracking", text: "Sign in to view your real order history, processing status, delivery-window information where available, and any account-scoped support options." }] },
  "/payment-policy": { title: "Payment policy readiness", eyebrow: "Policy information", summary: "VAMNUX is wallet-first. Paystack, Korapay, and USDT TRC20 are not represented as available unless the relevant provider is integrated, verified, and active.", kind: "policy", sections: [{ title: "Wallet funding", text: "A wallet balance may only be credited after VAMNUX has verified a real payment through an active funding method. Direct product payment is not offered." }, { title: "Currency and transaction records", text: "Displayed prices use the configured base and display-currency settings. A future active provider policy will describe its actual transaction-reference and reversal process." }] },
  "/delivery-policy": { title: "Delivery & fulfillment policy", eyebrow: "Policy information", summary: "Digital delivery time and method depend on the specific product, its requirements, and its configured supplier or manual-delivery workflow.", kind: "policy", sections: [{ title: "Product-specific delivery", text: "Game top-ups, gift cards, codes, subscriptions, software, and other digital products can use different fulfillment formats. VAMNUX does not promise instant delivery where a product is configured for review or manual delivery." }, { title: "Incorrect information and availability", text: "Customers should double-check their required information before creating an order. Supplier availability, provider responses, and manual review can affect fulfillment timing." }] },
  "/acceptable-use": { title: "Acceptable use policy readiness", eyebrow: "Policy information", summary: "VAMNUX expects customers to use accounts, wallets, prices, promotions, and product flows lawfully and without fraud, unauthorized access, or abuse.", kind: "policy", sections: [{ title: "Prohibited activity", text: "Fraud, payment abuse, account misuse, unauthorized access, API or bot abuse, price manipulation, stolen credentials, and attempts to exploit technical weaknesses are not permitted." }, { title: "Account actions", text: "Where supported by the facts and applicable process, VAMNUX may warn, restrict, suspend, or review an account. These statements are policy information pending owner and legal review, not a claim of a regulatory authority." }] },
};

export function PublicHeader() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const openAccount = () => {
    if (loading) return;
    if (!isAuthenticated) { setLocation("/login"); return; }
    setLocation("/account");
  };

  return <header className="public-info-header"><div><Link href="/" className="public-info-brand"><span>V</span>VAM<em>NUX</em></Link><nav aria-label="Primary information navigation"><Link href={CATALOG_HREF}>Browse products</Link><Link href="/help">Help center</Link><Link href="/about">About</Link></nav></div><button type="button" onClick={openAccount}>{isAuthenticated ? "My account" : "Sign in"}<ArrowRight size={15} /></button></header>;
}

function CatalogShelf({ category, pagePath }: { category?: CatalogCategory; pagePath: string }) {
  const catalog = trpc.marketplace.catalog.useQuery({ page: 1, pageSize: 96, category, scope: "all", search: pagePath === "/game-keys" ? "key" : undefined });
  const products = useMemo(() => {
    const active = catalog.data?.items ?? [];
    if (pagePath === "/game-keys") return active.filter((product) => /key|code/i.test(`${product.name} ${product.description || ""}`));
    if (!category) return active;
    return active.filter((product) => product.category === category);
  }, [catalog.data, category, pagePath]);

  if (catalog.isLoading) return <div className="info-state">Loading the active VAMNUX catalog…</div>;
  if (catalog.error) return <div className="info-state error">The catalog could not be loaded right now. Return to the marketplace and try again.</div>;
  if (!products.length) return <div className="info-state"><PackageCheck size={22} /><strong>No active listings are available in this view.</strong><span>VAMNUX shows only synchronized or authorized products that are currently available.</span><Link href={CATALOG_HREF}>Browse all active products <ArrowRight size={14} /></Link></div>;
  return <section className="info-catalog-shelf" aria-label="Active VAMNUX product listings"><div className="info-section-heading"><span>Current availability</span><Link href={CATALOG_HREF}>View all products <ArrowRight size={14} /></Link></div><div>{products.slice(0, 8).map((product) => <Link key={product.id} href={product.category === "top_up" ? `/games/${encodeURIComponent(product.name)}` : `/products/${product.slug}`}><span>{product.category.replace("_", " ")}</span><strong>{product.name}</strong><small>{product.regionLabel || "Region shown on product"} · {product.baseCurrency} {Number(product.customerPrice).toFixed(2)}</small><ChevronRight size={16} /></Link>)}</div></section>;
}

function SupportAction({ ticket }: { ticket: boolean }) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const open = () => {
    if (loading) return;
    if (!isAuthenticated) { setLocation("/login"); return; }
    setLocation(`/account${ticket ? "?tab=support" : "?tab=support"}`);
  };
  return <button type="button" className="info-primary-action" onClick={open}>{isAuthenticated ? (ticket ? "Open secure ticket form" : "Open my support tickets") : "Sign in for secure support"}<ArrowRight size={16} /></button>;
}

function FaqList() { return <div className="info-faq-list">{helpArticles.map((article) => <details key={article.id}><summary>{article.question}<ChevronRight size={17} /></summary><p>{article.answer}</p></details>)}</div>; }

function HelpCenter() {
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const normalized = search.trim().toLowerCase();
  const visibleSections = useMemo(() => helpSections.map((section) => ({ ...section, articles: section.articles.filter((article) => {
    if (!normalized) return true;
    return `${article.question} ${article.answer} ${article.keywords.join(" ")} ${section.title}`.toLowerCase().includes(normalized);
  }) })).filter((section) => section.articles.length), [normalized]);
  const resultCount = visibleSections.reduce((total, section) => total + section.articles.length, 0);
  return <>
    <section className="info-help-search" aria-label="Search the VAMNUX Help Centre"><Search size={20} /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search the VAMNUX Help Centre" placeholder='Search “refund”, “PUBG UC”, “payment”, “gift card”…' /><span>Search orders, wallet, payment, gift cards, game top-ups, player ID, subscriptions, software, account, or security.</span></section>
    <div className="info-help-result-count">{normalized ? `${resultCount} matching help answer${resultCount === 1 ? "" : "s"}` : `${helpArticles.length} answers across ${helpSections.length} support topics`}</div>
    <div className="info-help-sections">{visibleSections.map((section) => <section key={section.title} className="info-help-section"><div><span>VAMNUX HELP</span><h2>{section.title}</h2><p>{section.description}</p></div><div className="info-faq-list">{section.articles.map((article) => <details key={article.id}><summary>{article.question}<ChevronRight size={17} /></summary><p>{article.answer}</p></details>)}</div></section>)}</div>
    {!visibleSections.length && <div className="info-state"><Search size={22} /><strong>No matching help answer yet.</strong><span>Try a shorter keyword such as refund, payment, PUBG, gift card, wallet, order, or player ID.</span></div>}
    <section className="info-help-escalation"><div><span>STILL NEED HELP?</span><h2>Can’t find the answer you’re looking for?</h2><p>Use your VAMNUX account to keep order and support conversations private.</p></div><div className="info-cta-row"><Link href="/support" className="info-secondary-action">Contact support <Headphones size={16} /></Link><SupportAction ticket={true} /><Link href="/track-order" className="info-secondary-action">Track my order <ArrowRight size={16} /></Link></div></section>
  </>;
}

function PageBody({ definition, path }: { definition: PageDefinition; path: string }) {
  if (definition.kind === "catalog") return <><InfoSections sections={definition.sections} /><CatalogShelf category={definition.catalogCategory} pagePath={path} /></>;
  if (definition.kind === "faq") return <FaqList />;
  if (definition.kind === "help") return <HelpCenter />;
  if (definition.kind === "support") return <><InfoSections sections={definition.sections} /><section className="info-callout"><Ticket size={24} /><div><strong>Real account support workflow</strong><p>VAMNUX support tickets use the existing account-scoped ticket system. For privacy, guest tickets and file uploads are not enabled until the owner configures a verified support-delivery workflow.</p></div></section><SupportAction ticket={path === "/support/ticket"} /></>;
  if (definition.kind === "track") return <><InfoSections sections={definition.sections} /><SupportAction ticket={false} /></>;
  if (definition.kind === "contact") return <><InfoSections sections={definition.sections} /><div className="info-callout"><LockKeyhole size={24} /><div><strong>Keep your support request safe</strong><p>Order, wallet, and account support requests require sign-in so private information does not pass through an unverified public form.</p></div></div><SupportAction ticket={true} /></>;
  if (definition.kind === "about") return <><InfoSections sections={definition.sections} /><div className="info-cta-row"><Link href={CATALOG_HREF} className="info-primary-action">Explore products <ArrowRight size={16} /></Link><Link href="/login?mode=signup" className="info-secondary-action">Create account <ArrowRight size={16} /></Link></div></>;
  if (definition.kind === "reseller" || definition.kind === "affiliate" || definition.kind === "blog" || definition.kind === "policy") return <><InfoSections sections={definition.sections} /><div className="info-cta-row"><Link href={CATALOG_HREF} className="info-primary-action">Explore products <ArrowRight size={16} /></Link><Link href="/support" className="info-secondary-action">Contact support <Headphones size={16} /></Link></div></>;
  return <InfoSections sections={definition.sections} />;
}

function InfoSections({ sections }: { sections: PageDefinition["sections"] }) { return <div className="info-sections">{sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p>{section.items && <ul>{section.items.map((item) => <li key={item}><CheckCircle2 size={15} />{item}</li>)}</ul>}</section>)}</div>; }

export default function PublicInformationPage() {
  const [location] = useLocation();
  const path = location.split("?")[0] || "/about";
  const definition = definitions[path] ?? definitions["/products"];

  useEffect(() => {
    document.title = `${definition.eyebrow} | VAMNUX`;
    const description = document.querySelector('meta[name="description"]') || document.head.appendChild(Object.assign(document.createElement("meta"), { name: "description" }));
    description.setAttribute("content", definition.summary);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = `${window.location.origin}${path}`;
  }, [definition, path]);

  return <main id="top" className="public-info-page"><PublicHeader /><section className="info-hero"><div className="info-breadcrumb"><Link href="/">Marketplace</Link><ChevronRight size={13} /><span>{definition.eyebrow}</span></div><span>{definition.eyebrow}</span><h1>{definition.title}</h1><p>{definition.summary}</p></section><section className="info-content"><PageBody definition={definition} path={path} /></section><FooterNavigation /></main>;
}
