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
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import DealModal from "@/components/modals/deal-modal";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import type { AuthUser } from "@/lib/auth";
import backgroundImage from "@assets/BANNER-PRINICPAL_1758666220909.jpg";

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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [, navigate] = useLocation();

  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/auth/me"],
  });

  // Redirect admin users to admin panel
  useEffect(() => {
    if (user && user.role === "admin") {
      navigate("/admin");
    }
  }, [user, navigate]);

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/users/stats"],
  });

  const { data: recentDeals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals/recent"],
    select: (data) => data || [],
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ["/api/rewards"],
    select: (data) => data || [],
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<Array<{
    userId: string;
    username: string;
    firstName: string;
    lastName: string;
    totalPoints: number;
  }>>({
    queryKey: ["/api/users/leaderboard"],
    select: (data) => data || [],
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

  // Carousel navigation functions
  const itemsPerSlide = 3;
  const totalSlides = rewards ? Math.ceil(rewards.length / itemsPerSlide) : 0;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const getCurrentRewards = () => {
    if (!rewards) return [];
    const startIndex = currentSlide * itemsPerSlide;
    return rewards.slice(startIndex, startIndex + itemsPerSlide);
  };

  const handleImageError = (rewardId: string) => {
    setFailedImages(prev => new Set(Array.from(prev).concat(rewardId)));
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dashboard Header */}
      <div className="mb-8">
        <div 
          className="relative rounded-xl overflow-hidden shadow-material min-h-[400px] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/20"></div>
          
          {user.role !== "admin" ? (
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start p-8 min-h-[400px]">
              {/* Left side - Welcome Message */}
              <div className="flex-1 flex flex-col justify-center">
                <h1 className="text-4xl lg:text-5xl font-bold mb-2 text-white leading-tight" data-testid="text-welcome">
                  Welcome back<br />{user.firstName} {user.lastName}!
                </h1>
              </div>
              
              {/* Right side - Stats Cards */}
              <div className="flex flex-col space-y-4 mt-8 lg:mt-0 lg:ml-8 min-w-[280px]">
                {/* Available Points Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <Coins className="text-gray-700 h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-600 text-sm">Available Points</div>
                    <div className="text-2xl font-bold text-gray-900" data-testid="text-available-points">
                      {statsLoading ? "..." : stats?.availablePoints?.toLocaleString() || "0"}
                    </div>
                    <div className="text-gray-500 text-xs">Ready to redeem</div>
                  </div>
                </div>

                {/* Pending Deals Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <Handshake className="text-gray-700 h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-600 text-sm">Pending Deals</div>
                    <div className="text-2xl font-bold text-gray-900" data-testid="text-pending-deals">
                      {statsLoading ? "..." : stats?.pendingDeals || "0"}
                    </div>
                    <div className="text-gray-500 text-xs">Awaiting approval</div>
                  </div>
                </div>

                {/* Redeemed Rewards Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <Gift className="text-gray-700 h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-600 text-sm">Redeemed Rewards</div>
                    <div className="text-2xl font-bold text-gray-900" data-testid="text-redeemed-rewards">
                      {statsLoading ? "..." : stats?.redeemedRewards || "0"}
                    </div>
                    <div className="text-gray-500 text-xs">Lifetime total</div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="relative z-10 p-8 min-h-[400px] flex items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2 text-white" data-testid="text-welcome">
                  Welcome back, {user.firstName} {user.lastName}!
                </h1>
                <p className="text-white text-lg" data-testid="text-admin-role">
                  <span className="font-medium">System Administrator</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contest Rules - Only show for regular users */}
      {user.role !== "admin" && (
        <div className="mb-12">
          <Card className="shadow-material bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-8">
              {/* Welcome Text */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-blue-900 mb-3" data-testid="text-contest-title">
                  Welcome to the Rewards Program!
                </h2>
                <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                  Register your deals and earn points based on their value. The more deals you close, the more rewards you can unlock!
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Points Calculation Box */}
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Coins className="text-white h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900" data-testid="text-points-calculation-title">
                      Points Calculation
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="font-semibold text-gray-800">Software</span>
                      <span className="text-blue-600 font-bold">$1,000 = 1 point</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="font-semibold text-gray-800">Hardware</span>
                      <span className="text-purple-600 font-bold">$5,000 = 1 point</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="font-semibold text-gray-800">Equipment</span>
                      <span className="text-orange-600 font-bold">$10,000 = 1 point</span>
                    </div>
                  </div>
                </div>

                {/* Grand Prize Box */}
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-6 shadow-md text-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Gift className="text-white h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold" data-testid="text-grand-prize-title">
                      Grand Prize
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                      <div className="text-4xl font-bold mb-2">50,000 Points</div>
                      <p className="text-sm opacity-90">
                        Reach this milestone to unlock our exclusive grand prize!
                      </p>
                    </div>
                    <p className="text-sm opacity-90 leading-relaxed">
                      Keep registering deals and watch your points grow. Every deal gets you closer to the ultimate reward!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard - Only show for regular users */}
      {user.role !== "admin" && (
        <div className="mb-12">
          <Card className="shadow-material">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-white h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900" data-testid="text-leaderboard-title">
                      Top Performers
                    </h2>
                    <p className="text-sm text-gray-600">Users with the most points</p>
                  </div>
                </div>
              </div>

              {leaderboardLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((leaderUser, index) => {
                    const isCurrentUser = leaderUser.userId === user.id;
                    const position = index + 1;
                    
                    // Medal colors for top 3
                    const getMedalColor = () => {
                      if (position === 1) return "from-yellow-400 to-yellow-600";
                      if (position === 2) return "from-gray-400 to-gray-600";
                      if (position === 3) return "from-orange-400 to-orange-600";
                      return "from-blue-400 to-blue-600";
                    };

                    return (
                      <div
                        key={leaderUser.userId}
                        className={`flex items-center space-x-4 p-4 rounded-lg transition-all ${
                          isCurrentUser 
                            ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 shadow-lg transform scale-105" 
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                        data-testid={`leaderboard-item-${position}`}
                      >
                        {/* Position Badge */}
                        <div className={`w-12 h-12 bg-gradient-to-br ${getMedalColor()} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white font-bold text-lg">
                            {position}
                          </span>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className={`font-semibold truncate ${isCurrentUser ? "text-blue-900" : "text-gray-900"}`}>
                              {leaderUser.firstName} {leaderUser.lastName}
                            </h3>
                            {isCurrentUser && (
                              <Badge className="bg-blue-600 text-white">You</Badge>
                            )}
                          </div>
                          <p className={`text-sm ${isCurrentUser ? "text-blue-700" : "text-gray-600"}`}>
                            @{leaderUser.username}
                          </p>
                        </div>

                        {/* Points */}
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${isCurrentUser ? "text-blue-900" : "text-gray-900"}`}>
                            {leaderUser.totalPoints.toLocaleString()}
                          </div>
                          <div className={`text-sm ${isCurrentUser ? "text-blue-700" : "text-gray-600"}`}>
                            points
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">No leaderboard data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Available Rewards Carousel - Only show for regular users */}
      {user.role !== "admin" && (
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-blue-600 mb-2" data-testid="text-available-rewards-title">
              Available Rewards
            </h2>
          </div>
          
          <div className="relative px-4 py-4">
            {/* Carousel Container */}
            <div className="flex justify-center items-center space-x-6">
              {/* Left Arrow */}
              <Button
                variant="ghost"
                size="sm"
                onClick={prevSlide}
                disabled={totalSlides <= 1}
                className="p-2 hover:bg-gray-100 disabled:opacity-50 z-10"
                data-testid="button-prev-slide"
              >
                <ChevronLeft className="h-6 w-6 text-gray-600" />
              </Button>

              {/* Rewards Cards */}
              <div className="flex space-x-6 overflow-visible">
                {rewardsLoading ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl shadow-lg p-6 w-80 flex-shrink-0"
                    >
                      <Skeleton className="h-32 w-full rounded-lg mb-4" />
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))
                ) : (
                  getCurrentRewards().map((reward) => (
                    <div
                      key={reward.id}
                      className="bg-white rounded-2xl shadow-lg p-6 w-80 flex-shrink-0 hover:shadow-xl transition-shadow cursor-pointer"
                      data-testid={`card-featured-reward-${reward.id}`}
                    >
                      {/* Reward Image */}
                      <div className="relative mb-4 h-32 rounded-lg overflow-hidden">
                        {reward.imageUrl && !failedImages.has(reward.id) ? (
                          <img
                            src={reward.imageUrl}
                            alt={reward.name}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(reward.id)}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center rounded-lg">
                            <div className="text-white text-center">
                              <Gift className="w-8 h-8 mx-auto mb-2" />
                              <div className="text-sm font-medium">{reward.category}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Reward Info */}
                      <div>
                        <h3 className="text-lg font-bold text-blue-600 mb-2" data-testid={`text-reward-name-${reward.id}`}>
                          {reward.name}
                        </h3>
                        <p className="text-gray-600 text-sm" data-testid={`text-reward-points-${reward.id}`}>
                          {reward.pointsCost} points
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right Arrow */}
              <Button
                variant="ghost"
                size="sm"
                onClick={nextSlide}
                disabled={totalSlides <= 1}
                className="p-2 hover:bg-gray-100 disabled:opacity-50 z-10"
                data-testid="button-next-slide"
              >
                <ChevronRight className="h-6 w-6 text-gray-600" />
              </Button>
            </div>

            {/* Pagination Dots */}
            {totalSlides > 1 && (
              <div className="flex justify-center mt-6 space-x-2">
                {Array.from({ length: totalSlides }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentSlide
                        ? 'bg-blue-600'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    data-testid={`button-slide-${index}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Deals - Only show for regular users */}
      {user.role !== "admin" && (
        <div className="flex justify-center">
          <div className="w-full max-w-5xl">
          <div className="bg-blue-900 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-5">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">Recent Deals</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-blue-800 hover:text-white" 
                  data-testid="button-view-all-deals"
                >
                  View All
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              {dealsLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-20 bg-blue-800" />
                      <Skeleton className="h-4 w-32 bg-blue-800" />
                      <Skeleton className="h-4 w-16 bg-blue-800" />
                      <Skeleton className="h-4 w-16 bg-blue-800" />
                      <Skeleton className="h-6 w-20 bg-blue-800" />
                    </div>
                  ))}
                </div>
              ) : recentDeals && recentDeals.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-blue-950 border-b border-blue-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                        PRODUCT
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                        VALUE
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                        POINTS
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                        STATUS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-800">
                    {recentDeals.map((deal) => (
                      <tr key={deal.id} data-testid={`row-deal-${deal.id}`} className="hover:bg-blue-800/60 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          {deal.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {formatCurrency(deal.dealValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          {deal.pointsEarned?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              deal.status === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : deal.status === 'pending' 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                            data-testid={`status-${deal.status}-${deal.id}`}
                          >
                            {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-white/70" data-testid="text-no-deals">
                  No deals found. Register your first deal to get started!
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
      />
    </div>
  );
}
