import { ArrowRight, Check, CircleAlert, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function AccountRecovery() {
  const [location, setLocation] = useLocation();
  const isReset = location.startsWith("/reset-password");
  const token = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deliveryUnavailable, setDeliveryUnavailable] = useState(false);
  const requestReset = trpc.auth.forgotPassword.useMutation({
    onSuccess: (result) => {
      setDeliveryUnavailable(!result.deliveryAvailable);
      if (result.deliveryAvailable) toast.success("If the address is connected to an active VAMNUX password account, a reset email will arrive shortly.");
    },
    onError: () => toast.error("We could not start that password-recovery request. Please try again."),
  });
  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: (result) => {
      if (!result.success) return toast.error("This password-reset link is invalid, expired, or has already been used.");
      toast.success("Your password has been reset. Please sign in with your new password.");
      setLocation("/login");
    },
    onError: () => toast.error("We could not reset that password. Check the link and password requirements, then try again."),
  });
  const passwordChecks = useMemo(() => [
    { label: "At least 12 characters", met: password.length >= 12 }, { label: "An uppercase letter", met: /[A-Z]/.test(password) }, { label: "A lowercase letter", met: /[a-z]/.test(password) }, { label: "A number", met: /\d/.test(password) }, { label: "A symbol", met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);
  const passwordReady = passwordChecks.every((check) => check.met) && password === confirmPassword;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isReset) {
      if (!token) return toast.error("This reset link is incomplete. Request a new password-reset email.");
      if (!passwordReady) return toast.error("Use a strong, matching password before continuing.");
      resetPassword.mutate({ token, password, confirmPassword });
    } else requestReset.mutate({ email });
  };
  const busy = requestReset.isPending || resetPassword.isPending;
  return <main className="native-auth-page">
    <header className="native-auth-topbar"><Link href="/" className="user-brand"><span>V</span>VAM<em>NUX</em></Link><Link href="/login">Return to sign in</Link></header>
    <section className="native-recovery-shell"><section className="native-recovery-panel"><span className="native-auth-kicker">VAMNUX / ACCOUNT SECURITY</span>{isReset ? <><KeyRound size={28} /><h1>Choose a new<br /><em>secure password.</em></h1><p>This link can be used once. After saving a new password, VAMNUX will sign out existing password-account sessions.</p></> : <><Mail size={28} /><h1>Forgot your<br /><em>password?</em></h1><p>Enter the email address used for your VAMNUX password account. To protect your privacy, the same response is shown whether or not an account exists.</p></>}<form className="native-auth-form native-recovery-form" onSubmit={submit}>{isReset ? <><label>New password<div className="native-password-input"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label><div className="native-password-checks">{passwordChecks.map((check) => <span key={check.label} className={check.met ? "met" : ""}><Check size={13} />{check.label}</span>)}</div><label>Confirm new password<input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></label></> : <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>}<button className="native-submit" type="submit" disabled={busy || (isReset && !passwordReady)}>{busy ? "Working…" : isReset ? <>Save new password <ArrowRight size={16} /></> : <>Send reset instructions <ArrowRight size={16} /></>}</button></form>{deliveryUnavailable && <div className="native-auth-deferred"><CircleAlert size={15} /><span>VAMNUX email delivery is not configured yet, so no reset email was sent and your password has not changed. Contact VAMNUX support or return after account email delivery is enabled.</span></div>}<div className="native-recovery-foot"><ShieldCheck size={16} /><span>{isReset ? "Never reuse a password from another account." : "Password-reset links expire after one hour and can only be used once."}</span></div><p className="native-auth-switch">Remembered it? <Link href="/login">Return to sign in</Link>.</p></section></section>
  </main>;
}
