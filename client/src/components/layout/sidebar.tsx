import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Gift,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  className?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const adminNavItems: NavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Dashboard and analytics"
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    description: "Manage user accounts"
  },
  {
    href: "/admin/deals",
    label: "Deals",
    icon: ClipboardCheck,
    description: "Review and approve deals"
  },
  {
    href: "/admin/rewards",
    label: "Rewards",
    icon: Gift,
    description: "Manage reward catalog"
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: BarChart3,
    description: "Generate analytics reports"
  },
];

export default function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "relative flex h-screen flex-col border-r bg-white shadow-sm transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">LP</span>
            </div>
            <span className="font-semibold text-gray-900">Admin Panel</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0"
          data-testid="button-toggle-sidebar"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || 
            (item.href !== "/admin" && location.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-12",
                  isCollapsed ? "px-2" : "px-3",
                  isActive && "bg-primary-600 text-white hover:bg-primary-700",
                  !isActive && "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
                {!isCollapsed && (
                  <div className="text-left">
                    <div className="font-medium">{item.label}</div>
                    {item.description && (
                      <div className="text-xs opacity-75">{item.description}</div>
                    )}
                  </div>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t">
        <Link href="/admin/settings">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-12",
              isCollapsed ? "px-2" : "px-3",
              "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            )}
            data-testid="nav-settings"
          >
            <Settings className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
            {!isCollapsed && (
              <div className="text-left">
                <div className="font-medium">Settings</div>
                <div className="text-xs opacity-75">System configuration</div>
              </div>
            )}
          </Button>
        </Link>
      </div>
    </div>
  );
}
