import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

const productLinks = [
  ["Game Top-Up", "/?category=Top-up#products"],
  ["Gift Cards", "/?category=Voucher#products"],
  ["Gaming Vouchers", "/?category=Voucher#products"],
  ["Game Keys", "/?category=Voucher#products"],
  ["Subscriptions", "/?category=Subscription#products"],
  ["AI Tools", "/?category=AI%20tools#products"],
  ["Deals", "/?category=All#products"],
  ["Others", "/?category=All#products"],
] as const;

const supportLinks = [
  ["Help Center", "/help"],
  ["FAQs", "/faq"],
  ["Contact Support", "/support"],
  ["Track Order", "/track-order"],
  ["Submit a Ticket", "/support/ticket"],
] as const;

const legalLinks = [
  ["Terms of Service", "/terms"],
  ["Privacy Policy", "/privacy"],
  ["Cookie Policy", "/cookies"],
  ["Refund Policy", "/refund-policy"],
  ["Payment Policy", "/payment-policy"],
  ["Delivery Policy", "/delivery-policy"],
  ["Acceptable Use Policy", "/acceptable-use"],
] as const;

function FooterList({ title, links }: { title: string; links: readonly (readonly [string, string])[] }) {
  const activateDestinationInPlace = (event: React.MouseEvent<HTMLAnchorElement>, label: string, href: string) => {
    if (title === "Company" && label === "Why Us" && window.location.pathname === "/") {
      event.preventDefault();
      window.history.replaceState(null, "", "/#why-us");
      window.dispatchEvent(new Event("vamnux:why-us"));
      return;
    }
    if (title !== "Products" || window.location.pathname !== "/") return;
    const category = new URL(href, window.location.origin).searchParams.get("category");
    if (!category) return;
    event.preventDefault();
    const catalogPath = new URL(href, window.location.origin);
    window.history.replaceState(null, "", `${catalogPath.pathname}${catalogPath.search}`);
    window.location.hash = "products";
    window.dispatchEvent(new CustomEvent("vamnux:catalog-filter", { detail: { category, focusSearch: true } }));
  };
  return <section className="site-footer-column"><h2>{title}</h2>{links.map(([label, href]) => label === "Why Us" ? <a key={`${title}-${label}`} href={href} onClick={(event) => activateDestinationInPlace(event, label, href)}>{label}</a> : <Link key={`${title}-${label}`} href={href} onClick={(event) => activateDestinationInPlace(event, label, href)}>{label}</Link>)}</section>;
}

export default function FooterNavigation() {
  return <footer className="site-footer" aria-label="VAMNUX footer">
    <div className="site-footer-shell">
      <section className="site-footer-trust" aria-label="VAMNUX service principles">
        <div><ShieldCheck size={18} /><strong>Secure account</strong><span>Protected account access and server-authorized actions.</span></div>
        <div><ShieldCheck size={18} /><strong>Payment clarity</strong><span>Wallet funding methods appear only when verified and active.</span></div>
        <div><ShieldCheck size={18} /><strong>Digital delivery</strong><span>Product requirements and delivery format stay visible before an order.</span></div>
        <div><ShieldCheck size={18} /><strong>Customer support</strong><span>Account-based support tickets protect customer order information.</span></div>
      </section>

      <div className="site-footer-brand-row">
        <Link href="/" className="site-footer-brand"><span>V</span>VAM<em>NUX</em></Link>
        <p>Your digital marketplace for games, gift cards, subscriptions, software and more.</p>
        <Link href="/about" className="site-footer-about">About VAMNUX <ArrowUpRight size={14} /></Link>
      </div>

      <div className="site-footer-follow">
        <div><span>Follow VAMNUX</span><p>Official Facebook, Instagram, TikTok, X, and YouTube links will appear only after VAMNUX publishes verified profile URLs.</p></div>
      </div>

      <div className="site-footer-grid">
        <FooterList title="Company" links={[["About Us", "/about"], ["Contact Us", "/contact"], ["Why Us", "/#why-us"], ["Sign Up", "/login"]]} />
        <FooterList title="Products" links={productLinks} />
        <FooterList title="Support" links={supportLinks} />
        <FooterList title="Legal" links={legalLinks} />
      </div>

      <section className="site-footer-payments" aria-label="Payment method information">
        <div><span>Secure &amp; supported payments</span><h2>Payment readiness</h2><p>VAMNUX uses a wallet-first purchase model. Payment methods are shown only after their provider integration and verification are active.</p></div>
        <Link href="/payment-policy" className="site-footer-payment-link"><strong>Paystack</strong><strong>Korapay</strong><strong>USDT <small>TRC20</small></strong><em>Read payment policy</em></Link>
      </section>

      <div className="site-footer-bottom"><span>© {new Date().getFullYear()} VAMNUX. All rights reserved.</span><span>USD base display · Region rules apply by product.</span><a href="#top">Back to top ↑</a></div>
    </div>
  </footer>;
}
