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
import RegisterWithInvite from "@/pages/register-invite";
import PasswordlessLogin from "@/pages/passwordless-login";
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";

// Layout
import Navigation from "@/components/layout/navigation";
import SupportButton from "@/components/SupportButton";

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error, isFetching } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 1 * 60 * 1000, // 1 minute (reduced for faster updates)
    gcTime: 2 * 60 * 1000, // 2 minutes (reduced for faster cleanup)
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnReconnect: true,
  });

  const [location, setLocation] = useLocation();


  // Always add header class when user exists or is loading
  useEffect(() => {
    if (user || isLoading || isFetching) {
      document.body.classList.add('with-header');
    } else {
      document.body.classList.remove('with-header');
    }
    
    // Cleanup function
    return () => {
      document.body.classList.remove('with-header');
    };
  }, [user, isLoading, isFetching]);

  // Redirect authenticated users away from login/register pages
  useEffect(() => {
    if (user && (location === "/login" || location === "/register" || location.startsWith("/passwordless-login"))) {
      // Use the appropriate redirect based on user role
      const redirectPath = user.role === "admin" ? "/admin" : "/";
      setLocation(redirectPath);
    }
  }, [user, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Allow access to register and passwordless-login pages without authentication
  if (!user && location !== "/login" && location !== "/register" && !location.startsWith("/passwordless-login")) {
    return <Login />;
  }

  return (
    <div className={user ? "with-header-container min-h-screen bg-white" : ""}>
      {user && <Navigation user={user} />}
      <main className={user ? "pt-0" : ""}>
        {children}
      </main>
      {user && <SupportButton />}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={RegisterWithInvite} />
      <Route path="/passwordless-login" component={PasswordlessLogin} />
      <Route path="/" component={Dashboard} />
      <Route path="/deals" component={Deals} />
      <Route path="/rewards" component={Rewards} />
      <Route path="/profile" component={ProfilePage} />
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
