/** VAMNUX uses the Arcade Exchange dark editorial theme globally. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const DigitalProductDetail = lazy(() => import("./pages/DigitalProductDetail"));
const GameFamilyDetail = lazy(() => import("./pages/GameFamilyDetail"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const PolicyPage = lazy(() => import("./pages/PolicyPage"));
const CustomerAuth = lazy(() => import("./pages/CustomerAuth"));
const PublicInformationPage = lazy(() => import("./pages/PublicInformationPage"));
const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const SteamTopUp = lazy(() => import("./pages/SteamTopUp"));

function RouteLoadingFallback() {
  return <main className="route-loading-fallback" role="status" aria-live="polite"><span /><div><strong>Opening VAMNUX</strong><small>Loading this page…</small></div></main>;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/games/:family" component={GameFamilyDetail} />
        <Route path="/products/:slug" component={DigitalProductDetail} />
        <Route path="/account" component={UserDashboard} />
        <Route path="/login" component={CustomerAuth} />
        <Route path="/about" component={PublicInformationPage} />
        <Route path="/contact" component={PublicInformationPage} />
        <Route path="/blog" component={PublicInformationPage} />
        <Route path="/reseller" component={PublicInformationPage} />
        <Route path="/affiliate" component={PublicInformationPage} />
        <Route path="/game-top-up" component={PublicInformationPage} />
        <Route path="/gift-cards" component={PublicInformationPage} />
        <Route path="/gaming-vouchers" component={PublicInformationPage} />
        <Route path="/game-keys" component={PublicInformationPage} />
        <Route path="/subscriptions" component={PublicInformationPage} />
        <Route path="/ai-tools" component={PublicInformationPage} />
        <Route path="/deals" component={PublicInformationPage} />
        <Route path="/products" component={CatalogRedirect} />
        <Route path="/catalog" component={CatalogPage} />
        <Route path="/steam-top-up" component={SteamTopUp} />
        <Route path="/help" component={PublicInformationPage} />
        <Route path="/faq" component={PublicInformationPage} />
        <Route path="/support/ticket" component={PublicInformationPage} />
        <Route path="/support" component={PublicInformationPage} />
        <Route path="/track-order" component={PublicInformationPage} />
        <Route path="/terms" component={PolicyPage} />
        <Route path="/privacy" component={PolicyPage} />
        <Route path="/cookies" component={PolicyPage} />
        <Route path="/refund-policy" component={PolicyPage} />
        <Route path="/payment-policy" component={PolicyPage} />
        <Route path="/delivery-policy" component={PolicyPage} />
        <Route path="/acceptable-use" component={PolicyPage} />
        <Route path="/policies/:slug" component={PolicyPage} />
        <Route path="/admin" component={AdminEntryRedirect} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard" component={SuperAdmin} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function RoutePositionReset() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    // Footer product links on the storefront are handled in place by Home.
    // Every other internal route must open at its own page start, never at the prior footer position.
    if (location === "/" && ["products", "why-us"].includes(window.location.hash)) return;
    const root = document.documentElement;
    const priorInlineBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    root.style.scrollBehavior = priorInlineBehavior;
  }, [location]);

  return null;
}

function CatalogRedirect() {
  const [, setLocation] = useLocation();

  useLayoutEffect(() => {
    setLocation("/catalog", { replace: true });
  }, [setLocation]);

  return null;
}

function CatalogLinkRedirector() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const redirectCatalogLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target || target.hasAttribute("download")) return;
      const destination = new URL(target.href, window.location.origin);
      if (destination.origin !== window.location.origin) return;
      const category = destination.searchParams.get("category");
      const legacyCatalogTarget = destination.pathname === "/products" || (destination.pathname === "/" && (Boolean(category) || destination.hash === "#products"));
      const label = target.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
      const namedCatalogTarget = destination.pathname === "/" && /browse (catalog|marketplace|products)|explore (catalog|products)|view all products|all catalog/.test(label);
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      const buttonLabel = button?.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
      const namedCatalogAction = button instanceof HTMLButtonElement && /browse (catalog|categories|products|live inventory|active products)|reset catalog/.test(buttonLabel);
      if (!legacyCatalogTarget && !namedCatalogTarget && !namedCatalogAction) return;
      event.preventDefault();
      const normalizedCategory = category === "Steam" ? "Games" : category === "Voucher" ? "Gift cards" : category;
      setLocation(normalizedCategory && normalizedCategory !== "All" ? `/catalog?category=${encodeURIComponent(normalizedCategory)}` : "/catalog");
    };
    document.addEventListener("click", redirectCatalogLink, true);
    return () => document.removeEventListener("click", redirectCatalogLink, true);
  }, [setLocation]);

  return null;
}

function AdminEntryRedirect() {
  const [, setLocation] = useLocation();

  useLayoutEffect(() => {
    setLocation("/admin/login", { replace: true });
  }, [setLocation]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <RoutePositionReset />
          <CatalogLinkRedirector />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
