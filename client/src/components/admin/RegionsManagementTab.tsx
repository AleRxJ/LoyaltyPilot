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
    if (confirm("¿Estás seguro de que quieres poblar las regiones? Esto solo debe hacerse una vez.")) {
      seedRegionsMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Administración de Regiones</h2>
          <p className="text-muted-foreground">
            Gestiona las configuraciones regionales del programa de lealtad
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
              {seedRegionsMutation.isPending ? "Poblando..." : "Poblar Regiones"}
            </Button>
          )}
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Región
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Región</Label>
              <Select value={filterRegion} onValueChange={setFilterRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las regiones</SelectItem>
                  <SelectItem value="NOLA">NOLA</SelectItem>
                  <SelectItem value="SOLA">SOLA</SelectItem>
                  <SelectItem value="BRASIL">BRASIL</SelectItem>
                  <SelectItem value="MEXICO">MÉXICO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
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
          <CardTitle>Configuraciones de Regiones</CardTitle>
          <CardDescription>
            {filteredRegions?.length || 0} regiones encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : !regions || regions.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay regiones configuradas</h3>
              <p className="text-muted-foreground mb-4">
                Ejecuta el seed para poblar las regiones predefinidas
              </p>
              <Button onClick={handleSeedRegions} disabled={seedRegionsMutation.isPending}>
                <Database className="w-4 h-4 mr-2" />
                Poblar Regiones
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Región</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Subcategoría</TableHead>
                  <TableHead>Cliente Nuevo</TableHead>
                  <TableHead>Renovación</TableHead>
                  <TableHead>Meta Mensual</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
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
                      ${region.newCustomerGoalRate.toLocaleString()} = 1 gol
                    </TableCell>
                    <TableCell className="text-sm">
                      ${region.renewalGoalRate.toLocaleString()} = 1 gol
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{region.monthlyGoalTarget} goles</span>
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
                          <span>Permanente</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {region.isActive ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
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
              <CardTitle className="text-sm font-medium">Total Regiones</CardTitle>
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
            <DialogTitle>Nueva Configuración de Región</DialogTitle>
            <DialogDescription>
              Crea una nueva configuración regional para el programa de lealtad
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-region" className="text-right">
                Región*
              </Label>
              <Select
                value={newRegion.region}
                onValueChange={(value) => setNewRegion({ ...newRegion, region: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona región" />
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
                Categoría*
              </Label>
              <Select
                value={newRegion.category}
                onValueChange={(value) => setNewRegion({ ...newRegion, category: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona categoría" />
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
                Subcategoría
              </Label>
              <Input
                id="new-subcategory"
                value={newRegion.subcategory}
                onChange={(e) => setNewRegion({ ...newRegion, subcategory: e.target.value })}
                className="col-span-3"
                placeholder="Opcional"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-name" className="text-right">
                Nombre*
              </Label>
              <Input
                id="new-name"
                value={newRegion.name}
                onChange={(e) => setNewRegion({ ...newRegion, name: e.target.value })}
                className="col-span-3"
                placeholder="Ej: NOLA ENTERPRISE"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-newCustomerGoalRate" className="text-right">
                Cliente Nuevo
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
                <span className="text-sm">= 1 gol</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-renewalGoalRate" className="text-right">
                Renovación
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
                <span className="text-sm">= 1 gol</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-monthlyGoalTarget" className="text-right">
                Meta Mensual
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
                <span className="text-sm">goles</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-isActive" className="text-right">
                Estado
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
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="inactive">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="new-isPermanent" className="text-right">
                  Vigencia
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

              {!newRegion.isPermanent && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="new-expirationDate" className="text-right">
                    Fecha de Caducidad
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
                      La región se desactivará automáticamente en esta fecha
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
