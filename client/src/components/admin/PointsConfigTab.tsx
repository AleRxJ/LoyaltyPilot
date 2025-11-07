import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Settings, DollarSign, Trophy, Calendar, Target, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { apiRequest } from "@/lib/queryClient";
import type { PointsConfig } from "@shared/schema";

const pointsConfigFormSchema = z.object({
  region: z.string().min(1, "Región requerida"),
  softwareRate: z.number().min(1, "Debe ser al menos 1").max(1000000, "Valor muy alto"),
  hardwareRate: z.number().min(1, "Debe ser al menos 1").max(1000000, "Valor muy alto"),
  equipmentRate: z.number().min(1, "Debe ser al menos 1").max(1000000, "Valor muy alto"),
  grandPrizeThreshold: z.number().min(1, "Debe ser al menos 1").max(10000000, "Valor muy alto"),
  defaultNewCustomerGoalRate: z.number().min(1, "Debe ser al menos 1").max(1000000, "Valor muy alto"),
  defaultRenewalGoalRate: z.number().min(1, "Debe ser al menos 1").max(1000000, "Valor muy alto"),
  redemptionStartDate: z.string().optional(),
  redemptionEndDate: z.string().optional(),
});

type PointsConfigForm = z.infer<typeof pointsConfigFormSchema>;

export default function PointsConfigTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // Estado para la región seleccionada
  const [selectedRegion, setSelectedRegion] = useState<string>("");

  // Query para obtener el usuario actual
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  // Determinar región basada en el rol del usuario
  useEffect(() => {
    if (currentUser) {
      const user = currentUser as any;
      if (user.role === "regional-admin") {
        // Regional-admin solo puede ver su región
        const userRegion = user.region || user.country || "";
        setSelectedRegion(userRegion);
      } else {
        // Admin/Super-admin pueden seleccionar cualquier región, por defecto NOLA
        setSelectedRegion(selectedRegion || "NOLA");
      }
    }
  }, [currentUser]);

  const { data: config, isLoading } = useQuery<PointsConfig>({
    queryKey: ["/api/admin/points-config", selectedRegion],
    enabled: !!selectedRegion,
    queryFn: async () => {
      const response = await fetch(`/api/admin/points-config?region=${selectedRegion}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch points configuration");
      }
      return response.json();
    },
  });

  const form = useForm<PointsConfigForm>({
    resolver: zodResolver(pointsConfigFormSchema),
    defaultValues: {
      region: "",
      softwareRate: 1000,
      hardwareRate: 5000,
      equipmentRate: 10000,
      grandPrizeThreshold: 50000,
      defaultNewCustomerGoalRate: 1000,
      defaultRenewalGoalRate: 2000,
      redemptionStartDate: "",
      redemptionEndDate: "",
    },
  });

  useEffect(() => {
    if (config && selectedRegion) {
      form.reset({
        region: selectedRegion,
        softwareRate: config.softwareRate,
        hardwareRate: config.hardwareRate,
        equipmentRate: config.equipmentRate,
        grandPrizeThreshold: config.grandPrizeThreshold,
        defaultNewCustomerGoalRate: (config as any).defaultNewCustomerGoalRate || 1000,
        defaultRenewalGoalRate: (config as any).defaultRenewalGoalRate || 2000,
        redemptionStartDate: config.redemptionStartDate 
          ? new Date(config.redemptionStartDate).toISOString().split('T')[0] 
          : "",
        redemptionEndDate: config.redemptionEndDate 
          ? new Date(config.redemptionEndDate).toISOString().split('T')[0] 
          : "",
      });
    } else if (selectedRegion) {
      // Si no hay config pero hay región seleccionada, establecer la región en el formulario
      form.setValue("region", selectedRegion);
    }
  }, [config, selectedRegion, form]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: PointsConfigForm) => {
      const payload = {
        region: data.region,
        softwareRate: data.softwareRate,
        hardwareRate: data.hardwareRate,
        equipmentRate: data.equipmentRate,
        grandPrizeThreshold: data.grandPrizeThreshold,
        defaultNewCustomerGoalRate: data.defaultNewCustomerGoalRate,
        defaultRenewalGoalRate: data.defaultRenewalGoalRate,
        redemptionStartDate: data.redemptionStartDate ? new Date(data.redemptionStartDate).toISOString() : null,
        redemptionEndDate: data.redemptionEndDate ? new Date(data.redemptionEndDate).toISOString() : null,
      };
      const response = await apiRequest("PATCH", "/api/admin/points-config", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/points-config", selectedRegion] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/points-config"] }); // Para cachés generales
      toast({
        title: "Configuración actualizada",
        description: `Las reglas de asignación de puntos para ${selectedRegion} han sido actualizadas exitosamente`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PointsConfigForm) => {
    updateConfigMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-points-config-title">
          {t('admin.settings')}
        </h2>
        <p className="text-muted-foreground" data-testid="text-points-config-description">
          {t('admin.configurePointsRules')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('admin.pointsAssignmentRules')}
          </CardTitle>
          <CardDescription>
            {t('admin.configurePointsRules')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Selector de región */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Configuración para región:</Label>
                    <p className="text-xs text-gray-600 mt-1">
                      {(currentUser as any)?.role === "regional-admin" 
                        ? "Como administrador regional, solo puedes configurar tu región"
                        : "Selecciona la región para configurar"
                      }
                    </p>
                  </div>
                  {(currentUser as any)?.role === "regional-admin" ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
                        {selectedRegion}
                      </span>
                      <span className="text-xs text-gray-500">(Región asignada)</span>
                    </div>
                  ) : (
                    <Select
                      value={selectedRegion}
                      onValueChange={(value) => setSelectedRegion(value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Seleccionar región" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NOLA">NOLA</SelectItem>
                        <SelectItem value="SOLA">SOLA</SelectItem>
                        <SelectItem value="BRASIL">BRASIL</SelectItem>
                        <SelectItem value="MEXICO">MEXICO</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              
              <div className="grid gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="softwareRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                        {t('admin.pointsConfig.software')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1000"
                          data-testid="input-software-rate"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>{t('admin.dollarsPerPoint')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hardwareRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-purple-500" />
                        {t('admin.pointsConfig.hardware')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="5000"
                          data-testid="input-hardware-rate"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>{t('admin.dollarsPerPoint')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="equipmentRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        {t('admin.pointsConfig.equipment')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="10000"
                          data-testid="input-equipment-rate"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>{t('admin.dollarsPerPoint')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-6">
                <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5 text-emerald-600" />
                      {t('admin.goalAccumulationRules')}
                    </CardTitle>
                    <CardDescription>
                      {t('admin.goalAccumulationDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="defaultNewCustomerGoalRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-emerald-500" />
                              {t('admin.newCustomer')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1000"
                                data-testid="input-new-customer-goal-rate"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>{t('admin.newCustomer')} - {t('admin.dollarsPerPoint')}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="defaultRenewalGoalRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-teal-500" />
                              {t('admin.renewal')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="2000"
                                data-testid="input-renewal-goal-rate"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>{t('admin.renewal')} - {t('admin.dollarsPerPoint')}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="border-t pt-6">
                <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                      {t('admin.grandPrize')}
                    </CardTitle>
                    <CardDescription>
                      {t('admin.grandPrizeDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="grandPrizeThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('admin.grandPrizeThreshold')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50000"
                              data-testid="input-grand-prize-threshold"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('admin.totalPointsNeeded')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="border-t pt-6">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      {t('admin.redemptionPeriod')}
                    </CardTitle>
                    <CardDescription>
                      {t('admin.redemptionPeriodDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="redemptionStartDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('admin.startDate')}</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                data-testid="input-redemption-start-date"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              {t('admin.startDate')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="redemptionEndDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('admin.endDate')}</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                data-testid="input-redemption-end-date"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              {t('admin.endDate')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={updateConfigMutation.isPending}
                  data-testid="button-reset"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={updateConfigMutation.isPending}
                  data-testid="button-save-config"
                >
                  {updateConfigMutation.isPending ? t('admin.saving') : t('admin.saveChanges')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {config?.updatedAt && (
        <div className="text-sm text-muted-foreground text-center">
          Última actualización: {new Date(config.updatedAt).toLocaleString("es-ES")}
        </div>
      )}
    </div>
  );
}
