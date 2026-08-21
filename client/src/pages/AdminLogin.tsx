import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function AdminLogin() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [mfaCode, setMfaCode] = useState("");
  const [method, setMethod] = useState<"totp" | "recovery">("totp");
  const mfaRequired = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mfa") === "required";
  const completingMfa = trpc.auth.completeAdminMfa.useMutation({ onSuccess: () => setLocation("/admin/dashboard"), onError: (error) => toast.error(error.message || "Authenticator verification failed.") });
  if (mfaRequired) return <main className="admin-access-page"><form onSubmit={(event) => { event.preventDefault(); completingMfa.mutate({ code: mfaCode, method }); }} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-2xl"><span>VAMNUX / SUPER ADMIN</span><h1>Verify<br /><em>authenticator.</em></h1><p>Enter a current six-digit code from your authenticator app. If unavailable, use one saved recovery code.</p><div className="mt-5 flex gap-2"><button type="button" onClick={() => setMethod("totp")} className={method === "totp" ? "admin-primary-action" : "admin-secondary-action"}>Authenticator code</button><button type="button" onClick={() => setMethod("recovery")} className={method === "recovery" ? "admin-primary-action" : "admin-secondary-action"}>Recovery code</button></div><label className="mt-5 block text-xs font-bold text-[#d7e0ef]">{method === "totp" ? "Six-digit code" : "Recovery code"}<input autoFocus value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} placeholder={method === "totp" ? "123456" : "ABCD-EFGH-IJKL"} className="mt-2 h-12 w-full rounded-lg border border-white/15 bg-[#0b0e16] px-3 text-white outline-none focus:border-[#b8ff43]" /></label><button type="submit" disabled={completingMfa.isPending} className="admin-primary-action mt-5 w-full">{completingMfa.isPending ? "Verifying…" : "Verify and continue"}</button></form></main>;
  if (loading) return <main className="admin-access-page"><div className="admin-access-mark">V</div><p>Validating secure administrator access…</p></main>;
  if (!user) return <main className="admin-access-page"><div className="admin-access-mark">V</div><span>VAMNUX / SUPER ADMIN</span><h1>Secure operations<br /><em>only.</em></h1><p>Sign in through the configured secure identity flow. Admin authorization is verified again on every protected server request.</p><button type="button" onClick={() => startLogin()} className="admin-primary-action">Secure sign in <ArrowRight size={15} /></button><Link href="/" className="admin-return-link">Return to marketplace</Link></main>;
  if (user.role !== "admin") return <main className="admin-access-page"><div className="admin-access-mark danger"><ShieldAlert size={21} /></div><span>VAMNUX / ACCESS RESTRICTED</span><h1>Administrator<br /><em>approval required.</em></h1><p>Your current account does not have Super Admin authorization. No operational data or privileged controls have been loaded.</p><button type="button" onClick={logout} className="admin-secondary-action">Sign out</button><Link href="/" className="admin-return-link">Return to marketplace</Link></main>;
  return <main className="admin-access-page"><div className="admin-access-mark"><ShieldCheck size={21} /></div><span>VAMNUX / VERIFIED ADMIN</span><h1>Access<br /><em>verified.</em></h1><p>Open the protected operations workspace. Authentication and permission checks continue server-side.</p><button type="button" onClick={() => setLocation("/admin/dashboard")} className="admin-primary-action">Open Super Admin <ArrowRight size={15} /></button></main>;
}
