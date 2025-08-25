import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  ClipboardCheck, 
  BarChart3, 
  Gift, 
  Plus,
  Check,
  X,
  Download,
  Calendar,
  MapPin,
  Award,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import RewardModal from "@/components/modals/reward-modal";
import { CSVUploader } from "@/components/CSVUploader";
import type { User, Deal, Reward } from "@shared/schema";
import type { AuthUser } from "@/lib/auth";
import type { UploadResult } from '@uppy/core';

interface ReportsData {
  userCount: number;
  dealCount: number;
  totalRevenue: number;
  redeemedRewards: number;
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [reportFilters, setReportFilters] = useState({
    country: "all",
    partnerLevel: "all",
    startDate: "",
    endDate: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is admin
  const { data: currentUser } = useQuery<AuthUser>({
    queryKey: ["/api/auth/me"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: currentUser?.role === "admin",
  });

  const { data: allDeals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/admin/deals"],
    enabled: currentUser?.role === "admin",
  });

  const { data: pendingDeals, isLoading: pendingDealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/admin/deals/pending"],
    enabled: currentUser?.role === "admin",
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ["/api/rewards"],
    enabled: currentUser?.role === "admin",
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery<ReportsData>({
    queryKey: ["/api/admin/reports", reportFilters],
    enabled: currentUser?.role === "admin",
  });

  const approveDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return apiRequest("POST", `/api/deals/${dealId}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals/pending"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve deal",
        variant: "destructive",
      });
    },
  });

  const rejectDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return apiRequest("POST", `/api/deals/${dealId}/reject`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal rejected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals/pending"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject deal",
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role, partnerLevel }: { userId: string; role: string; partnerLevel: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role, partnerLevel });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handleApproveDeal = (dealId: string) => {
    approveDealMutation.mutate(dealId);
  };

  const handleRejectDeal = (dealId: string) => {
    rejectDealMutation.mutate(dealId);
  };

  const handleUpdateUserRole = (userId: string, role: string, partnerLevel: string) => {
    updateUserRoleMutation.mutate({ userId, role, partnerLevel });
  };

  const processCSVMutation = useMutation({
    mutationFn: async (csvPath: string) => {
      return apiRequest("POST", `/api/admin/csv/process`, { csvPath });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: `${data.message}${data.errors ? `. ${data.errors.length} errors occurred.` : ''}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals/pending"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process CSV file",
        variant: "destructive",
      });
    },
  });

  const handleGetCSVUploadParameters = async () => {
    const response: any = await apiRequest("POST", "/api/admin/csv/upload-url");
    return {
      method: 'PUT' as const,
      url: response.uploadURL,
    };
  };

  const handleCSVUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = (result.successful[0] as any).uploadURL;
      if (uploadURL) {
        processCSVMutation.mutate(uploadURL);
      }
    }
  };

  const handleExportReport = () => {
    toast({
      title: "Export Started",
      description: "Your report is being generated and will download shortly.",
    });
  };

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

  if (currentUser?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">
                You don't have permission to access the admin panel.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-admin-title">
          Administrative Panel
        </h1>
        <p className="text-gray-600">
          Manage users, approve deals, and generate reports
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="deals" data-testid="tab-deals">Deals</TabsTrigger>
          <TabsTrigger value="rewards" data-testid="tab-rewards">Rewards</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="shadow-material">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-primary-50">
                    <Users className="text-primary-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    {reportsLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-semibold text-gray-900" data-testid="text-total-users">
                        {reportsData?.userCount || 0}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-material">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-secondary-50">
                    <ClipboardCheck className="text-secondary-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Deals</p>
                    {reportsLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-semibold text-gray-900" data-testid="text-total-deals">
                        {reportsData?.dealCount || 0}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-material">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-50">
                    <BarChart3 className="text-green-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    {reportsLoading ? (
                      <Skeleton className="h-8 w-20 mt-1" />
                    ) : (
                      <p className="text-2xl font-semibold text-gray-900" data-testid="text-total-revenue">
                        {formatCurrency(reportsData?.totalRevenue || 0)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-material">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-accent-50">
                    <Gift className="text-accent-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Redeemed Rewards</p>
                    {reportsLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-semibold text-gray-900" data-testid="text-redeemed-rewards">
                        {reportsData?.redeemedRewards || 0}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reports Section */}
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle>Generate Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={reportFilters.country}
                    onValueChange={(value) => setReportFilters(prev => ({ ...prev, country: value }))}
                  >
                    <SelectTrigger data-testid="select-report-country">
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="MX">Mexico</SelectItem>
                      <SelectItem value="BR">Brazil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="partnerLevel">Partner Level</Label>
                  <Select
                    value={reportFilters.partnerLevel}
                    onValueChange={(value) => setReportFilters(prev => ({ ...prev, partnerLevel: value }))}
                  >
                    <SelectTrigger data-testid="select-report-partner-level">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="platinum">Platinum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
              <Button onClick={handleExportReport} data-testid="button-export-report">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </CardContent>
          </Card>

          {/* Pending Deals Quick View */}
          <Card className="shadow-material mt-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Pending Deals</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("deals")}
                  data-testid="button-view-all-pending"
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pendingDealsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : pendingDeals && pendingDeals.length > 0 ? (
                <div className="space-y-4">
                  {pendingDeals.slice(0, 5).map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{deal.productName}</h4>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(deal.dealValue)} • {formatDate(deal.createdAt.toString())}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveDeal(deal.id)}
                          disabled={approveDealMutation.isPending}
                          data-testid={`button-approve-${deal.id}`}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectDeal(deal.id)}
                          disabled={rejectDealMutation.isPending}
                          data-testid={`button-reject-${deal.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8" data-testid="text-no-pending-deals">
                  No pending deals to review
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : users && users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Partner Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Country
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} data-testid={`row-user-${user.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Select
                              value={user.role}
                              onValueChange={(newRole) => handleUpdateUserRole(user.id, newRole, user.partnerLevel)}
                              disabled={updateUserRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-24" data-testid={`select-role-${user.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Select
                              value={user.partnerLevel}
                              onValueChange={(newLevel) => handleUpdateUserRole(user.id, user.role, newLevel)}
                              disabled={updateUserRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-32" data-testid={`select-partner-level-${user.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bronze">Bronze</SelectItem>
                                <SelectItem value="silver">Silver</SelectItem>
                                <SelectItem value="gold">Gold</SelectItem>
                                <SelectItem value="platinum">Platinum</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.country}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.createdAt.toString())}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {updateUserRoleMutation.isPending ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            ) : (
                              <span className="text-green-600">✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8" data-testid="text-no-users">
                  No users found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals" className="mt-6">
          <Card className="shadow-material">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Deal Management</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      console.log("Current user:", currentUser);
                      console.log("User role:", currentUser?.role);
                      toast({
                        title: "Debug Info",
                        description: `User: ${currentUser?.username}, Role: ${currentUser?.role}`,
                      });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Debug User
                  </Button>
                  <Button
                    onClick={() => {
                      console.log("CSV Upload clicked");
                      toast({
                        title: "CSV Upload",
                        description: "Button clicked successfully",
                      });
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-upload-csv-test"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                CSV format: usuario, valor, status, tipo (where status = pending/approved/rejected, tipo = software/hardware)
              </div>
            </CardHeader>
            <CardContent>
              {dealsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : allDeals && allDeals.length > 0 ? (
                <div className="overflow-x-auto">
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
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allDeals.map((deal) => (
                        <tr key={deal.id} data-testid={`row-deal-${deal.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {deal.productName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {deal.quantity} {deal.productType === "software" ? "licenses" : "units"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(deal.dealValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline">
                              {deal.productType.charAt(0).toUpperCase() + deal.productType.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`${getStatusColor(deal.status)} border-0`}>
                              {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {deal.status === "pending" && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveDeal(deal.id)}
                                  disabled={approveDealMutation.isPending}
                                  data-testid={`button-approve-deal-${deal.id}`}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectDeal(deal.id)}
                                  disabled={rejectDealMutation.isPending}
                                  data-testid={`button-reject-deal-${deal.id}`}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8" data-testid="text-no-deals">
                  No deals found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="mt-6">
          <Card className="shadow-material">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Reward Management</CardTitle>
                <Button
                  onClick={() => {
                    setSelectedReward(null);
                    setIsRewardModalOpen(true);
                  }}
                  data-testid="button-add-reward"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Reward
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rewardsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : rewards && rewards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rewards.map((reward) => (
                    <Card key={reward.id} className="border" data-testid={`card-admin-reward-${reward.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-accent-400 to-accent-600 rounded-lg flex items-center justify-center">
                            <Gift className="text-white h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{reward.name}</h4>
                            <p className="text-sm text-gray-600">
                              {reward.pointsCost.toLocaleString()} points
                            </p>
                          </div>
                        </div>
                        
                        <Badge variant="outline" className="mb-3">
                          {reward.category}
                        </Badge>
                        
                        {reward.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {reward.description}
                          </p>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <Badge className={reward.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {reward.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReward(reward);
                              setIsRewardModalOpen(true);
                            }}
                            data-testid={`button-edit-reward-${reward.id}`}
                          >
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Gift className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid="text-no-rewards-admin">
                    No rewards configured
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Add rewards for users to redeem with their points.
                  </p>
                  <Button
                    onClick={() => {
                      setSelectedReward(null);
                      setIsRewardModalOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Reward
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RewardModal
        isOpen={isRewardModalOpen}
        onClose={() => {
          setIsRewardModalOpen(false);
          setSelectedReward(null);
        }}
        reward={selectedReward}
      />
    </div>
  );
}
