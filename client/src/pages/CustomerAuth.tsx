import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { ArrowRight, LockKeyhole, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

export default function CustomerAuth() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => { if (!loading && user) setLocation("/account"); }, [loading, setLocation, user]);
  if (!loading && user) return null;
  return <main className="customer-auth-page"><header><Link href="/" className="user-brand"><span>V</span>VAM<em>NUX</em></Link><Link href="/">Return to marketplace</Link></header><section><div className="customer-auth-copy"><span>VAMNUX / ACCOUNT ACCESS</span><h1>Your digital<br /><em>space.</em></h1><p>Use a protected account to access your wallet, saved products, private support tickets, account settings, and future wallet-only purchases.</p><div><span><ShieldCheck size={17} /> Account-scoped data</span><span><WalletCards size={17} /> Wallet-only purchase policy</span><span><LockKeyhole size={17} /> Server-authorised operations</span></div></div><div className="customer-auth-card"><LockKeyhole size={24} /><p>SECURE ACCOUNT ACCESS</p><h2>Enter or create<br />your VAMNUX account.</h2><span>VAMNUX currently uses its configured secure identity provider. First-time secure sign-in provisions an account record without collecting a VAMNUX password. Email/password, reset, Google, and MFA are not active.</span><div className="customer-auth-choices"><button type="button" onClick={() => startLogin()} className="user-primary-action">Sign in securely <ArrowRight size={15} /></button><button type="button" onClick={() => startLogin()} className="user-secondary-action">Create secure account <UserRound size={15} /></button></div><small>After first-time access, complete your profile with your name, username, country, optional phone number, and how you found VAMNUX. Never enter supplier, wallet, or payment credentials here.</small></div></section></main>;
}
