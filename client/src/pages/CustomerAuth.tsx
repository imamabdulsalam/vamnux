import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { ArrowRight, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function CustomerAuth() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  if (!loading && user) {
    setLocation("/account");
    return null;
  }
  return <main className="customer-auth-page"><header><Link href="/" className="user-brand"><span>V</span>VAM<em>NUX</em></Link><Link href="/">Return to marketplace</Link></header><section><div className="customer-auth-copy"><span>VAMNUX / ACCOUNT ACCESS</span><h1>Your digital<br /><em>space.</em></h1><p>Use a protected account to access your wallet, saved products, private support tickets, account settings, and future wallet-only purchases.</p><div><span><ShieldCheck size={17} /> Account-scoped data</span><span><WalletCards size={17} /> Wallet-only purchase policy</span><span><LockKeyhole size={17} /> Server-authorised operations</span></div></div><div className="customer-auth-card"><LockKeyhole size={24} /><p>SECURE SIGN-IN</p><h2>Access your<br />VAMNUX account.</h2><span>VAMNUX currently uses its configured secure sign-in provider. Email/password registration, Google sign-in, password reset, and MFA will only appear after the approved Supabase and email configuration is enabled and tested.</span><button type="button" onClick={() => startLogin()} className="user-primary-action">Continue securely <ArrowRight size={15} /></button><small>Never enter supplier, wallet, or payment credentials into customer account fields.</small></div></section></main>;
}
