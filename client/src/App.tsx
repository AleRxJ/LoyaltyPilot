import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "./lib/auth";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Deals from "@/pages/deals";
import Rewards from "@/pages/rewards";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

// Layout
import Navigation from "@/components/layout/navigation";

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const [location] = useLocation();

  // Add/remove body class for header spacing
  useEffect(() => {
    if (user) {
      document.body.classList.add('with-header');
    } else {
      document.body.classList.remove('with-header');
    }
    
    // Cleanup function
    return () => {
      if (!user) {
        document.body.classList.remove('with-header');
      }
    };
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user && location !== "/login" && location !== "/register") {
    return <Login />;
  }

  if (user && (location === "/login" || location === "/register")) {
    return <Dashboard />;
  }

  return (
    <div className={user ? "with-header-container min-h-screen bg-white" : ""}>
      {user && <Navigation user={user} />}
      <main className={user ? "pt-16" : ""}>
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/deals" component={Deals} />
      <Route path="/rewards" component={Rewards} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
