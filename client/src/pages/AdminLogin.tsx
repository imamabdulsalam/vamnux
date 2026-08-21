import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowRight, LockKeyhole, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function AdminLogin() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const adminAccess = trpc.auth.adminAccess.useQuery(undefined, { enabled: Boolean(user) });
  if (loading) return <main className="admin-access-page"><div className="admin-access-mark">V</div><p>Validating secure administrator access…</p></main>;
  if (!user) return <main className="admin-access-page"><div className="admin-access-mark">V</div><span>VAMNUX / SUPER ADMIN</span><h1>Secure operations<br /><em>only.</em></h1><p>Sign in through the standard VAMNUX account flow. Admin authorization is verified again on every protected server request.</p><Link href="/login" className="admin-primary-action">Sign in to VAMNUX <ArrowRight size={15} /></Link><Link href="/" className="admin-return-link">Return to marketplace</Link></main>;
  if (adminAccess.isLoading) return <main className="admin-access-page"><div className="admin-access-mark">V</div><p>Validating server-side owner access…</p></main>;
  if (!adminAccess.data?.allowed) return <main className="admin-access-page"><div className="admin-access-mark danger"><ShieldAlert size={21} /></div><span>VAMNUX / ACCESS RESTRICTED</span><h1>Administrator<br /><em>approval required.</em></h1><p>Your signed-in account is not the approved VAMNUX owner account. No operational data or privileged controls have been loaded.</p><button type="button" onClick={logout} className="admin-secondary-action">Sign out</button><Link href="/" className="admin-return-link">Return to marketplace</Link></main>;
  return <main className="admin-access-page"><div className="admin-access-mark"><ShieldCheck size={21} /></div><span>VAMNUX / VERIFIED ADMIN</span><h1>Access<br /><em>verified.</em></h1><p>Open the protected operations workspace. Authentication and permission checks continue server-side.</p><button type="button" onClick={() => setLocation("/admin/dashboard")} className="admin-primary-action">Open Super Admin <ArrowRight size={15} /></button></main>;
}
