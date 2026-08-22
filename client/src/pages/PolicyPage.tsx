import FooterNavigation from "@/components/FooterNavigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { ArrowLeft, ArrowRight, FileText, ShieldAlert, Ticket } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { PublicHeader } from "@/pages/PublicInformationPage";

type PolicySection = { title: string; text: string; items?: string[] };
type Policy = { slug: string; title: string; summary: string; sections: PolicySection[] };

const policies: Policy[] = [
  { slug: "terms-of-service", title: "VAMNUX Terms of Service", summary: "The proposed rules for using VAMNUX, creating an account, and purchasing digital products.", sections: [
    { title: "Using VAMNUX", text: "By using VAMNUX, creating an account, or purchasing a product, you agree to these draft Terms.", items: ["Provide accurate account and payment information.", "Keep your account credentials secure.", "Use VAMNUX only for lawful purposes.", "Provide correct information when purchasing digital products."] },
    { title: "Orders and pricing", text: "Orders are processed after successful payment confirmation. Depending on the product and active operations, an order may use an automated or additional-processing workflow. Supplier costs, currency display, and promotions can affect prices; the price shown during checkout is the applicable price for that order." },
    { title: "Accounts and third parties", text: "VAMNUX may review, suspend, or terminate accounts involved in fraud, payment abuse, unauthorized activity, or policy violations. Some products may come from third-party providers and can carry product-specific terms, regions, and restrictions." },
  ] },
  { slug: "privacy-policy", title: "VAMNUX Privacy Policy", summary: "How VAMNUX proposes to use the account and marketplace information needed to operate the platform.", sections: [
    { title: "Information used", text: "VAMNUX may use the information needed to provide an account-led digital marketplace.", items: ["Name, email address, phone number, and country.", "Account, order, transaction, and wallet activity.", "Product or game information required for an eligible order.", "Technical information only where VAMNUX enables and explains that collection."] },
    { title: "Why information is used", text: "Information may be used to manage accounts, process and deliver eligible orders, verify payments, provide support, prevent fraud, send important account or order notifications, and improve services." },
    { title: "Sharing and choices", text: "Necessary information may be shared with trusted payment processors, suppliers, service providers, and technology partners needed to operate VAMNUX. VAMNUX does not sell personal information. Subject to applicable law, you may request access, correction, or deletion through a private support ticket." },
  ] },
  { slug: "cookie-policy", title: "VAMNUX Cookie Policy", summary: "How VAMNUX uses essential cookies and similar technologies for a secure, convenient experience.", sections: [
    { title: "Cookie purposes", text: "Cookies and similar technologies may help VAMNUX keep you signed in, secure your account, remember preferences, understand site usage, improve performance, and measure approved marketing activity where applicable." },
    { title: "Managing cookies", text: "You can manage or disable cookies through your browser settings. Some essential cookies may be required for VAMNUX to function correctly. By continuing to use VAMNUX, you acknowledge the cookies described here and any applicable consent options." },
  ] },
  { slug: "refund-policy", title: "VAMNUX Refund Policy", summary: "How refund requests for primarily digital products are proposed to be reviewed.", sections: [
    { title: "Eligible situations", text: "A refund may be considered after review when an eligible order was not delivered after successful payment, a delivered digital product is invalid or defective, the same order was charged more than once, or VAMNUX approves another outcome after investigation." },
    { title: "When a refund may not be available", text: "A refund may not be available where incorrect player, account, email, region, or denomination details were provided; a code has been revealed or redeemed; or a digital product was successfully delivered and used." },
    { title: "Requesting review", text: "Submit a private support ticket with the VAMNUX order ID, transaction reference, and a clear explanation. Requests are reviewed individually and remain subject to applicable consumer-protection law." },
  ] },
  { slug: "payment-policy", title: "VAMNUX Payment Policy", summary: "The proposed payment rules for the wallet-first VAMNUX marketplace.", sections: [
    { title: "Payment readiness", text: "VAMNUX shows payment methods only when their provider integration, verification, and checkout flow are active. When enabled, supported methods may include Paystack, Korapay, VAMNUX Wallet, USDT TRC20, and other configured methods." },
    { title: "Payment confirmation", text: "An order is processed only after VAMNUX or the relevant provider has successfully verified payment. If a charge is shown but an order remains pending, submit a ticket rather than making another payment." },
    { title: "Cryptocurrency", text: "Where crypto payments are enabled, confirm the correct network and wallet address before sending funds. Funds sent to an incorrect address or unsupported network may not be recoverable." },
  ] },
  { slug: "delivery-policy", title: "VAMNUX Delivery Policy", summary: "How eligible digital products may be delivered and what can affect order timing.", sections: [
    { title: "Delivery formats", text: "Eligible products can use a configured game top-up, digital code, account dashboard, activation or licence information, or another product-specific delivery format. The product page identifies the applicable requirements and delivery information." },
    { title: "Timing and requirements", text: "Where payment and supplier operations are active, eligible products may be automated after successful verification. Delivery can still be affected by supplier or API responses, verification, network conditions, or availability. Customers must provide the correct player ID, user ID, server, region, and other listed details." },
    { title: "Delivery issues", text: "If VAMNUX cannot fulfil an eligible order, the review may consider a replacement, retry, wallet credit, or refund where applicable. Account-based order tracking is available only to the customer who owns the order." },
  ] },
  { slug: "acceptable-use-policy", title: "VAMNUX Acceptable Use Policy", summary: "The proposed standards for lawful, responsible use of VAMNUX accounts and marketplace features.", sections: [
    { title: "Prohibited activity", text: "You must not use VAMNUX to commit fraud or financial crimes, use stolen payment information, create fraudulent accounts, abuse refunds or promotions, access another user’s account, disrupt the platform, exploit vulnerabilities, abuse bots or automated systems, conduct unlawful activity, or circumvent security and account restrictions." },
    { title: "Review and reporting", text: "VAMNUX may investigate suspicious activity and review accounts involved in prohibited conduct. If you believe you found a security issue, submit a private ticket with a clear, responsible report and do not include passwords, payment data, or authentication codes." },
  ] },
];

const aliases: Record<string, string> = {
  "/terms": "terms-of-service", "/privacy": "privacy-policy", "/cookies": "cookie-policy", "/refund-policy": "refund-policy", "/payment-policy": "payment-policy", "/delivery-policy": "delivery-policy", "/acceptable-use": "acceptable-use-policy",
};

function SupportTicketAction() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const openTicket = () => {
    if (loading) return;
    if (!isAuthenticated) { startLogin(); return; }
    setLocation("/account?tab=support");
  };
  return <button className="policy-ticket-action" type="button" onClick={openTicket}><Ticket size={16} />{isAuthenticated ? "Submit a ticket" : "Sign in to submit a ticket"}<ArrowRight size={15} /></button>;
}

export default function PolicyPage() {
  const [, params] = useRoute("/policies/:slug");
  const [location] = useLocation();
  const path = location.split("?")[0];
  const slug = aliases[path] ?? params?.slug ?? "terms-of-service";
  const policy = policies.find((item) => item.slug === slug) ?? policies[0];
  return <main id="top" className="policy-page"><PublicHeader /><article className="policy-article"><header><Link href="/"><ArrowLeft size={16} /> VAMNUX marketplace</Link><span>LEGAL / DRAFT POLICY</span></header><div className="policy-draft-notice"><ShieldAlert size={18} /><div><strong>Owner-provided legal draft</strong><p>These pages are editable drafts and require owner and qualified legal review before they are treated as final policy terms.</p></div></div><div className="policy-title"><FileText size={24} /><div><span>Draft · Legal review required</span><h1>{policy.title}</h1><p>{policy.summary}</p></div></div><div className="policy-body">{policy.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p>{section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}</section>)}</div><section className="policy-support"><div><span>NEED HELP WITH THIS POLICY?</span><h2>Keep your request private.</h2><p>Use a VAMNUX support ticket for account, order, payment, refund, privacy, or security questions. Do not send sensitive credentials in a ticket.</p></div><SupportTicketAction /></section></article><FooterNavigation /></main>;
}
