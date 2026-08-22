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
  return <section className="site-footer-column"><h2>{title}</h2>{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</section>;
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
        <FooterList title="Company" links={[["About Us", "/about"], ["Contact Us", "/contact"], ["Blog", "/blog"], ["Become a Reseller", "/reseller"], ["Affiliate Program", "/affiliate"]]} />
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
