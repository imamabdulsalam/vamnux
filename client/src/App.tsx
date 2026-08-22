/** VAMNUX uses the Arcade Exchange dark editorial theme globally. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useLayoutEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DigitalProductDetail from "./pages/DigitalProductDetail";
import GameFamilyDetail from "./pages/GameFamilyDetail";
import Home from "./pages/Home";
import UserDashboard from "./pages/UserDashboard";
import AdminLogin from "./pages/AdminLogin";
import SuperAdmin from "./pages/SuperAdmin";
import PolicyPage from "./pages/PolicyPage";
import CustomerAuth from "./pages/CustomerAuth";
import PublicInformationPage from "./pages/PublicInformationPage";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
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
      <Route path="/products" component={PublicInformationPage} />
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
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={SuperAdmin} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function RoutePositionReset() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    // Footer product links on the storefront are handled in place by Home.
    // Every other internal route must open at its own page start, never at the prior footer position.
    if (location === "/" && window.location.hash === "products") return;
    const root = document.documentElement;
    const priorInlineBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    root.style.scrollBehavior = priorInlineBehavior;
  }, [location]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <RoutePositionReset />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
