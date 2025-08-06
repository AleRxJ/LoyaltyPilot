import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, DollarSign, Package } from "lucide-react";
import DealModal from "@/components/modals/deal-modal";
import type { Deal } from "@shared/schema";

export default function Deals() {
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);

  const { data: deals, isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
            My Deals
          </h1>
          <p className="text-gray-600">
            Track your sales deals and their approval status
          </p>
        </div>
        <Button
          onClick={() => setIsDealModalOpen(true)}
          className="mt-4 sm:mt-0"
          data-testid="button-new-deal"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Deal
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="shadow-material">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map((deal) => (
            <Card key={deal.id} className="shadow-material" data-testid={`card-deal-${deal.id}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {deal.productName}
                  </CardTitle>
                  <Badge className={`${getStatusColor(deal.status)} border-0 ml-2 shrink-0`}>
                    {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span className="font-medium text-gray-900">
                      {formatCurrency(deal.dealValue)}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Package className="w-4 h-4 mr-2" />
                    <span>
                      {deal.quantity} {deal.productType === "software" ? "licenses" : "units"}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Close: {formatDate(deal.closeDate.toString())}</span>
                  </div>
                  
                  {(deal.pointsEarned || 0) > 0 && (
                    <div className="bg-green-50 rounded-lg p-3 mt-4">
                      <div className="text-sm font-medium text-green-800">
                        Points Earned: {(deal.pointsEarned || 0).toLocaleString()}
                      </div>
                    </div>
                  )}
                  
                  {deal.status === "pending" && (
                    <div className="bg-yellow-50 rounded-lg p-3 mt-4">
                      <div className="text-sm text-yellow-800">
                        Waiting for admin approval
                      </div>
                    </div>
                  )}
                  
                  {deal.status === "rejected" && (
                    <div className="bg-red-50 rounded-lg p-3 mt-4">
                      <div className="text-sm text-red-800">
                        Deal was rejected
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                  Submitted {formatDate(deal.createdAt.toString())}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-material">
          <CardContent className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid="text-no-deals-title">
              No deals yet
            </h3>
            <p className="text-gray-600 mb-6" data-testid="text-no-deals-description">
              Register your first deal to start earning points and tracking your sales performance.
            </p>
            <Button
              onClick={() => setIsDealModalOpen(true)}
              data-testid="button-register-first-deal"
            >
              <Plus className="w-4 h-4 mr-2" />
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
  );
}
