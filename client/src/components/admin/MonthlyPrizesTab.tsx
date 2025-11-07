import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Calendar, Edit, Trash2, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Prize {
  id?: string;
  regionConfigId: string;
  month: number;
  year: number;
  rank: number;
  prizeName: string;
  prizeDescription?: string;
  prizeValue?: number;
  goalTarget: number;
  createdAt?: Date;
}

interface RegionConfig {
  id: string;
  region: string;
  category: string;
  level?: string;
}

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

export default function MonthlyPrizesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedRegion, setSelectedRegion] = useState<string>("");

  const [prize, setPrize] = useState<Prize>({
    regionConfigId: "",
    month: new Date().getMonth() + 1,
    year: currentYear,
    rank: 1,
    prizeName: "",
    prizeDescription: "",
    prizeValue: undefined,
    goalTarget: 0,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(currentYear);

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

  // Fetch region configs
  const { data: regionConfigs, isLoading: configsLoading } = useQuery<RegionConfig[]>({
    queryKey: ["/api/admin/region-configs", selectedRegion],
    enabled: !!selectedRegion,
  });

  // Fetch monthly prizes
  const { data: allPrizes, isLoading: prizesLoading } = useQuery<Prize[]>({
    queryKey: ["/api/admin/monthly-prizes", filterMonth, filterYear, selectedRegion],
    enabled: !!selectedRegion,
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/monthly-prizes?month=${filterMonth}&year=${filterYear}&region=${selectedRegion}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch prizes");
      return response.json();
    },
  });

  // Create/Update prize mutation
  const savePrizeMutation = useMutation({
    mutationFn: async (data: Prize) => {
      const url = editingId
        ? `/api/admin/monthly-prizes/${editingId}`
        : "/api/admin/monthly-prizes";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Error al guardar el premio");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/monthly-prizes", filterMonth, filterYear, selectedRegion] });
      setEditingId(null);
      setPrize({
        regionConfigId: "",
        month: new Date().getMonth() + 1,
        year: currentYear,
        rank: 1,
        prizeName: "",
        prizeDescription: "",
        prizeValue: undefined,
        goalTarget: 0,
      });
      toast({
        title: "Premio guardado",
        description: "El premio mensual ha sido guardado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el premio.",
        variant: "destructive",
      });
    },
  });

  // Delete prize mutation
  const deletePrizeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/monthly-prizes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Error al eliminar el premio");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/monthly-prizes", filterMonth, filterYear, selectedRegion] });
      toast({
        title: "Premio eliminado",
        description: "El premio ha sido eliminado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el premio.",
        variant: "destructive",
      });
    },
  });

  const handleSavePrize = () => {
    if (!prize.regionConfigId || !prize.prizeName || prize.goalTarget === undefined) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }
    savePrizeMutation.mutate(prize);
  };

  const handleEditPrize = (prizeToEdit: Prize) => {
    setEditingId(prizeToEdit.id || null);
    setPrize({
      regionConfigId: prizeToEdit.regionConfigId,
      month: prizeToEdit.month,
      year: prizeToEdit.year,
      rank: prizeToEdit.rank,
      prizeName: prizeToEdit.prizeName,
      prizeDescription: prizeToEdit.prizeDescription || "",
      prizeValue: prizeToEdit.prizeValue,
      goalTarget: prizeToEdit.goalTarget,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setPrize({
      regionConfigId: "",
      month: new Date().getMonth() + 1,
      year: currentYear,
      rank: 1,
      prizeName: "",
      prizeDescription: "",
      prizeValue: undefined,
      goalTarget: 0,
    });
  };

  const handleDeletePrize = (id: string) => {
    deletePrizeMutation.mutate(id);
  };

  const getRegionName = (regionConfigId: string) => {
    const config = regionConfigs?.find((c) => c.id === regionConfigId);
    if (!config) return "Desconocido";
    return `${config.region} - ${config.category}${config.level ? ` (${config.level})` : ""}`;
  };

  if (configsLoading || prizesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                  (Como administrador regional, solo puedes gestionar los premios mensuales de tu región)
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
                  Selecciona una región para gestionar sus premios mensuales
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formulario de Premio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            {editingId ? "Editar Premio Mensual" : "Crear Premio Mensual Acelerador"}
          </CardTitle>
          <CardDescription>
            Define premios mensuales por rendimiento para incentivar a los usuarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Región */}
          <div className="space-y-2">
            <Label htmlFor="region-config">Región / Categoría *</Label>
            <Select
              value={prize.regionConfigId}
              onValueChange={(value) => setPrize({ ...prize, regionConfigId: value })}
            >
              <SelectTrigger id="region-config">
                <SelectValue placeholder="Selecciona región" />
              </SelectTrigger>
              <SelectContent>
                {regionConfigs?.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    {config.region} - {config.category}
                    {config.level && ` (${config.level})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mes y Año */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Mes *</Label>
              <Select
                value={prize.month.toString()}
                onValueChange={(value) => setPrize({ ...prize, month: parseInt(value) })}
              >
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Año *</Label>
              <Input
                id="year"
                type="number"
                value={prize.year}
                onChange={(e) => setPrize({ ...prize, year: parseInt(e.target.value) })}
                min={2024}
                max={2030}
              />
            </div>
          </div>

          {/* Ranking y Descripción */}
          <div className="space-y-2">
            <Label htmlFor="rank">Posición (Top) *</Label>
            <Input
              id="rank"
              type="number"
              value={prize.rank}
              onChange={(e) => setPrize({ ...prize, rank: parseInt(e.target.value) })}
              min={1}
              max={10}
              placeholder="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prizeName">Nombre del Premio *</Label>
            <Input
              id="prizeName"
              value={prize.prizeName}
              onChange={(e) => setPrize({ ...prize, prizeName: e.target.value })}
              placeholder="Ej: iPhone 15 Pro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción del Premio - Opcional</Label>
            <Input
              id="description"
              value={prize.prizeDescription}
              onChange={(e) => setPrize({ ...prize, prizeDescription: e.target.value })}
              placeholder="Ej: 256GB, Color Titanio Negro"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Valor del Premio (USD) - Opcional</Label>
              <Input
                id="value"
                type="number"
                value={prize.prizeValue || ""}
                onChange={(e) =>
                  setPrize({ ...prize, prizeValue: e.target.value ? parseFloat(e.target.value) : undefined })
                }
                placeholder="1200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalTarget">Meta de Goles para Participar *</Label>
              <Input
                id="goalTarget"
                type="number"
                value={prize.goalTarget}
                onChange={(e) => setPrize({ ...prize, goalTarget: parseInt(e.target.value) })}
                min={0}
                placeholder="10"
              />
            </div>
          </div>

          <Separator />

          {/* Botones */}
          <div className="flex gap-2">
            <Button onClick={handleSavePrize} disabled={savePrizeMutation.isPending} className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              {savePrizeMutation.isPending
                ? "Guardando..."
                : editingId
                ? "Actualizar Premio"
                : "Crear Premio"}
            </Button>
            {editingId && (
              <Button onClick={handleCancelEdit} variant="outline" className="flex-1">
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Premios Configurados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select
              value={filterMonth.toString()}
              onValueChange={(value) => setFilterMonth(parseInt(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              className="w-[120px]"
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              min={2024}
              max={2030}
            />
          </div>

          {allPrizes && allPrizes.length > 0 ? (
            <div className="space-y-3">
              {allPrizes.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">Top {p.rank}</Badge>
                      <p className="font-medium">{p.prizeName}</p>
                      {p.prizeValue && (
                        <Badge variant="secondary">${p.prizeValue.toLocaleString()}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{getRegionName(p.regionConfigId)}</span>
                      <span>•</span>
                      <span>Meta: {p.goalTarget} goles</span>
                      {p.prizeDescription && (
                        <>
                          <span>•</span>
                          <span className="italic">{p.prizeDescription}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditPrize(p)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar premio?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el premio
                            "{p.prizeDescription}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePrize(p.id!)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay premios configurados para {MONTHS.find((m) => m.value === filterMonth)?.label} {filterYear}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
