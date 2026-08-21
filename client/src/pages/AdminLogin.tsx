import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { ArrowRight, LockKeyhole, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function AdminLogin() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  if (loading) return <main className="admin-access-page"><div className="admin-access-mark">V</div><p>Validating secure administrator access…</p></main>;
  if (!user) return <main className="admin-access-page"><div className="admin-access-mark">V</div><span>VAMNUX / SUPER ADMIN</span><h1>Secure operations<br /><em>only.</em></h1><p>Sign in through the configured secure identity flow. Admin authorization is verified again on every protected server request.</p><button type="button" onClick={() => startLogin()} className="admin-primary-action">Secure sign in <ArrowRight size={15} /></button><Link href="/" className="admin-return-link">Return to marketplace</Link></main>;
  if (user.role !== "admin") return <main className="admin-access-page"><div className="admin-access-mark danger"><ShieldAlert size={21} /></div><span>VAMNUX / ACCESS RESTRICTED</span><h1>Administrator<br /><em>approval required.</em></h1><p>Your current account does not have Super Admin authorization. No operational data or privileged controls have been loaded.</p><button type="button" onClick={logout} className="admin-secondary-action">Sign out</button><Link href="/" className="admin-return-link">Return to marketplace</Link></main>;
  return <main className="admin-access-page"><div className="admin-access-mark"><ShieldCheck size={21} /></div><span>VAMNUX / VERIFIED ADMIN</span><h1>Access<br /><em>verified.</em></h1><p>Open the protected operations workspace. Authentication and permission checks continue server-side.</p><button type="button" onClick={() => setLocation("/admin/dashboard")} className="admin-primary-action">Open Super Admin <ArrowRight size={15} /></button></main>;
}
