import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Bell, ChevronDown, Menu, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { setLanguage, getLanguage } from "@/lib/i18n";
import type { AuthUser } from "@/lib/auth";

interface NavigationProps {
  user: AuthUser;
}

export default function Navigation({ user }: NavigationProps) {
  console.log('Navigation component received user:', user);
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(getLanguage());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear all queries from cache
      queryClient.clear();
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      // Immediate redirect to login page
      setTimeout(() => {
        setLocation("/login");
      }, 100);
    },
    onError: () => {
      // Even if logout fails, redirect to login
      queryClient.clear();
      setLocation("/login");
    },
  });

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as any);
    setCurrentLanguage(lang as any);
    window.location.reload(); // Simple reload to apply language changes
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = user.role === "admin" 
    ? [
        { href: "/admin", label: "Admin Panel", current: location === "/admin" },
      ]
    : [
        { href: "/", label: "Dashboard", current: location === "/" },
        { href: "/deals", label: "My Deals", current: location === "/deals" },
        { href: "/rewards", label: "Rewards", current: location === "/rewards" },
      ];

  const userInitials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  // Debug log to check navigation rendering
  console.log('Navigation rendering for user:', user.role, 'at location:', location, 'navItems:', navItems);
  console.log('Navigation component is rendering with user:', user.username, 'role:', user.role);

  return (
    <nav 
      className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50" 
      style={{
        backgroundColor: 'white', 
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'block',
        visibility: 'visible',
        opacity: 1,
        width: '100%',
        minHeight: '64px'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Link href="/">
                <h1 className="text-xl font-bold text-blue-600 cursor-pointer" data-testid="logo">
                  LoyaltyPro
                </h1>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <button
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        item.current
                          ? "text-blue-600 bg-blue-50"
                          : "text-gray-700 hover:text-blue-600"
                      }`}
                      data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                    >
                      {item.label}
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Language, Notifications, User Menu */}
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <Select value={currentLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-auto border-gray-300" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
              </SelectContent>
            </Select>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-accent-500 text-white text-xs">
                3
              </Badge>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2" data-testid="button-user-menu">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900" data-testid="text-user-name">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-gray-500" data-testid="text-partner-level">
                      {user.partnerLevel.charAt(0).toUpperCase() + user.partnerLevel.slice(1)} Partner
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem data-testid="menu-profile">Profile</DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-settings">Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                      item.current
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid={`mobile-nav-${item.label.toLowerCase().replace(" ", "-")}`}
                  >
                    {item.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
