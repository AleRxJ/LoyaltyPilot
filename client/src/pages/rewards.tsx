import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, CreditCard, Plane, Laptop, Smartphone, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Reward, UserReward } from "@shared/schema";

interface UserStats {
  availablePoints: number;
}

export default function Rewards() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/users/stats"],
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ["/api/rewards"],
    select: (data) => data || [],
  });

  const { data: userRewards, isLoading: userRewardsLoading } = useQuery<UserReward[]>({
    queryKey: ["/api/user-rewards"],
    select: (data) => data || [],
  });

  const redeemMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      return apiRequest("POST", `/api/rewards/${rewardId}/redeem`);
    },
    onSuccess: () => {
      toast({
        title: "Redemption Submitted",
        description: "Your reward redemption is pending administrator approval. You'll receive notification once approved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to redeem reward",
        variant: "destructive",
      });
    },
  });

  const handleRedeem = (reward: Reward) => {
    if (!stats || stats.availablePoints < reward.pointsCost) {
      toast({
        title: "Insufficient Points",
        description: `You need ${reward.pointsCost.toLocaleString()} points to redeem this reward.`,
        variant: "destructive",
      });
      return;
    }
    redeemMutation.mutate(reward.id);
  };

  const getRewardIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "gift cards":
        return <CreditCard className="w-6 h-6 text-white" />;
      case "travel":
        return <Plane className="w-6 h-6 text-white" />;
      case "electronics":
        return <Laptop className="w-6 h-6 text-white" />;
      case "accessories":
        return <Smartphone className="w-6 h-6 text-white" />;
      default:
        return <Gift className="w-6 h-6 text-white" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "gift cards":
        return "from-green-400 to-green-600";
      case "travel":
        return "from-blue-400 to-blue-600";
      case "electronics":
        return "from-purple-400 to-purple-600";
      case "accessories":
        return "from-orange-400 to-orange-600";
      default:
        return "from-gray-400 to-gray-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "redeemed":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const categories = Array.from(new Set(rewards?.map(reward => reward.category) || []));

  const filteredRewards = (category?: string) => {
    if (!category) return rewards || [];
    return rewards?.filter(reward => reward.category === category) || [];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
          Rewards Catalog
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <p className="text-gray-600 mb-4 sm:mb-0">
            Redeem your points for amazing rewards
          </p>
          <div className="bg-primary-50 rounded-lg px-4 py-2">
            <span className="text-sm text-primary-600 font-medium">
              Available Points: {stats?.availablePoints?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.slice(0, 4).map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
          <TabsTrigger value="my-rewards">My Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {rewardsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="shadow-material">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rewards && rewards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewards.map((reward) => (
                <Card key={reward.id} className="shadow-material" data-testid={`card-reward-${reward.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(reward.category)} rounded-lg flex items-center justify-center`}>
                        {getRewardIcon(reward.category)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                        <p className="text-sm text-gray-600">
                          {reward.pointsCost.toLocaleString()} points
                        </p>
                      </div>
                    </div>
                    
                    {reward.description && (
                      <p className="text-sm text-gray-600 mb-4">{reward.description}</p>
                    )}
                    
                    <Badge variant="outline" className="mb-4">
                      {reward.category}
                    </Badge>
                    
                    <Button
                      className="w-full"
                      onClick={() => handleRedeem(reward)}
                      disabled={!stats || stats.availablePoints < reward.pointsCost || redeemMutation.isPending}
                      data-testid={`button-redeem-${reward.id}`}
                    >
                      {!stats || stats.availablePoints < reward.pointsCost
                        ? "Insufficient Points"
                        : redeemMutation.isPending
                        ? "Redeeming..."
                        : "Redeem"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-material">
              <CardContent className="p-12 text-center">
                <Gift className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid="text-no-rewards-title">
                  No rewards available
                </h3>
                <p className="text-gray-600" data-testid="text-no-rewards-description">
                  Check back soon for new rewards to redeem with your points.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRewards(category).map((reward) => (
                <Card key={reward.id} className="shadow-material">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(reward.category)} rounded-lg flex items-center justify-center`}>
                        {getRewardIcon(reward.category)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                        <p className="text-sm text-gray-600">
                          {reward.pointsCost.toLocaleString()} points
                        </p>
                      </div>
                    </div>
                    
                    {reward.description && (
                      <p className="text-sm text-gray-600 mb-4">{reward.description}</p>
                    )}
                    
                    <Button
                      className="w-full"
                      onClick={() => handleRedeem(reward)}
                      disabled={!stats || stats.availablePoints < reward.pointsCost || redeemMutation.isPending}
                    >
                      {!stats || stats.availablePoints < reward.pointsCost
                        ? "Insufficient Points"
                        : redeemMutation.isPending
                        ? "Redeeming..."
                        : "Redeem"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="my-rewards" className="mt-6">
          {userRewardsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="shadow-material">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : userRewards && userRewards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userRewards.map((userReward) => {
                const reward = rewards?.find(r => r.id === userReward.rewardId);
                if (!reward) return null;
                
                return (
                  <Card key={userReward.id} className="shadow-material" data-testid={`card-user-reward-${userReward.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(reward.category)} rounded-lg flex items-center justify-center`}>
                          {getRewardIcon(reward.category)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                          <p className="text-sm text-gray-600">
                            Redeemed {formatDate(userReward.redeemedAt.toString())}
                          </p>
                        </div>
                      </div>
                      
                      <Badge className={`${getStatusColor(userReward.status)} border-0 mb-4`}>
                        {userReward.status.charAt(0).toUpperCase() + userReward.status.slice(1)}
                      </Badge>
                      
                      {userReward.deliveredAt && (
                        <p className="text-sm text-green-600">
                          Delivered {formatDate(userReward.deliveredAt!.toString())}
                        </p>
                      )}
                      
                      {userReward.status === "redeemed" && (
                        <p className="text-sm text-gray-600">
                          Processing your reward...
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="shadow-material">
              <CardContent className="p-12 text-center">
                <Award className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid="text-no-user-rewards-title">
                  No rewards redeemed yet
                </h3>
                <p className="text-gray-600" data-testid="text-no-user-rewards-description">
                  Start earning points from deals to redeem your first reward.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
