import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Globe, Target, TrendingUp, Users, Calendar, Infinity, Flag, MapPin, Award, Medal, Trophy } from "lucide-react";
import { useState } from "react";
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

interface RegionStats {
  totalUsers: number;
  activeDeals: number;
  totalGoals: number;
  monthlyProgress: number;
}

export default function RegionsOverview() {
  const { t } = useTranslation();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Get current user to determine role and region
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data: regions, isLoading: regionsLoading } = useQuery<RegionConfig[]>({
    queryKey: ["/api/admin/regions"],
  });

  // Group regions by main region
  const groupedRegions = regions?.reduce((acc, region) => {
    if (!acc[region.region]) {
      acc[region.region] = [];
    }
    acc[region.region].push(region);
    return acc;
  }, {} as Record<string, RegionConfig[]>);

  const getRegionColor = (region: string) => {
    const colors: Record<string, string> = {
      NOLA: "from-blue-500 to-blue-600",
      SOLA: "from-green-500 to-green-600",
      BRASIL: "from-yellow-500 to-yellow-600",
      MEXICO: "from-red-500 to-red-600",
    };
    return colors[region] || "from-gray-500 to-gray-600";
  };

  const getRegionIcon = (region: string) => {
    const flagIcons: Record<string, JSX.Element> = {
      NOLA: (
        <div className="relative h-10 w-14 flex items-center justify-center bg-blue-100 rounded shadow-md">
          <Globe className="h-6 w-6 text-blue-600" />
        </div>
      ),
      SOLA: (
        <div className="relative h-10 w-14 flex items-center justify-center bg-green-100 rounded shadow-md">
          <Globe className="h-6 w-6 text-green-600" />
        </div>
      ),
      BRASIL: <img src="https://flagcdn.com/w80/br.png" alt="Brasil" className="h-10 w-14 rounded object-cover shadow-md" />,
      MEXICO: <img src="https://flagcdn.com/w80/mx.png" alt="México" className="h-10 w-14 rounded object-cover shadow-md" />,
    };
    return flagIcons[region] || <Globe className="h-8 w-8" />;
  };

  const getCountryIcon = (subcategory: string | null) => {
    if (!subcategory) return null;
    const countryIcons: Record<string, JSX.Element> = {
      COLOMBIA: <img src="https://flagcdn.com/w20/co.png" alt="Colombia" className="h-3 w-4 rounded" />,
      "CENTRO AMÉRICA": (
        <div className="relative h-3 w-4 flex items-center justify-center bg-blue-50 rounded">
          <MapPin className="h-2.5 w-2.5 text-blue-600" />
        </div>
      ),
      PLATINUM: <Trophy className="h-4 w-4 text-yellow-500" />,
      GOLD: <Award className="h-4 w-4 text-yellow-600" />,
      "SILVER & REGISTERED": <Medal className="h-4 w-4 text-gray-400" />,
    };
    return countryIcons[subcategory] || null;
  };

  if (regionsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Determinar si es administrador regional y su región
  const isRegionalAdmin = currentUser && (currentUser as any).role === "regional-admin";
  const userRegion = isRegionalAdmin ? (currentUser as any).region : null;

  // Filtrar regiones según el rol del usuario
  const displayRegions = groupedRegions 
    ? (isRegionalAdmin && userRegion 
        ? Object.entries(groupedRegions).filter(([regionName]) => regionName === userRegion)
        : Object.entries(groupedRegions))
    : [];

  return (
    <div className="space-y-6">
      {/* Region Cards */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          {isRegionalAdmin ? `${t('admin.regionsConfigured')} - ${userRegion}` : t('admin.regionsConfigured')}
        </h2>
        
        {/* Layout especial para administrador regional */}
        {isRegionalAdmin ? (
          // Diseño ancho completo para administrador regional
          <div className="grid grid-cols-1 gap-6">
            {displayRegions.map(([regionName, configs]) => (
              <Card
                key={regionName}
                className="cursor-pointer transition-all hover:shadow-xl border-2 border-primary/20 hover:border-primary/40"
                onClick={() => setSelectedRegion(selectedRegion === regionName ? null : regionName)}
              >
                <CardHeader className={`bg-gradient-to-r ${getRegionColor(regionName)} text-white rounded-t-lg p-8`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-xl">
                        {getRegionIcon(regionName)}
                      </div>
                      <div>
                        <CardTitle className="text-3xl font-bold">{regionName}</CardTitle>
                        <CardDescription className="text-white/80 text-lg mt-1">
                          Tu región asignada - {configs.length} configuraciones activas
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary" className="bg-white/30 text-white text-lg px-4 py-2">
                        <Trophy className="h-5 w-5 mr-2" />
                        {configs.length} configs
                      </Badge>
                      <Badge variant="secondary" className="bg-green-500/80 text-white">
                        <Medal className="h-4 w-4 mr-1" />
                        Admin Regional
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-600">{configs.length}</div>
                      <div className="text-sm text-gray-600">Configuraciones</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-600">
                        {configs.reduce((acc: number, config: any) => acc + (config.monthlyGoalTarget || 0), 0)}
                      </div>
                      <div className="text-sm text-gray-600">Meta Mensual</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(configs.reduce((acc: number, config: any) => acc + config.newCustomerGoalRate, 0) / configs.length)}
                      </div>
                      <div className="text-sm text-gray-600">Promedio Nuevos</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-orange-600">
                        {configs.filter((c: any) => c.isActive).length}
                      </div>
                      <div className="text-sm text-gray-600">Activas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Diseño en grid para super-admin y admin
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayRegions.map(([regionName, configs]) => (
              <Card
                key={regionName}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedRegion === regionName ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedRegion(selectedRegion === regionName ? null : regionName)}
              >
                <CardHeader className={`bg-gradient-to-br ${getRegionColor(regionName)} text-white rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRegionIcon(regionName)}
                      <CardTitle className="text-xl">{regionName}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {configs.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {t('admin.configurations')}
                      </span>
                      <span className="font-semibold">{configs.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {t('admin.categories')}
                      </span>
                      <span className="font-semibold">
                        {Array.from(new Set(configs.map((c: any) => c.category))).join(", ")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {t('admin.averageGoal')}
                      </span>
                      <span className="font-semibold">
                        {Math.round(configs.reduce((sum: number, c: any) => sum + (c.monthlyGoalTarget || 0), 0) / configs.length)} {t('admin.goals')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
            <Card
              key={regionName}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedRegion === regionName ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedRegion(selectedRegion === regionName ? null : regionName)}
            >
              <CardHeader className={`bg-gradient-to-br ${getRegionColor(regionName)} text-white rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRegionIcon(regionName)}
                    <CardTitle className="text-xl">{regionName}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {configs.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {t('admin.configurations')}
                    </span>
                    <span className="font-semibold">{configs.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {t('admin.categories')}
                    </span>
                    <span className="font-semibold">
                      {Array.from(new Set(configs.map(c => c.category))).join(", ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {t('admin.averageGoal')}
                    </span>
                    <span className="font-semibold">
                      {Math.round(configs.reduce((sum, c) => sum + (c.monthlyGoalTarget || 0), 0) / configs.length)} {t('admin.goals')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Selected Region Details */}
      {selectedRegion && groupedRegions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getRegionIcon(selectedRegion)}
              {t('admin.configurationsOf')} {selectedRegion}
            </CardTitle>
            <CardDescription>
              {t('admin.detailsOf')} {groupedRegions[selectedRegion].length} {t('admin.configurationsInRegion')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.tableHeaders.name')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.category')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.subcategory')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.newCustomer')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.renewal')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.monthlyGoal')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.validity')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.state')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedRegions[selectedRegion].map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{config.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {config.subcategory ? (
                        <Badge variant="secondary" className="gap-1 flex items-center w-fit">
                          {getCountryIcon(config.subcategory)}
                          <span>{config.subcategory}</span>
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      ${config.newCustomerGoalRate.toLocaleString()} = 1 {t('admin.goal')}
                    </TableCell>
                    <TableCell className="text-sm">
                      ${config.renewalGoalRate.toLocaleString()} = 1 {t('admin.goal')}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{config.monthlyGoalTarget} {t('admin.goals')}</span>
                    </TableCell>
                    <TableCell>
                      {config.expirationDate ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          <span>{new Date(config.expirationDate).toLocaleDateString('es-ES', { 
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
                      {config.isActive ? (
                        <Badge className="bg-green-500">{t('admin.active')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('admin.inactive')}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!regions || regions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('admin.noRegionsConfigured')}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t('admin.seedRegions')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
