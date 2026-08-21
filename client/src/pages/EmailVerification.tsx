import { CheckCircle2, CircleAlert, MailCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function EmailVerification() {
  const token = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") || "";
  const [state, setState] = useState<"checking" | "verified" | "invalid">(token ? "checking" : "invalid");
  const requested = useRef(false);
  const verify = trpc.auth.verifyEmail.useMutation({ onSuccess: (result) => setState(result.verified ? "verified" : "invalid"), onError: () => setState("invalid") });
  useEffect(() => { if (token && !requested.current) { requested.current = true; verify.mutate({ token }); } }, [token, verify]);
  return <main className="native-auth-page"><header className="native-auth-topbar"><Link href="/" className="user-brand"><span>V</span>VAM<em>NUX</em></Link><Link href="/login">Return to sign in</Link></header><section className="native-recovery-shell"><section className="native-recovery-panel native-verification-result">{state === "checking" ? <><MailCheck size={30} /><span className="native-auth-kicker">VAMNUX / EMAIL VERIFICATION</span><h1>Confirming your<br /><em>email address…</em></h1><p>Please wait while VAMNUX checks this secure one-time link.</p></> : state === "verified" ? <><CheckCircle2 size={32} /><span className="native-auth-kicker">VAMNUX / EMAIL VERIFIED</span><h1>Your email is<br /><em>verified.</em></h1><p>Your VAMNUX password account is now confirmed. You can continue to your account whenever you are ready.</p><Link href="/account" className="native-submit">Open account</Link></> : <><CircleAlert size={30} /><span className="native-auth-kicker">VAMNUX / LINK UNAVAILABLE</span><h1>This verification link<br /><em>cannot be used.</em></h1><p>It may be incomplete, expired, or already used. Sign in to your native VAMNUX account to request another email after VAMNUX account-email delivery is configured.</p><Link href="/login" className="native-submit">Return to sign in</Link></>}</section></section></main>;
}
