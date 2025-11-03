import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Plus, Edit, Save, X, CheckCircle, Database, Calendar, Infinity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/hooks/useTranslation";

interface RegionConfig {
  id: string;
  region: string;
  category: string;
  subcategory: string | null;
  name: string;
  newCustomerGoalRate: number;
  renewalGoalRate: number;
  monthlyGoalTarget: number;
  isActive: boolean;
  expirationDate: string | null;
}

export default function RegionsManagementTab() {
  const { t } = useTranslation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<RegionConfig | null>(null);
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para obtener la configuración de puntos del sistema
  const { data: pointsConfig } = useQuery({
    queryKey: ["/api/admin/points-config"],
  });

  const { data: regions, isLoading } = useQuery<RegionConfig[]>({
    queryKey: ["/api/admin/regions"],
  });
  
  // Form state for creating new region - se inicializará con valores del sistema
  const [newRegion, setNewRegion] = useState({
    region: "",
    category: "",
    subcategory: "",
    name: "",
    newCustomerGoalRate: 1000,
    renewalGoalRate: 2000,
    monthlyGoalTarget: 10,
    isActive: true,
    expirationDate: null as string | null,
    isPermanent: true, // Nuevo campo para controlar si es permanente
  });

  // Actualizar los valores predeterminados cuando se carga la configuración
  useEffect(() => {
    if (pointsConfig) {
      const defaultNewCustomerRate = (pointsConfig as any)?.defaultNewCustomerGoalRate || 1000;
      const defaultRenewalRate = (pointsConfig as any)?.defaultRenewalGoalRate || 2000;
      
      setNewRegion(prev => ({
        ...prev,
        newCustomerGoalRate: defaultNewCustomerRate,
        renewalGoalRate: defaultRenewalRate,
      }));
    }
  }, [pointsConfig]);

  const seedRegionsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/regions/seed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/regions"] });
      toast({
        title: "Regiones pobladas",
        description: "Las regiones han sido creadas exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createRegionMutation = useMutation({
    mutationFn: async (data: Partial<RegionConfig>) => {
      const res = await apiRequest("POST", "/api/admin/regions", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al crear la región");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/regions"] });
      setIsCreateModalOpen(false);
      resetNewRegionForm();
      toast({
        title: "Región creada",
        description: "La nueva región ha sido creada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear región",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRegionMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<RegionConfig> }) => {
      const res = await apiRequest("PATCH", `/api/admin/regions/${data.id}`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/regions"] });
      setEditingRegion(null);
      toast({
        title: "Región actualizada",
        description: "La configuración de la región ha sido actualizada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateRegion = (updates: Partial<RegionConfig>) => {
    if (editingRegion) {
      // Filtrar campos que no deben ser actualizados (id, createdAt, updatedAt)
      const { id, createdAt, updatedAt, ...updateData } = updates as any;
      
      // Asegurarse de que expirationDate se envíe correctamente como ISO string
      const payload = {
        ...updateData,
        expirationDate: updateData.expirationDate 
          ? new Date(updateData.expirationDate).toISOString() 
          : null,
      };
      updateRegionMutation.mutate({ id: editingRegion.id, updates: payload });
    }
  };

  const handleCreateRegion = () => {
    if (!newRegion.region || !newRegion.category || !newRegion.name) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }
    
    // Validar duplicados en el frontend antes de enviar
    const subcategoryToCheck = newRegion.subcategory || null;
    const duplicate = regions?.find(r => 
      r.region === newRegion.region && 
      r.category === newRegion.category && 
      (r.subcategory || null) === subcategoryToCheck
    );
    
    if (duplicate) {
      toast({
        title: "Región duplicada",
        description: `Ya existe una configuración para ${newRegion.region} - ${newRegion.category}${subcategoryToCheck ? ' - ' + subcategoryToCheck : ''}`,
        variant: "destructive",
      });
      return;
    }
    
    // Preparar el payload correctamente
    const payload = {
      region: newRegion.region,
      category: newRegion.category,
      subcategory: newRegion.subcategory || null,
      name: newRegion.name,
      newCustomerGoalRate: newRegion.newCustomerGoalRate,
      renewalGoalRate: newRegion.renewalGoalRate,
      monthlyGoalTarget: newRegion.monthlyGoalTarget,
      isActive: newRegion.isActive,
      // Convertir string de fecha a ISO string para el backend
      expirationDate: newRegion.isPermanent 
        ? null 
        : (newRegion.expirationDate ? new Date(newRegion.expirationDate).toISOString() : null),
    };
    
    createRegionMutation.mutate(payload);
  };

  const resetNewRegionForm = () => {
    // Usar los valores de la configuración del sistema como defaults
    const defaultNewCustomerRate = (pointsConfig as any)?.defaultNewCustomerGoalRate || 1000;
    const defaultRenewalRate = (pointsConfig as any)?.defaultRenewalGoalRate || 2000;
    
    setNewRegion({
      region: "",
      category: "",
      subcategory: "",
      name: "",
      newCustomerGoalRate: defaultNewCustomerRate,
      renewalGoalRate: defaultRenewalRate,
      monthlyGoalTarget: 10,
      isActive: true,
      expirationDate: null,
      isPermanent: true,
    });
  };

  const filteredRegions = regions?.filter((region) => {
    if (filterRegion !== "all" && region.region !== filterRegion) return false;
    if (filterCategory !== "all" && region.category !== filterCategory) return false;
    return true;
  });

  const handleSeedRegions = () => {
    if (confirm(t('admin.populateRegionsConfirm'))) {
      seedRegionsMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('admin.regionManagement')}</h2>
          <p className="text-muted-foreground">
            {t('admin.manageRegionalConfigs')}
          </p>
        </div>
        <div className="flex gap-2">
          {(!regions || regions.length === 0) && (
            <Button
              onClick={handleSeedRegions}
              disabled={seedRegionsMutation.isPending}
              variant="outline"
            >
              <Database className="w-4 h-4 mr-2" />
              {seedRegionsMutation.isPending ? t('admin.seeding') : t('admin.populateRegions')}
            </Button>
          )}
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('admin.newRegion')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('admin.region')}</Label>
              <Select value={filterRegion} onValueChange={setFilterRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.allRegions')}</SelectItem>
                  <SelectItem value="NOLA">NOLA</SelectItem>
                  <SelectItem value="SOLA">SOLA</SelectItem>
                  <SelectItem value="BRASIL">BRASIL</SelectItem>
                  <SelectItem value="MEXICO">MÉXICO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('admin.category')}</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.allCategories')}</SelectItem>
                  <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                  <SelectItem value="SMB">SMB</SelectItem>
                  <SelectItem value="MSSP">MSSP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regions Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.regionalConfigurations')}</CardTitle>
          <CardDescription>
            {filteredRegions?.length || 0} {t('admin.regionsFound')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : !regions || regions.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('admin.noRegionsConfigured')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('admin.executeToPopulate')}
              </p>
              <Button onClick={handleSeedRegions} disabled={seedRegionsMutation.isPending}>
                <Database className="w-4 h-4 mr-2" />
                {t('admin.populateRegions')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.tableHeaders.name')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.region')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.category')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.subcategory')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.newCustomer')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.renewal')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.monthlyGoal')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.validity')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.state')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegions?.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell className="font-medium">{region.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{region.region}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{region.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {region.subcategory ? (
                        <Badge>{region.subcategory}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      ${region.newCustomerGoalRate.toLocaleString()} = 1 {t('admin.goal')}
                    </TableCell>
                    <TableCell className="text-sm">
                      ${region.renewalGoalRate.toLocaleString()} = 1 {t('admin.goal')}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{region.monthlyGoalTarget} {t('admin.goals')}</span>
                    </TableCell>
                    <TableCell>
                      {region.expirationDate ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          <span>{new Date(region.expirationDate).toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <Infinity className="w-4 h-4" />
                          <span>{t('admin.permanent')}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {region.isActive ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t('admin.active')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t('admin.inactive')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRegion(region)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {regions && regions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalRegions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{regions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">NOLA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {regions.filter((r) => r.region === "NOLA").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">SOLA + BRASIL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {regions.filter((r) => r.region === "SOLA" || r.region === "BRASIL").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">MÉXICO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {regions.filter((r) => r.region === "MEXICO").length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Region Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
        setIsCreateModalOpen(open);
        if (!open) resetNewRegionForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.newRegionConfig')}</DialogTitle>
            <DialogDescription>
              {t('admin.createRegionalConfig')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-region" className="text-right">
                {t('admin.regionRequired')}
              </Label>
              <Select
                value={newRegion.region}
                onValueChange={(value) => setNewRegion({ ...newRegion, region: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('admin.selectRegion')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOLA">NOLA</SelectItem>
                  <SelectItem value="SOLA">SOLA</SelectItem>
                  <SelectItem value="BRASIL">BRASIL</SelectItem>
                  <SelectItem value="MEXICO">MÉXICO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-category" className="text-right">
                {t('admin.categoryRequired')}
              </Label>
              <Select
                value={newRegion.category}
                onValueChange={(value) => setNewRegion({ ...newRegion, category: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('admin.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                  <SelectItem value="SMB">SMB</SelectItem>
                  <SelectItem value="MSSP">MSSP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-subcategory" className="text-right">
                {t('admin.subcategory')}
              </Label>
              <Input
                id="new-subcategory"
                value={newRegion.subcategory}
                onChange={(e) => setNewRegion({ ...newRegion, subcategory: e.target.value })}
                className="col-span-3"
                placeholder={t('admin.optional')}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-name" className="text-right">
                {t('admin.nameRequired')}
              </Label>
              <Input
                id="new-name"
                value={newRegion.name}
                onChange={(e) => setNewRegion({ ...newRegion, name: e.target.value })}
                className="col-span-3"
                placeholder={t('admin.nameExample')}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-newCustomerGoalRate" className="text-right">
                {t('admin.newCustomer')}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <span className="text-sm">US$</span>
                <Input
                  id="new-newCustomerGoalRate"
                  type="number"
                  value={newRegion.newCustomerGoalRate}
                  onChange={(e) => setNewRegion({ 
                    ...newRegion, 
                    newCustomerGoalRate: parseInt(e.target.value) 
                  })}
                  className="flex-1"
                />
                <span className="text-sm">= 1 {t('admin.goal')}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-renewalGoalRate" className="text-right">
                {t('admin.renewal')}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <span className="text-sm">US$</span>
                <Input
                  id="new-renewalGoalRate"
                  type="number"
                  value={newRegion.renewalGoalRate}
                  onChange={(e) => setNewRegion({ 
                    ...newRegion, 
                    renewalGoalRate: parseInt(e.target.value) 
                  })}
                  className="flex-1"
                />
                <span className="text-sm">= 1 {t('admin.goal')}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-monthlyGoalTarget" className="text-right">
                {t('admin.monthlyGoal')}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="new-monthlyGoalTarget"
                  type="number"
                  value={newRegion.monthlyGoalTarget}
                  onChange={(e) => setNewRegion({ 
                    ...newRegion, 
                    monthlyGoalTarget: parseInt(e.target.value) 
                  })}
                  className="flex-1"
                />
                <span className="text-sm">{t('admin.goals')}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-isActive" className="text-right">
                {t('admin.state')}
              </Label>
              <div className="col-span-3">
                <Select
                  value={newRegion.isActive ? "active" : "inactive"}
                  onValueChange={(value) => setNewRegion({ 
                    ...newRegion, 
                    isActive: value === "active" 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('admin.active')}</SelectItem>
                    <SelectItem value="inactive">{t('admin.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="new-isPermanent" className="text-right">
                  {t('admin.validity')}
                </Label>
                <div className="col-span-3 flex items-center gap-3">
                  <Switch
                    id="new-isPermanent"
                    checked={newRegion.isPermanent}
                    onCheckedChange={(checked) => setNewRegion({ 
                      ...newRegion, 
                      isPermanent: checked,
                      expirationDate: checked ? null : newRegion.expirationDate
                    })}
                  />
                  <Label htmlFor="new-isPermanent" className="flex items-center gap-2 cursor-pointer font-normal">
                    {newRegion.isPermanent ? (
                      <>
                        <Infinity className="h-4 w-4 text-green-500" />
                        <span>{t('admin.noPermanentExpiration')}</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span>{t('admin.withExpirationDate')}</span>
                      </>
                    )}
                  </Label>
                </div>
              </div>

              {!newRegion.isPermanent && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="new-expirationDate" className="text-right">
                    {t('admin.expirationDate')}
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="new-expirationDate"
                      type="date"
                      value={newRegion.expirationDate || ""}
                      onChange={(e) => setNewRegion({ 
                        ...newRegion, 
                        expirationDate: e.target.value || null
                      })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('admin.autoDeactivateRegion')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateModalOpen(false);
              resetNewRegionForm();
            }}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateRegion}
              disabled={createRegionMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              {createRegionMutation.isPending ? "Creando..." : "Crear Región"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Region Modal */}
      {editingRegion && (
        <Dialog open={!!editingRegion} onOpenChange={() => setEditingRegion(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Configuración de Región</DialogTitle>
              <DialogDescription>
                Modifica los parámetros de acumulación de goles para {editingRegion.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="name"
                  value={editingRegion.name}
                  onChange={(e) => setEditingRegion({ ...editingRegion, name: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newCustomerGoalRate" className="text-right">
                  Cliente Nuevo
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <span className="text-sm">US$</span>
                  <Input
                    id="newCustomerGoalRate"
                    type="number"
                    value={editingRegion.newCustomerGoalRate}
                    onChange={(e) => setEditingRegion({ 
                      ...editingRegion, 
                      newCustomerGoalRate: parseInt(e.target.value) 
                    })}
                    className="flex-1"
                  />
                  <span className="text-sm">= 1 gol</span>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="renewalGoalRate" className="text-right">
                  Renovación
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <span className="text-sm">US$</span>
                  <Input
                    id="renewalGoalRate"
                    type="number"
                    value={editingRegion.renewalGoalRate}
                    onChange={(e) => setEditingRegion({ 
                      ...editingRegion, 
                      renewalGoalRate: parseInt(e.target.value) 
                    })}
                    className="flex-1"
                  />
                  <span className="text-sm">= 1 gol</span>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="monthlyGoalTarget" className="text-right">
                  Meta Mensual
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input
                    id="monthlyGoalTarget"
                    type="number"
                    value={editingRegion.monthlyGoalTarget}
                    onChange={(e) => setEditingRegion({ 
                      ...editingRegion, 
                      monthlyGoalTarget: parseInt(e.target.value) 
                    })}
                    className="flex-1"
                  />
                  <span className="text-sm">goles</span>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">
                  Estado
                </Label>
                <div className="col-span-3">
                  <Select
                    value={editingRegion.isActive ? "active" : "inactive"}
                    onValueChange={(value) => setEditingRegion({ 
                      ...editingRegion, 
                      isActive: value === "active" 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="inactive">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="edit-isPermanent" className="text-right">
                    Vigencia
                  </Label>
                  <div className="col-span-3 flex items-center gap-3">
                    <Switch
                      id="edit-isPermanent"
                      checked={!editingRegion.expirationDate}
                      onCheckedChange={(checked) => setEditingRegion({ 
                        ...editingRegion, 
                        expirationDate: checked ? null : editingRegion.expirationDate || new Date().toISOString().split('T')[0]
                      })}
                    />
                    <Label htmlFor="edit-isPermanent" className="flex items-center gap-2 cursor-pointer font-normal">
                      {!editingRegion.expirationDate ? (
                        <>
                          <Infinity className="h-4 w-4 text-green-500" />
                          <span>Permanente (sin fecha de caducidad)</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span>Con fecha de caducidad</span>
                        </>
                      )}
                    </Label>
                  </div>
                </div>

                {editingRegion.expirationDate && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-expirationDate" className="text-right">
                      Fecha de Caducidad
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="edit-expirationDate"
                        type="date"
                        value={editingRegion.expirationDate ? new Date(editingRegion.expirationDate).toISOString().split('T')[0] : ""}
                        onChange={(e) => setEditingRegion({ 
                          ...editingRegion, 
                          expirationDate: e.target.value || null
                        })}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        La región se desactivará automáticamente en esta fecha
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRegion(null)}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                onClick={() => handleUpdateRegion(editingRegion)}
                disabled={updateRegionMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateRegionMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
