import { ArrowLeft, CircleDollarSign, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import "./steamTopUp.css";

export default function SteamTopUp() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [amountUsd, setAmountUsd] = useState(10);
  const [steamLogin, setSteamLogin] = useState("");
  const checkoutKey = useRef(typeof crypto === "undefined" ? `steam-${Date.now()}-checkout` : crypto.randomUUID());
  const quote = trpc.marketplace.steamTopUpQuote.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000, retry: false });
  const dashboard = trpc.marketplace.customerDashboard.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000 });
  const prepare = trpc.marketplace.prepareSteamTopUpWalletOrder.useMutation({
    onSuccess: (result) => {
      toast.success(`Steam Top-Up order ${result.orderCode} prepared`, { description: "Your wallet was checked. No wallet debit, supplier payment, or Steam top-up has been submitted." });
      setLocation("/account");
    },
    onError: (error) => toast.error(error.message || "The Steam Top-Up could not be prepared."),
  });

  const unitPrice = quote.data?.vamnuxUnitPrice ?? 0;
  const total = Number((unitPrice * amountUsd).toFixed(2));
  const wallet = dashboard.data?.wallet;
  const hasBalance = Boolean(quote.data && wallet && wallet.currency === "USD" && Number(wallet.availableBalance) >= total);

  const prepareOrder = () => {
    if (!isAuthenticated) { startLogin(); return; }
    prepare.mutate({ amountUsd, steamLogin, idempotencyKey: checkoutKey.current });
  };

  return <main className="steam-top-up-page">
    <header className="steam-top-up-header">
      <button type="button" className="steam-top-up-brand" onClick={() => setLocation("/")}><span>V</span> VAMNUX</button>
      <button type="button" className="steam-top-up-back" onClick={() => setLocation("/catalog")}><ArrowLeft size={16} /> All product catalogs</button>
    </header>
    <section className="steam-top-up-hero">
      <div><p>USD ONLY</p><h1>STEAM<br /><em>TOP-UP.</em></h1><span><ShieldCheck size={16} /> Direct wallet credit request for an eligible Steam account</span></div>
      <aside><LockKeyhole size={22} /><strong>Protected wallet route</strong><small>Supplier payment and Steam delivery remain blocked until the wallet-funded fulfillment safeguards are approved.</small></aside>
    </section>
    {!isAuthenticated ? <section className="steam-top-up-auth"><WalletCards size={26} /><h2>Sign in to use your VAMNUX wallet</h2><p>USD Steam Top-Up uses a settled USD VAMNUX wallet balance. Supplier costs and credentials remain private.</p><button type="button" onClick={() => startLogin()}>Sign in securely</button></section> : <section className="steam-top-up-grid">
      <article className="steam-top-up-form">
        <div className="steam-section-label">STEAM TOP-UP</div>
        <h2>Direct credit to Steam wallet</h2>
        <p>USD only. Enter the Steam login that should receive the balance, then choose an amount from ${quote.data?.minAmount ?? 1} to ${quote.data?.maxAmount ?? 300}.</p>
        <section className="steam-currency-section" aria-label="Wallet currency">
          <span>WALLET CURRENCY</span>
          <div className="steam-usd-indicator"><small>US</small><strong>USD</strong></div>
        </section>
        <label className="steam-login-field"><span>STEAM LOGIN *</span><input value={steamLogin} onChange={(event) => setSteamLogin(event.target.value)} placeholder="account_name" autoComplete="username" maxLength={160} /><small>Enter the Steam account login only. Do not enter your password.</small></label>
        <section className="steam-amount-section">
          <span>TOP-UP AMOUNT</span>
          <label className="steam-amount-input"><span>$</span><input type="number" min={quote.data?.minAmount ?? 1} max={quote.data?.maxAmount ?? 300} value={amountUsd} onChange={(event) => setAmountUsd(Math.max(quote.data?.minAmount ?? 1, Math.min(quote.data?.maxAmount ?? 300, Number(event.target.value) || 1)))} aria-label="USD top-up amount" /><small>USD</small></label>
          <div className="steam-quick-amounts" aria-label="Quick USD amount choices">{[5, 10, 25, 50, 100].map((quickAmount) => <button key={quickAmount} type="button" className={amountUsd === quickAmount ? "is-selected" : ""} onClick={() => setAmountUsd(quickAmount)}>${quickAmount}</button>)}</div>
        </section>
      </article>
      <aside className="steam-top-up-summary">
        <div className="steam-section-label">VAMNUX WALLET CHECK</div>
        <h2>Your order summary</h2>
        <dl><div><dt>Steam balance</dt><dd>${amountUsd.toFixed(2)} USD</dd></div><div><dt>VAMNUX price</dt><dd>{quote.isLoading ? "Loading…" : quote.data ? `$${total.toFixed(2)} USD` : "Unavailable"}</dd></div><div><dt>Wallet balance</dt><dd>{wallet ? `${wallet.currency} ${Number(wallet.availableBalance).toFixed(2)}` : "Loading…"}</dd></div></dl>
        <p className={hasBalance ? "steam-wallet-ok" : "steam-wallet-short"}>{quote.error ? "The verified USD Steam Top-Up source is temporarily unavailable. Please try again later." : hasBalance ? "Your settled USD wallet balance can cover this amount." : "A sufficient settled USD VAMNUX wallet balance is required."}</p>
        <button type="button" className="steam-top-up-submit" onClick={prepareOrder} disabled={prepare.isPending || quote.isLoading || !quote.data || !steamLogin.trim() || !hasBalance}>{prepare.isPending ? "Checking wallet…" : "Prepare wallet order"} <CircleDollarSign size={18} /></button>
        <small className="steam-safety-note">Preparing an order checks the required Steam login and your wallet eligibility. It does not debit your wallet or deliver a Steam top-up.</small>
      </aside>
    </section>}
  </main>;
}
