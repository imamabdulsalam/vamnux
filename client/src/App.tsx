/** VAMNUX uses the Arcade Exchange dark editorial theme globally. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DigitalProductDetail from "./pages/DigitalProductDetail";
import GameFamilyDetail from "./pages/GameFamilyDetail";
import Home from "./pages/Home";
import UserDashboard from "./pages/UserDashboard";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/games/:family" component={GameFamilyDetail} />
      <Route path="/products/:slug" component={DigitalProductDetail} />
      <Route path="/account" component={UserDashboard} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
