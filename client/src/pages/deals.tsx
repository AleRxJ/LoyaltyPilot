import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, DollarSign, Package, Users, Trophy } from "lucide-react";
import DealModal from "@/components/modals/deal-modal";
import type { Deal } from "@shared/schema";
import championBackgroundImage from "@assets/bg_1758836460974.jpg";

export default function Deals() {
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);

  const { data: deals, isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
    select: (data) => data || [],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-600 border border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-600 border border-yellow-200";
      case "rejected":
        return "bg-red-100 text-red-600 border border-red-200";
      default:
        return "bg-gray-100 text-gray-600 border border-gray-200";
    }
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(value));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div 
      className="min-h-screen bg-white relative"
      style={{
        backgroundImage: `url(${championBackgroundImage})`,
        backgroundSize: 'auto 90%',
        backgroundPosition: 'right bottom',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundColor: '#ffffff'
      }}
    >
      {/* Hero Banner */}
      <div className="relative z-10 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-left space-y-6 max-w-lg">
            <h1 className="text-6xl lg:text-7xl font-bold leading-tight text-blue-600" data-testid="text-page-title">
              My Deals
            </h1>
            <p className="text-xl text-gray-700 leading-relaxed">
              Track your sales deals and their approval status
            </p>
            <Button
              onClick={() => setIsDealModalOpen(true)}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
              data-testid="button-new-deal"
            >
              <Plus className="w-5 h-5 mr-2" />
              Register New Deal
            </Button>
          </div>
        </div>
      </div>

      {/* Deals Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="!bg-white !rounded-xl !shadow-lg !border-0">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : deals && deals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {deals.map((deal) => (
              <Card key={deal.id} className="!bg-white !rounded-xl !shadow-lg !border-0 hover:!shadow-xl transition-all duration-300 transform hover:-translate-y-1" data-testid={`card-deal-${deal.id}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1">
                      {deal.productType.charAt(0).toUpperCase() + deal.productType.slice(1)}
                    </h3>
                    <Badge className={`${getStatusColor(deal.status)} text-sm font-semibold ml-2 shrink-0 rounded-full px-3 py-1`}>
                      {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-gray-900">
                        {formatCurrency(deal.dealValue)}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span className="text-sm">
                        {deal.quantity} {deal.productType === "software" ? "licenses" : "units"}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className="text-sm">Close: {formatDate(deal.closeDate.toString())}</span>
                    </div>
                    
                    {deal.status === "pending" && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 border border-yellow-200">
                        <div className="text-sm font-medium text-yellow-700">
                          Waiting for admin approval
                        </div>
                      </div>
                    )}
                    
                    {(deal.pointsEarned || 0) > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                        <div className="text-sm font-bold text-green-700 flex items-center">
                          <Trophy className="w-4 h-4 mr-2" />
                          Points Earned: {(deal.pointsEarned || 0).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    Submitted {formatDate(deal.createdAt.toString())}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="!bg-white !rounded-xl !shadow-lg !border-0 mx-auto max-w-lg">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3" data-testid="text-no-deals-title">
                No deals yet
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed" data-testid="text-no-deals-description">
                Register your first deal to start earning points and tracking your sales performance.
              </p>
              <Button
                onClick={() => setIsDealModalOpen(true)}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
                data-testid="button-register-first-deal"
              >
                <Plus className="w-5 h-5 mr-2" />
                Register Your First Deal
              </Button>
            </CardContent>
          </Card>
        )}

        <DealModal
          isOpen={isDealModalOpen}
          onClose={() => setIsDealModalOpen(false)}
        />
      </div>
    </div>
  );
}
