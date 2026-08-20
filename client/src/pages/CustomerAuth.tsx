import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Check, CircleAlert, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type AuthMode = "register" | "signin";

const SOURCES = ["Google", "Facebook", "Instagram", "TikTok", "X", "YouTube", "WhatsApp", "Friend", "Referral", "Advertisement", "Other"] as const;
const COUNTRIES = [
  ["US", "United States"], ["GB", "United Kingdom"], ["CA", "Canada"], ["AU", "Australia"], ["DE", "Germany"], ["FR", "France"], ["NG", "Nigeria"], ["GH", "Ghana"], ["KE", "Kenya"], ["ZA", "South Africa"], ["IN", "India"], ["AE", "United Arab Emirates"], ["BR", "Brazil"], ["OTHER", "Other"],
] as const;

export default function CustomerAuth() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<AuthMode>(() => location === "/register" ? "register" : "signin");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [email, setEmail] = useState("");
  const [registrationSource, setRegistrationSource] = useState<(typeof SOURCES)[number] | "">("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => { if (!loading && user) setLocation("/account"); }, [loading, setLocation, user]);

  const register = trpc.auth.nativeRegister.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Your VAMNUX account was created. Email verification is not configured yet, so no verification email was sent.");
      setLocation("/account");
    },
    onError: () => toast.error("We could not create an account with those details. Please check the form and try again."),
  });
  const signIn = trpc.auth.nativeSignIn.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Signed in to your VAMNUX account.");
      setLocation("/account");
    },
    onError: () => toast.error("We could not sign in with those details."),
  });

  const passwordChecks = useMemo(() => [
    { label: "At least 12 characters", met: password.length >= 12 },
    { label: "An uppercase letter", met: /[A-Z]/.test(password) },
    { label: "A lowercase letter", met: /[a-z]/.test(password) },
    { label: "A number", met: /\d/.test(password) },
    { label: "A symbol", met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);
  const passwordReady = passwordChecks.every((check) => check.met) && password === confirmPassword;

  function submitRegistration(event: FormEvent) {
    event.preventDefault();
    if (!passwordReady || !termsAccepted) {
      toast.error("Choose a stronger matching password and accept the Terms and Privacy Policy.");
      return;
    }
    register.mutate({ firstName, lastName, countryCode: countryCode === "OTHER" ? "ZZ" : countryCode, email, registrationSource: registrationSource || null, phone: phone || null, password, confirmPassword, termsAccepted, marketingConsent });
  }

  function submitSignIn(event: FormEvent) {
    event.preventDefault();
    signIn.mutate({ email, password });
  }

  if (!loading && user) return null;
  const isBusy = register.isPending || signIn.isPending;

  return <main className="native-auth-page">
    <header className="native-auth-topbar"><Link href="/" className="user-brand"><span>V</span>VAM<em>NUX</em></Link><Link href="/">Return to marketplace</Link></header>
    <section className="native-auth-layout">
      <aside className="native-auth-aside">
        <span className="native-auth-kicker">VAMNUX / ACCOUNT</span>
        <h1>Digital access,<br /><em>built for you.</em></h1>
        <p>Create one secure VAMNUX account to manage your private wallet activity, orders, saved products, support, and account settings.</p>
        <div className="native-auth-trust">
          <span><ShieldCheck size={18} /><b>Private account data</b><small>Your dashboard and records stay scoped to your VAMNUX account.</small></span>
          <span><WalletCards size={18} /><b>Wallet-first checkout</b><small>Product access remains governed by your settled VAMNUX wallet balance.</small></span>
          <span><LockKeyhole size={18} /><b>Protected sign-in</b><small>Your password is never displayed, stored as plain text, or sent to the browser after submission.</small></span>
        </div>
        <p className="native-auth-aside-note">Existing customers may continue with secure Manus OAuth while native VAMNUX accounts are introduced alongside it.</p>
      </aside>

      <section className="native-auth-panel" aria-live="polite">
        <div className="native-auth-tabs" role="tablist"><button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">Create account</button><button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")} type="button">Sign in</button></div>
        {mode === "register" ? <form onSubmit={submitRegistration} className="native-auth-form">
          <div className="native-auth-heading"><UserRound size={23} /><div><span>NEW VAMNUX ACCOUNT</span><h2>Create your account</h2><p>Enter your details to start a secure VAMNUX account.</p></div></div>
          <div className="native-form-grid"><label>First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" required /></label><label>Last name<input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" required /></label></div>
          <label>Country<select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} required>{COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <div className="native-form-grid"><label>How did you hear about VAMNUX?<select value={registrationSource} onChange={(event) => setRegistrationSource(event.target.value as (typeof SOURCES)[number] | "")}><option value="">Select one (optional)</option>{SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}</select></label><label>Phone number <small>Optional</small><input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" /></label></div>
          <label>Password<div className="native-password-input"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
          <div className="native-password-checks">{passwordChecks.map((check) => <span key={check.label} className={check.met ? "met" : ""}><Check size={13} />{check.label}</span>)}</div>
          <label>Confirm password<div className="native-password-input"><input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />{confirmPassword && <span className={password === confirmPassword ? "native-match match" : "native-match"}>{password === confirmPassword ? "Matches" : "Does not match"}</span>}</div></label>
          <label className="native-consent"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} required /><span>I agree to the <Link href="/policies/terms-of-service">draft Terms</Link> and <Link href="/policies/privacy-policy">draft Privacy Policy</Link>.</span></label>
          <label className="native-consent"><input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} /><span>I would like optional VAMNUX updates. You can change this in your account preferences.</span></label>
          <button className="native-submit" type="submit" disabled={isBusy || !passwordReady || !termsAccepted}>{isBusy ? "Creating account…" : <>Create secure account <ArrowRight size={16} /></>}</button>
          <div className="native-auth-deferred"><CircleAlert size={15} /><span>Email verification and password-recovery email are not configured yet. Never rely on this screen to verify email delivery.</span></div>
          <p className="native-auth-switch">Already have an account? <button onClick={() => setMode("signin")} type="button">Sign in</button> or <button onClick={() => startLogin()} type="button">use Manus OAuth</button>.</p>
        </form> : <form onSubmit={submitSignIn} className="native-auth-form native-signin-form">
          <div className="native-auth-heading"><LockKeyhole size={23} /><div><span>VAMNUX PASSWORD ACCOUNT</span><h2>Welcome back</h2><p>Sign in to your VAMNUX account using the email and password you created here.</p></div></div>
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label>Password<div className="native-password-input"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
          <button className="native-submit" type="submit" disabled={isBusy}>{isBusy ? "Signing in…" : <>Sign in <ArrowRight size={16} /></>}</button>
          <p className="native-auth-deferred"><CircleAlert size={15} /><span>Password recovery is not available until VAMNUX configures transactional email.</span></p>
          <p className="native-auth-switch">New to VAMNUX? <button onClick={() => setMode("register")} type="button">Create an account</button> or <button onClick={() => startLogin()} type="button">use Manus OAuth</button>.</p>
        </form>}
      </section>
    </section>
  </main>;
}
