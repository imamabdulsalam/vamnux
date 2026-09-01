import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js/min";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type RegistrationDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  referralSource: string;
  password: string;
  passwordConfirmation: string;
  acceptsTerms: boolean;
};

type CountryOption = { code: CountryCode; name: string; callingCode: string };

const SIGN_IN_PATH = "/login";
const SIGN_UP_PATH = "/login?mode=signup";
const RECOVERY_PATH = "/login?mode=recovery";
const emptyDraft: RegistrationDraft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "",
  referralSource: "",
  password: "",
  passwordConfirmation: "",
  acceptsTerms: false,
};
const referralSources = [
  "Google Search",
  "Instagram",
  "TikTok",
  "Facebook",
  "X",
  "YouTube",
  "LinkedIn",
  "Telegram",
  "WhatsApp",
  "VAMNUX Blog",
  "Friend or family",
  "Referral link",
  "Online advertisement",
  "Event or community",
  "Other",
];
const inputClassName = "h-10 w-full border border-white/15 bg-[#0b0f18] px-3 text-[11px] text-white outline-none focus:border-[#b8ff43]";

function getPasswordStrength(password: string) {
  const checks = [password.length >= 12, /[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  if (!password) return { label: "Add a password", score: 0 };
  if (checks <= 2) return { label: "Weak", score: 1 };
  if (checks === 3) return { label: "Medium", score: 2 };
  if (checks === 4) return { label: "Strong", score: 3 };
  return { label: "Excellent", score: 4 };
}

function RegistrationField({ label, children, note }: { label: string; children: ReactNode; note?: string }) {
  return (
    <label className="grid gap-1.5 text-[10px] font-extrabold uppercase tracking-[.07em] text-slate-300">
      <span>{label}</span>
      {children}
      {note && <small className="text-[10px] normal-case tracking-normal text-[#b8ff43]">{note}</small>}
    </label>
  );
}

function PasswordField({ label, value, onChange, autoComplete, placeholder }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string; placeholder: string }) {
  const [visible, setVisible] = useState(false);
  return <RegistrationField label={label}><div className="customer-password-control"><input required type={visible ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${inputClassName} pr-10`} /><button type="button" onClick={() => setVisible((current) => !current)} aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} title={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}>{visible ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></RegistrationField>;
}

function AccountBenefits() {
  return (
    <div className="customer-auth-copy customer-auth-introduction">
      <span>VAMNUX / ACCOUNT ACCESS</span>
      <h1>Your digital<br /><em>space.</em></h1>
      <p>Use a protected account to access your wallet, saved products, private support tickets, account settings, and future wallet-only purchases.</p>
      <div>
        <span><ShieldCheck size={17} /> Account-scoped data</span>
        <span><WalletCards size={17} /> Wallet-only purchase policy</span>
        <span><LockKeyhole size={17} /> Server-authorised operations</span>
      </div>
    </div>
  );
}

function SecureSignIn() {
  const { data: nativeStatus } = trpc.auth.nativeStatus.useQuery();
  const nativeEnabled = nativeStatus?.enabled === true;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = trpc.auth.nativeSignIn.useMutation({
    onSuccess: () => { window.location.assign("/account"); },
    onError: () => toast.error("The email address or password is not valid, or this account still needs verification."),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Enter a valid email address before continuing.");
    if (!password) return toast.error("Enter your password before continuing.");
    if (nativeEnabled) {
      signIn.mutate({ email, password });
      return;
    }
    event.currentTarget.reset();
    setEmail("");
    setPassword("");
    toast.message("Continue in the secure sign-in service", { description: "The local fields have been cleared. Complete sign in in the configured secure provider." });
    window.setTimeout(() => startLogin(), 0);
  };

  return (
    <form onSubmit={submit} className="customer-auth-card customer-auth-card--account">
      <div className="customer-auth-card-heading"><p>SECURE SIGN IN</p><h2>Welcome back</h2><span>Enter your details to continue.</span></div>
      <div className="grid w-full gap-4">
        <RegistrationField label="Email address"><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className={inputClassName} /></RegistrationField>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" placeholder="Enter your password" />
      </div>
      <div className="customer-auth-inline-links"><span>{nativeEnabled ? "Use your VAMNUX account email and password." : "Secure provider checks apply when configured."}</span><a href={RECOVERY_PATH}>Forgot password?</a></div>
      <div className="customer-auth-choices">
        <button disabled={signIn.isPending} type="submit" className="user-primary-action">{signIn.isPending ? "Signing in…" : "Sign in securely"} <ArrowRight size={15} /></button>
        <a href={SIGN_UP_PATH} className="user-secondary-action">Create secure account <UserRound size={15} /></a>
      </div>
      <div className="customer-auth-security-badge"><ShieldCheck size={15} /><span>Protected by <strong>VAMNUX</strong> account security</span></div>
      <small>{nativeEnabled ? "Your password is sent only to the protected VAMNUX server for secure account verification. Password recovery uses the verified VAMNUX email service." : "VAMNUX checks only that the local form is complete, clears it, then opens the configured secure identity provider. Password values are not collected by this page for authentication."}</small>
    </form>
  );
}

function PasswordRecovery() {
  const { data: nativeStatus } = trpc.auth.nativeStatus.useQuery();
  const [email, setEmail] = useState("");
  const requestReset = trpc.auth.nativeRequestPasswordReset.useMutation({
    onSuccess: () => toast.success("If the account exists, a secure reset email has been sent."),
    onError: () => toast.success("If the account exists, a secure reset email has been sent."),
  });
  if (nativeStatus?.enabled) return (
    <form onSubmit={(event) => { event.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Enter a valid email address."); requestReset.mutate({ email }); }} className="customer-auth-card">
      <KeyRound size={24} />
      <p>PASSWORD RECOVERY</p>
      <h2>Reset your<br />password securely.</h2>
      <span>Enter your VAMNUX account email. If it matches a verified account, we will send a secure reset link.</span>
      <RegistrationField label="Email address"><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className={inputClassName} /></RegistrationField>
      <div className="customer-auth-choices"><button disabled={requestReset.isPending} type="submit" className="user-primary-action">{requestReset.isPending ? "Sending…" : "Send reset link"} <Mail size={15} /></button><a href={SIGN_IN_PATH} className="user-secondary-action">Back to sign in <ArrowLeft size={15} /></a></div>
    </form>
  );
  return (
    <div className="customer-auth-card">
      <KeyRound size={24} />
      <p>PASSWORD RECOVERY</p>
      <h2>Reset your<br />password securely.</h2>
      <span>Password-recovery email is not configured for VAMNUX yet. A reset link cannot be sent until a verified transactional-email and identity provider is activated.</span>
      <div className="mt-2 w-full border border-amber-300/30 bg-amber-300/5 p-3 text-[10px] leading-4 text-amber-100"><strong className="block uppercase tracking-[.06em]">Recovery status: unavailable</strong>Do not enter an email address here. When recovery is configured, this page will direct you to the verified recovery flow instead of collecting account details locally.</div>
      <div className="customer-auth-choices">
        <a href={SIGN_IN_PATH} className="user-primary-action">Back to sign in <ArrowLeft size={15} /></a>
        <a href={SIGN_UP_PATH} className="user-secondary-action">Create secure account <UserRound size={15} /></a>
      </div>
    </div>
  );
}

function NativePasswordAction({ kind, token }: { kind: "enroll" | "reset"; token: string }) {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const completeEnrollment = trpc.auth.nativeCompleteEnrollment.useMutation({
    onSuccess: () => { window.history.replaceState({}, "", SIGN_IN_PATH); window.location.assign("/account"); },
    onError: () => toast.error("This secure link is invalid, expired, or has already been used."),
  });
  const resetPassword = trpc.auth.nativeResetPassword.useMutation({
    onSuccess: () => { window.history.replaceState({}, "", SIGN_IN_PATH); window.location.assign("/account"); },
    onError: () => toast.error("This secure link is invalid, expired, or has already been used."),
  });
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const pending = completeEnrollment.isPending || resetPassword.isPending;
  const isEnrollment = kind === "enroll";
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (strength.score < 4) return toast.error("Use 12+ characters with uppercase, lowercase, a number, and a symbol.");
    if (password !== passwordConfirmation) return toast.error("Your password confirmation does not match.");
    if (isEnrollment) completeEnrollment.mutate({ token, password });
    else resetPassword.mutate({ token, password });
  };
  return (
    <form onSubmit={submit} className="customer-auth-card customer-auth-card--account">
      <KeyRound size={24} />
      <p>{isEnrollment ? "ACCOUNT VERIFICATION" : "PASSWORD RESET"}</p>
      <h2>{isEnrollment ? "Set your VAMNUX password." : "Choose a new password."}</h2>
      <span>This secure link can be used once. Choose a strong password to finish {isEnrollment ? "account verification" : "your password reset"}.</span>
      <div className="grid w-full gap-4"><PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="Create a strong password" /><PasswordField label="Confirm password" value={passwordConfirmation} onChange={setPasswordConfirmation} autoComplete="new-password" placeholder="Repeat your password" /></div>
      <small>Use at least 12 characters, including uppercase and lowercase letters, a number, and a symbol. This link expires after 30 minutes.</small>
      <div className="customer-auth-choices"><button disabled={pending} type="submit" className="user-primary-action">{pending ? "Saving…" : isEnrollment ? "Verify account" : "Reset password"} <ArrowRight size={15} /></button><a href={SIGN_IN_PATH} className="user-secondary-action"><ArrowLeft size={15} /> Back to sign in</a></div>
    </form>
  );
}

function RegistrationReadiness() {
  const { data: nativeStatus } = trpc.auth.nativeStatus.useQuery();
  const [draft, setDraft] = useState<RegistrationDraft>(emptyDraft);
  const countries = useMemo<CountryOption[]>(() => {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    return getCountries()
      .map((code) => ({ code, name: displayNames.of(code) || code, callingCode: `+${getCountryCallingCode(code)}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);
  const selectedCountry = countries.find((country) => country.name === draft.country);
  const strength = useMemo(() => getPasswordStrength(draft.password), [draft.password]);
  const passwordMatch = Boolean(draft.password) && draft.password === draft.passwordConfirmation;
  const update = (field: keyof RegistrationDraft, value: string | boolean) => setDraft((current) => ({ ...current, [field]: value }));
  const register = trpc.auth.nativeRegister.useMutation({
    onSuccess: () => toast.success("Check your email for the secure VAMNUX account-setup link."),
    onError: () => toast.error("We could not start email verification. Please try again later."),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.email.trim() || !selectedCountry) return toast.error("Choose a country from the list and complete your name and email before continuing.");
    if (!/^\S+@\S+\.\S+$/.test(draft.email)) return toast.error("Enter a valid email address.");
    if (!draft.acceptsTerms) return toast.error("Confirm that you accept the Terms and Privacy Policy before continuing.");
    if (nativeStatus?.enabled) {
      const registration = { email: draft.email, firstName: draft.firstName, lastName: draft.lastName, phone: draft.phone || undefined, countryCode: selectedCountry?.code, referralSource: draft.referralSource || undefined };
      register.mutate(registration);
      return;
    }
    if (strength.score < 4) return toast.error("Use a strong password with 12+ characters, upper/lowercase letters, a number, and a symbol.");
    if (!passwordMatch) return toast.error("Your password confirmation does not match.");
    setDraft((current) => ({ ...current, password: "", passwordConfirmation: "" }));
    toast.message("Continue in the secure account service", { description: "Your draft password is cleared locally. Complete account creation and verification in the configured secure provider." });
    startLogin();
  };

  return (
    <form onSubmit={submit} className="customer-auth-card customer-auth-card--account customer-auth-card--signup">
      <div className="customer-auth-card-heading"><p>CREATE SECURE ACCOUNT</p><h2>Create your account</h2><span>{nativeStatus?.enabled ? "Enter your details, then set your password from the secure VAMNUX email we send you." : "Enter your details, then complete secure account creation with VAMNUX’s configured identity provider."}</span></div>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <RegistrationField label="First name"><input required autoComplete="given-name" value={draft.firstName} onChange={(event) => update("firstName", event.target.value)} placeholder="Your first name" className={inputClassName} /></RegistrationField>
        <RegistrationField label="Last name"><input required autoComplete="family-name" value={draft.lastName} onChange={(event) => update("lastName", event.target.value)} placeholder="Your last name" className={inputClassName} /></RegistrationField>
        <RegistrationField label="Email address"><input required type="email" autoComplete="email" value={draft.email} onChange={(event) => update("email", event.target.value)} placeholder="name@example.com" className={inputClassName} /></RegistrationField>
        <RegistrationField label="Country" note={selectedCountry ? `Calling code ${selectedCountry.callingCode}` : undefined}><div className="relative"><input required list="vamnux-country-options" autoComplete="country-name" value={draft.country} onChange={(event) => update("country", event.target.value)} placeholder="Type to find country" className={`${inputClassName} pr-8`} /><ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-3 text-[#b8ff43]" size={15} /><datalist id="vamnux-country-options">{countries.map((country) => <option key={country.code} value={country.name} label={`${country.name} (${country.callingCode})`} />)}</datalist></div></RegistrationField>
        <RegistrationField label="Phone number · optional"><div className="flex h-10 border border-white/15 bg-[#0b0f18] focus-within:border-[#b8ff43]"><span className="flex min-w-12 items-center justify-center border-r border-white/15 px-3 text-[11px] font-bold text-[#b8ff43]">{selectedCountry?.callingCode || "+"}</span><input type="tel" autoComplete="tel-national" value={draft.phone} onChange={(event) => update("phone", event.target.value.replace(/[^0-9\s()-]/g, ""))} placeholder={selectedCountry ? "Remaining local number" : "Choose country first"} className="min-w-0 flex-1 bg-transparent px-3 text-[11px] text-white outline-none" /></div></RegistrationField>
        <RegistrationField label="How did you hear about us?"><select value={draft.referralSource} onChange={(event) => update("referralSource", event.target.value)} className={inputClassName}><option value="">Select an option</option>{referralSources.map((source) => <option key={source} value={source}>{source}</option>)}</select></RegistrationField>
        {!nativeStatus?.enabled && <><PasswordField label="Password" value={draft.password} onChange={(value) => update("password", value)} autoComplete="new-password" placeholder="Create a strong password" /><PasswordField label="Confirm password" value={draft.passwordConfirmation} onChange={(value) => update("passwordConfirmation", value)} autoComplete="new-password" placeholder="Repeat your password" /></>}
      </div>
      {!nativeStatus?.enabled && <section className="mt-3 w-full border border-white/10 bg-white/5 p-3.5"><div className="flex items-center gap-2"><KeyRound className="text-[#b8ff43]" size={16} /><strong className="text-[11px] uppercase tracking-[.07em] text-white">Password requirements · {strength.label}</strong></div><p className="mt-2 text-[11px] leading-5 text-slate-300">Use at least 12 characters with uppercase and lowercase letters, a number, and a symbol. The two password fields must match.</p><div className="mt-3 grid grid-cols-4 gap-2 text-center text-[9px]"><span className={strength.score >= 1 ? "border-t-2 border-rose-400 pt-1 text-rose-300" : "border-t-2 border-slate-600 pt-1 text-slate-400"}>Weak</span><span className={strength.score >= 2 ? "border-t-2 border-amber-300 pt-1 text-amber-200" : "border-t-2 border-slate-600 pt-1 text-slate-400"}>Medium</span><span className={strength.score >= 3 ? "border-t-2 border-[#b8ff43] pt-1 text-[#b8ff43]" : "border-t-2 border-slate-600 pt-1 text-slate-400"}>Strong</span><span className={strength.score >= 4 ? "border-t-2 border-sky-300 pt-1 text-sky-300" : "border-t-2 border-slate-600 pt-1 text-slate-400"}>Excellent</span></div>{draft.passwordConfirmation && <p className={passwordMatch ? "mt-2 flex items-center gap-1 text-[10px] text-[#b8ff43]" : "mt-2 text-[10px] text-rose-300"}>{passwordMatch ? <><CheckCircle2 size={12} /> Passwords match</> : "Passwords do not match"}</p>}</section>}
      <section className="mt-3 w-full border border-white/10 bg-white/5 p-3.5 text-[11px] leading-5 text-slate-300"><div className="flex gap-2"><ShieldCheck className="shrink-0 text-[#b8ff43]" size={17} /><p><strong className="text-white">I’m not a robot verification.</strong> A real CAPTCHA widget appears only after VAMNUX configures a provider and server-side token verification. This page does not imitate or bypass a CAPTCHA challenge.</p></div></section>
      <label className="mt-3 flex w-full items-start gap-2 text-[11px] leading-5 text-slate-300"><input required checked={draft.acceptsTerms} onChange={(event) => update("acceptsTerms", event.target.checked)} type="checkbox" className="mt-1 accent-[#b8ff43]" />I agree to the VAMNUX Terms of Service and Privacy Policy.</label>
      <div className="customer-auth-choices"><button disabled={register.isPending} type="submit" className="user-primary-action">{register.isPending ? "Sending verification…" : nativeStatus?.enabled ? "Send verification link" : "Create secure account"} <ArrowRight size={15} /></button><a href={SIGN_IN_PATH} className="user-secondary-action"><ArrowLeft size={15} /> Back to sign in</a></div>
      <div className="customer-auth-security-badge"><ShieldCheck size={15} /><span>Protected by <strong>VAMNUX</strong> account security</span></div>
      <small>{nativeStatus?.enabled ? "VAMNUX stores only a secure password hash. We will send a verified account-setup link before the account can sign in." : "When you continue, VAMNUX clears local password values and hands off to the configured secure identity provider."} Do not enter supplier, wallet, payment, or recovery credentials here.</small>
    </form>
  );
}

export default function CustomerAuth() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const accountMode = new URLSearchParams(window.location.search).get("mode");
  const nativeAction = useMemo(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const enrollToken = hash.get("native-enroll");
    const resetToken = hash.get("native-reset");
    if (enrollToken) return { kind: "enroll" as const, token: enrollToken };
    if (resetToken) return { kind: "reset" as const, token: resetToken };
    return null;
  }, []);
  useEffect(() => { if (!loading && user) setLocation("/account"); }, [loading, setLocation, user]);
  if (!loading && user) return null;
  const mode = accountMode === "signup" ? "signup" : accountMode === "recovery" ? "recovery" : "signin";
  return <main className="customer-auth-page"><header><Link href="/" className="user-brand"><span>V</span>VAM<em>NUX</em></Link><Link href="/">Return to marketplace</Link></header><section className="customer-auth-layout"><div className="customer-auth-stage"><AccountBenefits />{nativeAction ? <NativePasswordAction kind={nativeAction.kind} token={nativeAction.token} /> : mode === "signup" ? <RegistrationReadiness /> : mode === "recovery" ? <PasswordRecovery /> : <SecureSignIn />}</div></section></main>;
}
