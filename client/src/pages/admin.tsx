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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Upload,
  UserPlus,
  Trash2,
  Edit,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import RewardModal from "@/components/modals/reward-modal";
import DealModal from "@/components/modals/deal-modal";
import { CSVUploader } from "@/components/CSVUploader";
import SupportTicketsTab from "@/components/admin/SupportTicketsTab";
import PointsConfigTab from "@/components/admin/PointsConfigTab";
import type { User, Deal, Reward } from "@shared/schema";
import type { AuthUser } from "@/lib/auth";
import type { UploadResult } from '@uppy/core';

interface ReportsData {
  userCount: number;
  dealCount: number;
  totalRevenue: number;
  redeemedRewards: number;
}

// User creation form schema
const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  country: z.string().min(1, "Country is required"),
  role: z.enum(["user", "admin"]).default("user"),
  isActive: z.boolean().default(true),
});

// User edit form schema (without password)
const editUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  country: z.string().min(1, "Country is required"),
  role: z.enum(["user", "admin"]),
  isActive: z.boolean(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;

export default function Admin() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [reportFilters, setReportFilters] = useState({
    country: "all",
    startDate: "",
    endDate: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // User creation form
  const createUserForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      country: "",
      role: "user",
      isActive: true,
    },
  });

  // User edit form
  const editUserForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      country: "",
      role: "user",
      isActive: true,
    },
  });

  // Check if user is admin
  const { data: currentUser } = useQuery<AuthUser>({
    queryKey: ["/api/auth/me"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: currentUser?.role === "admin",
  });

  // Pending users query
  const { data: pendingUsers, isLoading: pendingUsersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users/pending"],
    enabled: currentUser?.role === "admin",
  });

  // Pending reward redemptions query
  const { data: pendingRedemptions, isLoading: pendingRedemptionsLoading } = useQuery<Array<any>>({
    queryKey: ["/api/admin/rewards/pending"],
    enabled: currentUser?.role === "admin",
  });

  // All reward redemptions query
  const { data: allRedemptions, isLoading: allRedemptionsLoading } = useQuery<Array<any>>({
    queryKey: ["/api/admin/rewards/redemptions"],
    enabled: currentUser?.role === "admin",
  });

  const { data: dealsData, isLoading: dealsLoading } = useQuery<{ deals: Array<Deal & { userFirstName?: string; userLastName?: string; userName?: string }>, total: number }>({
    queryKey: ["/api/admin/deals", currentPage],
    enabled: currentUser?.role === "admin",
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", "20");
      
      const url = `/api/admin/deals?${params.toString()}`;
      const response = await fetch(url, { credentials: "include" });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const { data: pendingDeals, isLoading: pendingDealsLoading } = useQuery<Array<Deal & { userFirstName?: string; userLastName?: string; userName?: string }>>({
    queryKey: ["/api/admin/deals/pending"],
    enabled: currentUser?.role === "admin",
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ["/api/rewards"],
    enabled: currentUser?.role === "admin",
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery<ReportsData>({
    queryKey: ["/api/admin/reports", reportFilters.country, reportFilters.startDate, reportFilters.endDate],
    enabled: currentUser?.role === "admin",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reportFilters.country !== "all") params.append("country", reportFilters.country);
      if (reportFilters.startDate) params.append("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.append("endDate", reportFilters.endDate);
      
      const url = `/api/admin/reports${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, { credentials: "include" });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
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
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
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

  const handleEditDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setIsDealModalOpen(true);
  };

  const handleUpdateUserRole = (userId: string, role: string) => {
    updateUserRoleMutation.mutate({ userId, role });
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      return apiRequest("POST", "/api/admin/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setIsCreateUserModalOpen(false);
      createUserForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: EditUserForm }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setIsEditUserModalOpen(false);
      setSelectedUser(null);
      editUserForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    editUserForm.reset({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      country: user.country,
      role: user.role,
      isActive: user.isActive,
    });
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = (data: EditUserForm) => {
    if (selectedUser) {
      editUserMutation.mutate({ userId: selectedUser.id, userData: data });
    }
  };

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  // Users CSV processing mutation
  const processUsersCSVMutation = useMutation({
    mutationFn: async (csvPath: string) => {
      return apiRequest("POST", `/api/admin/csv/users/process`, { csvPath });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: `${data.message}${data.errors && data.errors.length > 0 ? `. ${data.errorCount} errors occurred.` : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process users CSV file",
        variant: "destructive",
      });
    },
  });

  const handleGetUsersCSVUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/admin/csv/users/upload-url");
    const data: any = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUsersCSVUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = (result.successful[0] as any).uploadURL;
      if (uploadURL) {
        processUsersCSVMutation.mutate(uploadURL);
      }
    }
  };

  // Approve user mutation
  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("PUT", `/api/admin/users/${userId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User approved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve user",
        variant: "destructive",
      });
    },
  });

  // Reject user mutation
  const rejectUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("PUT", `/api/admin/users/${userId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User rejected successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject user",
        variant: "destructive",
      });
    },
  });

  // Update reward shipment status mutation
  const updateShipmentStatusMutation = useMutation({
    mutationFn: async ({ redemptionId, shipmentStatus }: { redemptionId: string; shipmentStatus: string }) => {
      return apiRequest("PUT", `/api/admin/rewards/${redemptionId}/shipment`, { shipmentStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards/redemptions"] });
      toast({
        title: "Success",
        description: "Shipment status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shipment status",
        variant: "destructive",
      });
    },
  });

  const handleApproveUser = (userId: string) => {
    approveUserMutation.mutate(userId);
  };

  const handleRejectUser = (userId: string) => {
    rejectUserMutation.mutate(userId);
  };

  // Approve reward redemption mutation
  const approveRedemptionMutation = useMutation({
    mutationFn: async (redemptionId: string) => {
      return apiRequest("POST", `/api/admin/rewards/${redemptionId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards/pending"] });
      toast({
        title: "Success",
        description: "Reward redemption approved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve redemption",
        variant: "destructive",
      });
    },
  });

  // Reject reward redemption mutation
  const rejectRedemptionMutation = useMutation({
    mutationFn: async ({ redemptionId, reason }: { redemptionId: string; reason?: string }) => {
      return apiRequest("POST", `/api/admin/rewards/${redemptionId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards/pending"] });
      toast({
        title: "Success",
        description: "Reward redemption rejected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject redemption",
        variant: "destructive",
      });
    },
  });

  const handleApproveRedemption = (redemptionId: string) => {
    approveRedemptionMutation.mutate(redemptionId);
  };

  const handleRejectRedemption = (redemptionId: string, reason?: string) => {
    rejectRedemptionMutation.mutate({ redemptionId, reason });
  };

  // Delete reward mutation
  const deleteRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      return apiRequest("DELETE", `/api/admin/rewards/${rewardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
      toast({
        title: "Success",
        description: "Reward deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete reward",
        variant: "destructive",
      });
    },
  });

  const handleDeleteReward = (rewardId: string) => {
    if (confirm("Are you sure you want to delete this reward? This action cannot be undone.")) {
      deleteRewardMutation.mutate(rewardId);
    }
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
    try {
      const response = await apiRequest("POST", "/api/admin/csv/upload-url");
      const data: any = await response.json();
      
      if (!data.uploadURL) {
        console.error("No uploadURL in response:", data);
        toast({
          title: "Error", 
          description: "No upload URL received from server",
          variant: "destructive",
        });
        throw new Error("No upload URL received");
      }
      
      return {
        method: 'PUT' as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error("Error getting upload parameters:", error);
      toast({
        title: "Error",
        description: "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleCSVUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0] as any;
      
      // Try different possible properties for the upload URL
      const uploadURL = uploadedFile.uploadURL || uploadedFile.url || uploadedFile.response?.uploadURL;
      
      if (uploadURL) {
        processCSVMutation.mutate(uploadURL);
      } else {
        toast({
          title: "Error",
          description: "Failed to get upload URL from file upload",
          variant: "destructive",
        });
      }
    }
  };

  const handleExportRewardRedemptions = async () => {
    try {
      toast({
        title: "Generating Reward Redemptions Report",
        description: "Creating your Excel report...",
      });

      // Build query parameters for the redemptions export
      const params = new URLSearchParams();
      if (reportFilters.startDate) params.append("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.append("endDate", reportFilters.endDate);
      
      const url = `/api/admin/reports/reward-redemptions/export${params.toString() ? `?${params.toString()}` : ""}`;
      
      // Create a temporary download link
      const response = await fetch(url, { 
        credentials: "include",
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate reward redemptions report');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Set filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `reward-redemptions-${new Date().toISOString().split('T')[0]}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Report Downloaded",
        description: `Your reward redemptions report has been saved as ${filename}`,
      });
      
    } catch (error) {
      console.error('Error generating reward redemptions Excel report:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating your reward redemptions report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleExportDealsPerUser = async () => {
    try {
      toast({
        title: "Generating Deals per User Report",
        description: "Creating your Excel report...",
      });

      // Build query parameters for the deals per user export
      const params = new URLSearchParams();
      if (reportFilters.startDate) params.append("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.append("endDate", reportFilters.endDate);
      
      const url = `/api/admin/reports/deals-per-user/export${params.toString() ? `?${params.toString()}` : ""}`;
      
      // Create a temporary download link
      const response = await fetch(url, { 
        credentials: "include",
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate deals per user report');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Set filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `deals-per-user-${new Date().toISOString().split('T')[0]}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Report Downloaded",
        description: `Your deals per user report has been saved as ${filename}`,
      });
      
    } catch (error) {
      console.error('Error generating deals per user Excel report:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating your deals per user report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleExportUserRanking = async () => {
    try {
      toast({
        title: "Generating User Ranking",
        description: "Creating your Excel report...",
      });

      // Build query parameters for the ranking export
      const params = new URLSearchParams();
      if (reportFilters.startDate) params.append("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.append("endDate", reportFilters.endDate);
      
      const url = `/api/admin/reports/user-ranking/export${params.toString() ? `?${params.toString()}` : ""}`;
      
      // Create a temporary download link
      const response = await fetch(url, { 
        credentials: "include",
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate ranking report');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Set filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `user-ranking-${new Date().toISOString().split('T')[0]}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Ranking Downloaded",
        description: `Your user ranking has been saved as ${filename}`,
      });
      
    } catch (error) {
      console.error('Error generating ranking report:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating your ranking report. Please try again.",
        variant: "destructive"
      });
    }
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
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending Users</TabsTrigger>
          <TabsTrigger value="deals" data-testid="tab-deals">Deals</TabsTrigger>
          <TabsTrigger value="rewards" data-testid="tab-rewards">Rewards</TabsTrigger>
          <TabsTrigger value="reward-approvals" data-testid="tab-reward-approvals">Reward Approvals</TabsTrigger>
          <TabsTrigger value="reward-history" data-testid="tab-reward-history">Reward History</TabsTrigger>
          <TabsTrigger value="support" data-testid="tab-support">Support</TabsTrigger>
          <TabsTrigger value="points-config" data-testid="tab-points-config">Points Config</TabsTrigger>
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
              <div className="flex gap-3">
                <Button onClick={handleExportUserRanking} data-testid="button-export-user-ranking">
                  <Download className="w-4 h-4 mr-2" />
                  Export User Ranking (Excel)
                </Button>
                <Button onClick={handleExportRewardRedemptions} variant="secondary" data-testid="button-export-reward-redemptions">
                  <Download className="w-4 h-4 mr-2" />
                  Export Reward Redemptions (Excel)
                </Button>
                <Button onClick={handleExportDealsPerUser} variant="outline" data-testid="button-export-deals-per-user">
                  <Download className="w-4 h-4 mr-2" />
                  Export Deals per User (Excel)
                </Button>
              </div>
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
                          {deal.userFirstName && deal.userLastName 
                            ? `${deal.userFirstName} ${deal.userLastName}`
                            : deal.userName || 'Unknown User'} • {formatCurrency(deal.dealValue)} • {formatDate(deal.createdAt.toString())}
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
              <div className="flex justify-between items-center">
                <CardTitle>User Management</CardTitle>
                <div className="flex space-x-2">
                  <CSVUploader
                    onGetUploadParameters={handleGetUsersCSVUploadParameters}
                    onComplete={handleUsersCSVUploadComplete}
                    buttonClassName="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Users CSV
                  </CSVUploader>
                  <Dialog open={isCreateUserModalOpen} onOpenChange={setIsCreateUserModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-create-user">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create User
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new user to the loyalty program platform.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...createUserForm}>
                      <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={createUserForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" {...field} data-testid="input-first-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createUserForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={createUserForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="johndoe" {...field} data-testid="input-username" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={createUserForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john@example.com" {...field} data-testid="input-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={createUserForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} data-testid="input-password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={createUserForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <FormControl>
                                <Input placeholder="United States" {...field} data-testid="input-country" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={createUserForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-role">
                                      <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsCreateUserModalOpen(false)}
                            data-testid="button-cancel-create"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createUserMutation.isPending}
                            data-testid="button-submit-create"
                          >
                            {createUserMutation.isPending ? "Creating..." : "Create User"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                {/* Edit User Modal */}
                <Dialog open={isEditUserModalOpen} onOpenChange={setIsEditUserModalOpen}>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Edit User</DialogTitle>
                      <DialogDescription>
                        Update user information for {selectedUser?.firstName} {selectedUser?.lastName}.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...editUserForm}>
                      <form onSubmit={editUserForm.handleSubmit(handleUpdateUser)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={editUserForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" {...field} data-testid="input-edit-first-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editUserForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Doe" {...field} data-testid="input-edit-last-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={editUserForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="johndoe" {...field} data-testid="input-edit-username" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editUserForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john@example.com" {...field} data-testid="input-edit-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editUserForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <FormControl>
                                <Input placeholder="United States" {...field} data-testid="input-edit-country" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={editUserForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-edit-role">
                                      <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editUserForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value ? "true" : "false"}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-edit-status">
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="true">Active</SelectItem>
                                    <SelectItem value="false">Inactive</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsEditUserModalOpen(false)}
                            data-testid="button-cancel-edit"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={editUserMutation.isPending}
                            data-testid="button-submit-edit"
                          >
                            {editUserMutation.isPending ? "Updating..." : "Update User"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                CSV format: First Name, Last Name, Username, Email, Password, Country, Role
              </div>
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
                          Username
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
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
                            <div className="text-sm font-medium text-gray-900" data-testid={`text-username-${user.id}`}>
                              {user.username}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Select
                              value={user.role}
                              onValueChange={(newRole) => handleUpdateUserRole(user.id, newRole)}
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
                            <div className="flex items-center space-x-2">
                              {updateUserRoleMutation.isPending ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              ) : (
                                <span className="text-green-600">✓</span>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                data-testid={`button-edit-${user.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                                    data-testid={`button-delete-${user.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {user.firstName} {user.lastName}? 
                                      This action cannot be undone and will permanently remove the user 
                                      from the system.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel data-testid="button-cancel-delete">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                      disabled={deleteUserMutation.isPending}
                                      className="bg-red-600 hover:bg-red-700"
                                      data-testid="button-confirm-delete"
                                    >
                                      {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
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

        {/* Pending Approval Tab */}
        <TabsContent value="pending" className="mt-6">
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle>Pending User Approvals</CardTitle>
              <div className="text-sm text-gray-600 mt-2">
                New user registrations awaiting administrator approval
              </div>
            </CardHeader>
            <CardContent>
              {pendingUsersLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : pendingUsers && pendingUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Country
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registration Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingUsers.map((user: any) => (
                        <tr key={user.id} data-testid={`row-pending-user-${user.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={user.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.country}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.createdAt.toString())}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => handleApproveUser(user.id)}
                                disabled={approveUserMutation.isPending || rejectUserMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                data-testid={`button-approve-${user.id}`}
                              >
                                {approveUserMutation.isPending ? "Approving..." : "Approve"}
                              </Button>
                              <Button
                                onClick={() => handleRejectUser(user.id)}
                                disabled={approveUserMutation.isPending || rejectUserMutation.isPending}
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                                data-testid={`button-reject-${user.id}`}
                              >
                                {rejectUserMutation.isPending ? "Rejecting..." : "Reject"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8" data-testid="text-no-pending-users">
                  No pending user approvals
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
                <CSVUploader
                  onGetUploadParameters={handleGetCSVUploadParameters}
                  onComplete={handleCSVUploadComplete}
                  buttonClassName="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Deals CSV
                </CSVUploader>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                CSV format: usuario, valor, status, tipo, acuerdo (optional) (where status = pending/approved/rejected, tipo = software/hardware)
              </div>
            </CardHeader>
            <CardContent>
              {dealsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : dealsData?.deals && dealsData.deals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
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
                          License Agreement
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
                      {dealsData.deals.map((deal) => (
                        <tr key={deal.id} data-testid={`row-deal-${deal.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {deal.userFirstName && deal.userLastName 
                                  ? `${deal.userFirstName} ${deal.userLastName}`
                                  : deal.userName || 'Unknown User'}
                              </div>
                            </div>
                          </td>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-license-agreement-${deal.id}`}>
                            {deal.licenseAgreementNumber || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`${getStatusColor(deal.status)} border-0`}>
                              {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {deal.status === "pending" && (
                                <>
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
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditDeal(deal)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                data-testid={`button-edit-deal-${deal.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
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
            {dealsData && dealsData.total > 20 && (
              <div className="px-6 py-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, dealsData.total)} of {dealsData.total} deals
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-3 text-sm text-gray-600">
                      Page {currentPage} of {Math.ceil(dealsData.total / 20)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage >= Math.ceil(dealsData.total / 20)}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReward(reward);
                                setIsRewardModalOpen(true);
                              }}
                              data-testid={`button-edit-reward-${reward.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteReward(reward.id)}
                              disabled={deleteRewardMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid={`button-delete-reward-${reward.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

        {/* Reward Approvals Tab */}
        <TabsContent value="reward-approvals" className="mt-6">
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle>Pending Reward Redemptions</CardTitle>
              <div className="text-sm text-gray-600 mt-2">
                User reward redemptions awaiting administrator approval
              </div>
            </CardHeader>
            <CardContent>
              {pendingRedemptionsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : pendingRedemptions && pendingRedemptions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reward
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Requested Date
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
                      {pendingRedemptions.map((redemption: any) => (
                        <tr key={redemption.id} data-testid={`row-pending-redemption-${redemption.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {redemption.userFirstName} {redemption.userLastName}
                              </div>
                              <div className="text-sm text-gray-500">@{redemption.userName}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {redemption.rewardName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(redemption.redeemedAt.toString())}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className="bg-yellow-100 text-yellow-800">
                              {redemption.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => handleApproveRedemption(redemption.id)}
                                disabled={approveRedemptionMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                size="sm"
                                data-testid={`button-approve-redemption-${redemption.id}`}
                              >
                                {approveRedemptionMutation.isPending ? "Approving..." : "Approve"}
                              </Button>
                              <Button
                                onClick={() => handleRejectRedemption(redemption.id, "Rejected by administrator")}
                                disabled={rejectRedemptionMutation.isPending}
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                size="sm"
                                data-testid={`button-reject-redemption-${redemption.id}`}
                              >
                                {rejectRedemptionMutation.isPending ? "Rejecting..." : "Reject"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8" data-testid="text-no-pending-redemptions">
                  No pending reward redemptions
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reward History Tab */}
        <TabsContent value="reward-history" className="mt-6">
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle>All Reward Redemptions</CardTitle>
              <div className="text-sm text-gray-600 mt-2">
                Complete history of all user reward redemptions
              </div>
            </CardHeader>
            <CardContent>
              {allRedemptionsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : allRedemptions && allRedemptions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reward
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Requested Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Approved By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Approved Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Shipment Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allRedemptions.map((redemption: any) => (
                        <tr key={redemption.id} data-testid={`row-redemption-${redemption.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {redemption.userFirstName} {redemption.userLastName}
                              </div>
                              <div className="text-sm text-gray-500">@{redemption.userName}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {redemption.rewardName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {redemption.pointsCost?.toLocaleString()} points
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(redemption.redeemedAt.toString())}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`${
                              redemption.status === 'approved' ? 'bg-green-100 text-green-800' :
                              redemption.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {redemption.status === 'approved' ? 'Approved' :
                               redemption.status === 'pending' ? 'Pending' : 'Rejected'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {redemption.approvedBy ? 'Admin' : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {redemption.approvedAt ? formatDate(redemption.approvedAt.toString()) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`${
                              redemption.shipmentStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                              redemption.shipmentStatus === 'shipped' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {redemption.shipmentStatus === 'delivered' ? 'Delivered' :
                               redemption.shipmentStatus === 'shipped' ? 'Shipped' : 'Pending'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {redemption.status === 'approved' && (
                              <div className="flex space-x-2">
                                {redemption.shipmentStatus === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateShipmentStatusMutation.mutate({ 
                                      redemptionId: redemption.id, 
                                      shipmentStatus: 'shipped' 
                                    })}
                                    disabled={updateShipmentStatusMutation.isPending}
                                    className="bg-blue-600 hover:bg-blue-700"
                                    data-testid={`button-ship-${redemption.id}`}
                                  >
                                    {updateShipmentStatusMutation.isPending ? "Updating..." : "Mark Shipped"}
                                  </Button>
                                )}
                                {redemption.shipmentStatus === 'shipped' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateShipmentStatusMutation.mutate({ 
                                      redemptionId: redemption.id, 
                                      shipmentStatus: 'delivered' 
                                    })}
                                    disabled={updateShipmentStatusMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                    data-testid={`button-deliver-${redemption.id}`}
                                  >
                                    {updateShipmentStatusMutation.isPending ? "Updating..." : "Mark Delivered"}
                                  </Button>
                                )}
                                {redemption.shipmentStatus === 'delivered' && (
                                  <span className="text-green-600 font-medium">✓ Delivered</span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8" data-testid="text-no-redemptions">
                  No reward redemptions found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="mt-6">
          <SupportTicketsTab />
        </TabsContent>

        {/* Points Config Tab */}
        <TabsContent value="points-config" className="mt-6">
          <PointsConfigTab />
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
      
      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => {
          setIsDealModalOpen(false);
          setSelectedDeal(null);
        }}
        deal={selectedDeal}
      />
    </div>
  );
}
