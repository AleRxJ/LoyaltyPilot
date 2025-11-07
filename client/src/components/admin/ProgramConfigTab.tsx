import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Save, RefreshCw, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  multiplier: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface RegionConfig {
  id: string;
  region: string;
  category: string;
  subcategory: string | null;
  name: string;
  newCustomerGoalRate: number;
  renewalGoalRate: number;
  monthlyGoalTarget: number | null;
  isActive: boolean;
  expirationDate: string | null;
}

export default function ProgramConfigTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [activeSubTab, setActiveSubTab] = useState("campaigns");
  
  // Campaign form states
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    description: "",
    multiplier: "1.5",
    startDate: "",
    endDate: "",
  });

  // Region config form states
  const [isCreateRegionConfigOpen, setIsCreateRegionConfigOpen] = useState(false);
  const [regionConfigForm, setRegionConfigForm] = useState({
    region: "",
    category: "",
    subcategory: "",
    name: "",
    newCustomerGoalRate: 1000,
    renewalGoalRate: 2000,
    monthlyGoalTarget: 0,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  // Establecer región basada en el rol del usuario
  useEffect(() => {
    if (currentUser) {
      const user = currentUser as any;
      if (user.role === "regional-admin") {
        const userRegion = user.region || user.country || "";
        setSelectedRegion(userRegion);
      } else if (user.role === "admin" || user.role === "super-admin") {
        // Para admin/super-admin, establecer región por defecto si no hay una seleccionada
        if (!selectedRegion) {
          setSelectedRegion("NOLA");
        }
      }
    }
  }, [currentUser, selectedRegion]);

  // Queries
  const { data: campaigns, isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/admin/campaigns", selectedRegion],
    enabled: !!selectedRegion,
  });

  const { data: regionConfigs, isLoading: regionConfigsLoading } = useQuery<RegionConfig[]>({
    queryKey: ["/api/admin/region-configs", selectedRegion],
    enabled: !!selectedRegion,
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof campaignForm) => {
      return apiRequest("POST", "/api/admin/campaigns", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", selectedRegion] });
      setIsCreateCampaignOpen(false);
      setCampaignForm({
        name: "",
        description: "",
        multiplier: "1.5",
        startDate: "",
        endDate: "",
      });
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  // Toggle campaign status mutation
  const toggleCampaignMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/admin/campaigns/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", selectedRegion] });
      toast({
        title: "Success",
        description: "Campaign status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign",
        variant: "destructive",
      });
    },
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", selectedRegion] });
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  // Create region config mutation
  const createRegionConfigMutation = useMutation({
    mutationFn: async (data: typeof regionConfigForm) => {
      return apiRequest("POST", "/api/admin/region-configs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/region-configs", selectedRegion] });
      setIsCreateRegionConfigOpen(false);
      setRegionConfigForm({
        region: "",
        category: "",
        subcategory: "",
        name: "",
        newCustomerGoalRate: 1000,
        renewalGoalRate: 2000,
        monthlyGoalTarget: 0,
      });
      toast({
        title: "Success",
        description: "Region configuration created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create region configuration",
        variant: "destructive",
      });
    },
  });

  // Toggle region config status mutation
  const toggleRegionConfigMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/admin/region-configs/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/region-configs", selectedRegion] });
      toast({
        title: "Success",
        description: "Region configuration status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update region configuration",
        variant: "destructive",
      });
    },
  });

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    createCampaignMutation.mutate(campaignForm);
  };

  const handleCreateRegionConfig = (e: React.FormEvent) => {
    e.preventDefault();
    createRegionConfigMutation.mutate(regionConfigForm);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('admin.programConfig.title')}</h2>
          <p className="text-muted-foreground">
            {t('admin.programConfig.description')}
          </p>
        </div>
      </div>

      {/* Selector de Región */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Región</h3>
            {currentUser && (currentUser as any).role === "regional-admin" ? (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {selectedRegion}
                </Badge>
                <span className="text-xs text-gray-500">
                  (Como administrador regional, solo puedes gestionar la configuración de tu región)
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Selecciona una región" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOLA">NOLA</SelectItem>
                    <SelectItem value="SOLA">SOLA</SelectItem>
                    <SelectItem value="BRASIL">BRASIL</SelectItem>
                    <SelectItem value="MEXICO">MEXICO</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-500">
                  Selecciona una región para gestionar su configuración del programa
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">{t('admin.programConfig.campaignsTab')}</TabsTrigger>
          <TabsTrigger value="regions">{t('admin.programConfig.regionsGoals')}</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('admin.programConfig.campaigns.title')}</CardTitle>
                  <CardDescription>
                    {t('admin.programConfig.campaigns.description')}
                  </CardDescription>
                </div>
                <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('admin.programConfig.campaigns.newCampaign')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('admin.programConfig.campaigns.createCampaign')}</DialogTitle>
                      <DialogDescription>
                        {t('admin.programConfig.campaigns.campaignDescription')}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateCampaign} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="campaignName">{t('admin.programConfig.campaigns.campaignName')}</Label>
                        <Input
                          id="campaignName"
                          value={campaignForm.name}
                          onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                          placeholder={t('admin.programConfig.campaigns.campaignNamePlaceholder')}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="campaignDescription">{t('admin.programConfig.campaigns.campaignDesc')}</Label>
                        <Textarea
                          id="campaignDescription"
                          value={campaignForm.description}
                          onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                          placeholder={t('admin.programConfig.campaigns.descriptionPlaceholder')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="campaignMultiplier">{t('admin.programConfig.campaigns.pointsMultiplier')}</Label>
                        <Select
                          value={campaignForm.multiplier}
                          onValueChange={(value) => setCampaignForm({ ...campaignForm, multiplier: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1.25">1.25x (25% bonus)</SelectItem>
                            <SelectItem value="1.5">1.5x (50% bonus)</SelectItem>
                            <SelectItem value="2.0">2.0x (Double points)</SelectItem>
                            <SelectItem value="3.0">3.0x (Triple points)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="campaignStartDate">{t('admin.programConfig.campaigns.startDate')}</Label>
                          <Input
                            id="campaignStartDate"
                            type="date"
                            value={campaignForm.startDate}
                            onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                            min={new Date().toISOString().split('T')[0]}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="campaignEndDate">{t('admin.programConfig.campaigns.endDate')}</Label>
                          <Input
                            id="campaignEndDate"
                            type="date"
                            value={campaignForm.endDate}
                            onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                            min={campaignForm.startDate || new Date().toISOString().split('T')[0]}
                            required
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={createCampaignMutation.isPending}>
                        {createCampaignMutation.isPending ? t('admin.programConfig.campaigns.creating') : t('admin.programConfig.campaigns.createCampaign')}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="space-y-4">
                  <div className="h-20 bg-muted animate-pulse rounded" />
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </div>
              ) : campaigns && campaigns.length > 0 ? (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <Card key={campaign.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{campaign.name}</h3>
                              <Badge variant={campaign.isActive ? "default" : "secondary"}>
                                {campaign.isActive ? t('admin.programConfig.campaigns.active') : t('admin.programConfig.campaigns.inactive')}
                              </Badge>
                            </div>
                            {campaign.description && (
                              <p className="text-sm text-muted-foreground">{campaign.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium text-primary">
                                {campaign.multiplier}x {t('admin.programConfig.campaigns.multiplier')}
                              </span>
                              <span className="text-muted-foreground">
                                {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleCampaignMutation.mutate({ id: campaign.id, isActive: !campaign.isActive })}
                            >
                              {campaign.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('admin.programConfig.campaigns.deleteCampaign')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('admin.programConfig.campaigns.deleteConfirmation').replace('{name}', campaign.name)}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('admin.programConfig.campaigns.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t('admin.programConfig.campaigns.delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">{t('admin.programConfig.campaigns.noCampaigns')}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsCreateCampaignOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('admin.programConfig.campaigns.createFirst')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regions & Goals Tab */}
        <TabsContent value="regions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('admin.programConfig.regions.title')}</CardTitle>
                  <CardDescription>
                    {t('admin.programConfig.regions.description')}
                  </CardDescription>
                </div>
                <Dialog open={isCreateRegionConfigOpen} onOpenChange={setIsCreateRegionConfigOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Region Config
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Region Configuration</DialogTitle>
                      <DialogDescription>
                        Set up custom goal rates for a specific region and category
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateRegionConfig} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="region">Region</Label>
                          <Select
                            value={regionConfigForm.region}
                            onValueChange={(value) => setRegionConfigForm({ ...regionConfigForm, region: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NOLA">NOLA</SelectItem>
                              <SelectItem value="SOLA">SOLA</SelectItem>
                              <SelectItem value="BRASIL">BRASIL</SelectItem>
                              <SelectItem value="MEXICO">MEXICO</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={regionConfigForm.category}
                            onValueChange={(value) => setRegionConfigForm({ ...regionConfigForm, category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                              <SelectItem value="SMB">SMB</SelectItem>
                              <SelectItem value="MSSP">MSSP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subcategory">Subcategory (Optional)</Label>
                          <Input
                            id="subcategory"
                            value={regionConfigForm.subcategory}
                            onChange={(e) => setRegionConfigForm({ ...regionConfigForm, subcategory: e.target.value })}
                            placeholder="e.g., COLOMBIA, PLATINUM"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="configName">Configuration Name</Label>
                          <Input
                            id="configName"
                            value={regionConfigForm.name}
                            onChange={(e) => setRegionConfigForm({ ...regionConfigForm, name: e.target.value })}
                            placeholder="e.g., NOLA ENTERPRISE COLOMBIA"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newCustomerGoalRate">New Customer Goal Rate (USD)</Label>
                          <Input
                            id="newCustomerGoalRate"
                            type="number"
                            value={regionConfigForm.newCustomerGoalRate}
                            onChange={(e) => setRegionConfigForm({ ...regionConfigForm, newCustomerGoalRate: parseInt(e.target.value) })}
                            required
                          />
                          <p className="text-xs text-muted-foreground">USD needed for 1 goal</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="renewalGoalRate">Renewal Goal Rate (USD)</Label>
                          <Input
                            id="renewalGoalRate"
                            type="number"
                            value={regionConfigForm.renewalGoalRate}
                            onChange={(e) => setRegionConfigForm({ ...regionConfigForm, renewalGoalRate: parseInt(e.target.value) })}
                            required
                          />
                          <p className="text-xs text-muted-foreground">USD needed for 1 goal</p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="monthlyGoalTarget">Monthly Goal Target (Optional)</Label>
                          <Input
                            id="monthlyGoalTarget"
                            type="number"
                            value={regionConfigForm.monthlyGoalTarget}
                            onChange={(e) => setRegionConfigForm({ ...regionConfigForm, monthlyGoalTarget: parseInt(e.target.value) })}
                          />
                          <p className="text-xs text-muted-foreground">Goals needed to qualify for monthly prize draw</p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={createRegionConfigMutation.isPending}>
                        {createRegionConfigMutation.isPending ? "Creating..." : "Create Configuration"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {regionConfigsLoading ? (
                <div className="space-y-4">
                  <div className="h-20 bg-muted animate-pulse rounded" />
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </div>
              ) : regionConfigs && regionConfigs.length > 0 ? (
                <div className="space-y-4">
                  {regionConfigs.map((config) => (
                    <Card key={config.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{config.name}</h3>
                              <Badge variant={config.isActive ? "default" : "secondary"}>
                                {config.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <div className="grid gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Region:</span>
                                <Badge variant="outline">{config.region}</Badge>
                                <Badge variant="outline">{config.category}</Badge>
                                {config.subcategory && <Badge variant="outline">{config.subcategory}</Badge>}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-muted-foreground">
                                  New Customer: <strong>${config.newCustomerGoalRate}</strong> = 1 goal
                                </span>
                                <span className="text-muted-foreground">
                                  Renewal: <strong>${config.renewalGoalRate}</strong> = 1 goal
                                </span>
                              </div>
                              {config.monthlyGoalTarget && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Monthly Target: <strong>{config.monthlyGoalTarget}</strong> goals
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleRegionConfigMutation.mutate({ id: config.id, isActive: !config.isActive })}
                            >
                              {config.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No region configurations created yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsCreateRegionConfigOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Configuration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
