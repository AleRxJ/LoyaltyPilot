import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Coins, 
  Handshake, 
  Gift, 
  DollarSign, 
  Plus, 
  BarChart3,
  Users,
  ClipboardCheck,
  TrendingUp
} from "lucide-react";
import DealModal from "@/components/modals/deal-modal";
import { useState } from "react";
import type { AuthUser } from "@/lib/auth";

interface UserStats {
  totalPoints: number;
  availablePoints: number;
  totalDeals: number;
  pendingDeals: number;
  redeemedRewards: number;
}

interface Deal {
  id: string;
  productName: string;
  dealValue: string;
  pointsEarned: number;
  status: string;
  createdAt: string;
}

interface Reward {
  id: string;
  name: string;
  pointsCost: number;
  category: string;
  imageUrl?: string;
}

export default function Dashboard() {
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);

  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/auth/me"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/users/stats"],
  });

  const { data: recentDeals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals/recent"],
    select: (data) => data || [],
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ["/api/rewards"],
    select: (data) => data?.slice(0, 3) || [],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(value));
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white shadow-material">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl font-bold mb-2 text-white" data-testid="text-welcome">
                Welcome back, {user.firstName} {user.lastName}!
              </h1>
              <p className="text-primary-100" data-testid="text-partner-info">
                Partner Level: <span className="font-medium">
                  {user.partnerLevel.charAt(0).toUpperCase() + user.partnerLevel.slice(1)} Partner
                </span>
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <div className="text-center">
                <div className="text-3xl font-bold" data-testid="text-total-points">
                  {statsLoading ? "..." : stats?.totalPoints?.toLocaleString() || "0"}
                </div>
                <div className="text-primary-200 text-sm">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold" data-testid="text-total-deals">
                  {statsLoading ? "..." : stats?.totalDeals || "0"}
                </div>
                <div className="text-primary-200 text-sm">Total Deals</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-material">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-secondary-50">
                <Coins className="text-secondary-500 h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Points</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-semibold text-gray-900" data-testid="text-available-points">
                    {stats?.availablePoints?.toLocaleString() || "0"}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-secondary-600">Ready to redeem</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-material">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary-50">
                <Handshake className="text-primary-500 h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Deals</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-semibold text-gray-900" data-testid="text-pending-deals">
                    {stats?.pendingDeals || "0"}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-orange-600">Awaiting approval</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-material">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-accent-50">
                <Gift className="text-accent-500 h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Redeemed Rewards</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-semibold text-gray-900" data-testid="text-redeemed-rewards">
                    {stats?.redeemedRewards || "0"}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-600">Lifetime total</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-material">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-50">
                <TrendingUp className="text-green-500 h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-semibold text-gray-900">+15%</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-green-600">Points growth</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Deals */}
        <div className="lg:col-span-2">
          <Card className="shadow-material">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Recent Deals</h3>
                <Button variant="ghost" size="sm" className="text-primary-600" data-testid="button-view-all-deals">
                  View All
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              {dealsLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : recentDeals && recentDeals.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentDeals.map((deal) => (
                      <tr key={deal.id} data-testid={`row-deal-${deal.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {deal.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatCurrency(deal.dealValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {deal.pointsEarned || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={`${getStatusColor(deal.status)} border-0`}>
                            {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-gray-500" data-testid="text-no-deals">
                  No deals found. Register your first deal to get started!
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Actions & Rewards */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="shadow-material">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  className="w-full bg-primary-600 hover:bg-primary-700"
                  onClick={() => setIsDealModalOpen(true)}
                  data-testid="button-register-deal"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Register New Deal
                </Button>
                <Button className="w-full bg-secondary-600 hover:bg-secondary-700" data-testid="button-browse-rewards">
                  <Gift className="w-4 h-4 mr-2" />
                  Browse Rewards
                </Button>
                <Button variant="outline" className="w-full" data-testid="button-view-reports">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Reports
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Available Rewards Preview */}
          <Card className="shadow-material">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Available Rewards</h3>
                <Button variant="ghost" size="sm" className="text-primary-600" data-testid="button-view-all-rewards">
                  View All
                </Button>
              </div>
            </div>
            <div className="p-6">
              {rewardsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : rewards && rewards.length > 0 ? (
                <div className="space-y-4">
                  {rewards.map((reward) => (
                    <div
                      key={reward.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      data-testid={`card-reward-${reward.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-accent-400 to-accent-600 rounded-lg flex items-center justify-center">
                          <Gift className="text-white h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{reward.name}</h4>
                          <p className="text-sm text-gray-600">
                            {reward.pointsCost.toLocaleString()} points
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500" data-testid="text-no-rewards">
                  No rewards available
                </div>
              )}
            </div>
          </Card>

          {/* Admin Panel - Only show for admin users */}
          {user.role === "admin" && (
            <Card className="shadow-material">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Administrative Panel</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-manage-users">
                    <Users className="w-4 h-4 mr-2" />
                    User Management
                  </Button>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-review-deals">
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Deal Approval
                  </Button>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-view-analytics">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
      />
    </div>
  );
}
