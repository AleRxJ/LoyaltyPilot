import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Settings, DollarSign, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { PointsConfig } from "@shared/schema";

const pointsConfigFormSchema = z.object({
  softwareRate: z.number().min(1, "Debe ser al menos 1").max(1000000, "Valor muy alto"),
  hardwareRate: z.number().min(1, "Debe ser al menos 1").max(1000000, "Valor muy alto"),
  equipmentRate: z.number().min(1, "Debe ser al menos 1").max(1000000, "Valor muy alto"),
  grandPrizeThreshold: z.number().min(1, "Debe ser al menos 1").max(10000000, "Valor muy alto"),
});

type PointsConfigForm = z.infer<typeof pointsConfigFormSchema>;

export default function PointsConfigTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery<PointsConfig>({
    queryKey: ["/api/admin/points-config"],
  });

  const form = useForm<PointsConfigForm>({
    resolver: zodResolver(pointsConfigFormSchema),
    defaultValues: {
      softwareRate: 1000,
      hardwareRate: 5000,
      equipmentRate: 10000,
      grandPrizeThreshold: 50000,
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        softwareRate: config.softwareRate,
        hardwareRate: config.hardwareRate,
        equipmentRate: config.equipmentRate,
        grandPrizeThreshold: config.grandPrizeThreshold,
      });
    }
  }, [config, form]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: PointsConfigForm) => {
      const response = await apiRequest("PATCH", "/api/admin/points-config", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/points-config"] });
      toast({
        title: "Configuración actualizada",
        description: "Las reglas de asignación de puntos han sido actualizadas exitosamente",
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
          Configuración de Puntos
        </h2>
        <p className="text-muted-foreground" data-testid="text-points-config-description">
          Configura las reglas de asignación de puntos y el umbral del gran premio
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Reglas de Asignación de Puntos
          </CardTitle>
          <CardDescription>
            Define cuántos dólares se necesitan para obtener 1 punto según el tipo de producto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="softwareRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                        Software
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
                      <FormDescription>Dólares por 1 punto</FormDescription>
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
                        Hardware
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
                      <FormDescription>Dólares por 1 punto</FormDescription>
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
                        Equipment
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
                      <FormDescription>Dólares por 1 punto</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-6">
                <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                      Gran Premio
                    </CardTitle>
                    <CardDescription>
                      Puntos necesarios para alcanzar el gran premio
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="grandPrizeThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Umbral de Puntos</FormLabel>
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
                            Los usuarios que alcancen este número de puntos ganarán el gran premio
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                  Restablecer
                </Button>
                <Button
                  type="submit"
                  disabled={updateConfigMutation.isPending}
                  data-testid="button-save-config"
                >
                  {updateConfigMutation.isPending ? "Guardando..." : "Guardar Configuración"}
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
