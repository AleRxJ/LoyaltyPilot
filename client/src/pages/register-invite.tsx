import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { REGION_HIERARCHY } from "@/../../shared/constants";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  country: z.string().optional(),
  city: z.string().optional(),
  region: z.string().min(1, "Debes seleccionar una región"),
  category: z.string().min(1, "Debes seleccionar una categoría"),
  subcategory: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterWithInvite() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/register");
  const { toast } = useToast();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  // Extract token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get("token");
    
    if (!inviteToken) {
      toast({
        title: "Token no encontrado",
        description: "No se proporcionó un token de invitación válido",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setToken(inviteToken);
    verifyToken(inviteToken);
  }, []);

  // Actualizar países disponibles cuando se selecciona una región
  useEffect(() => {
    if (selectedRegion) {
      const countries = Object.keys(REGION_HIERARCHY[selectedRegion] || {});
      setAvailableCountries(countries);
      
      // Si solo hay un país (vacío o específico), seleccionarlo automáticamente
      if (countries.length === 1) {
        setSelectedCountry(countries[0]);
        setValue("country", countries[0]);
      } else {
        setSelectedCountry("");
        setValue("country", "");
      }
      
      setSelectedCity("");
      setValue("city", "");
      setAvailableCities([]);
    } else {
      setAvailableCountries([]);
      setSelectedCountry("");
      setSelectedCity("");
      setAvailableCities([]);
    }
  }, [selectedRegion]);

  // Actualizar ciudades disponibles cuando se selecciona un país
  useEffect(() => {
    if (selectedRegion && selectedCountry !== undefined) {
      const cities = REGION_HIERARCHY[selectedRegion]?.[selectedCountry] || [];
      setAvailableCities(cities);
      
      // Reset ciudad seleccionada
      setSelectedCity("");
      setValue("city", "");
    }
  }, [selectedCountry, selectedRegion]);

  const verifyToken = async (inviteToken: string) => {
    try {
      const response = await fetch(`/api/auth/verify-invite/${inviteToken}`, {
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (data.valid) {
        setIsValid(true);
        setInviteData(data);
        
        // Si es una invitación regional, pre-seleccionar la región y mostrar alerta
        if (data.invitation?.isRegionalInvite && data.invitation.region) {
          setSelectedRegion(data.invitation.region);
          setValue("region", data.invitation.region, { shouldValidate: true });
          
          toast({
            title: "🎯 Invitación Regional",
            description: `Has sido invitado desde la región ${data.invitation.region}. Tu región será asignada automáticamente.`,
          });
        }
      } else {
        toast({
          title: "Invitación inválida",
          description: data.message || "Esta invitación no es válida o ya fue utilizada",
          variant: "destructive",
        });
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo verificar la invitación",
        variant: "destructive",
      });
      setTimeout(() => navigate("/login"), 3000);
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    console.log("📝 Iniciando registro...", { username: data.username, token });
    setIsSubmitting(true);
    
    try {
      // 1. PRIMERO cerrar cualquier sesión activa
      console.log("🔓 Cerrando sesión actual si existe...");
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
        console.log("✅ Sesión cerrada");
      } catch (logoutError) {
        console.log("⚠️ No había sesión activa o error al cerrar:", logoutError);
      }

      // 2. LUEGO completar el registro
      console.log("🚀 Enviando petición a /api/auth/register-with-token");
      
      // Construir el valor de country basado en la selección
      let finalCountry = "";
      if (data.country && data.country !== "") {
        // Si hay país específico (NOLA: COLOMBIA, CENTRO AMERICA; SOLA: ARGENTINA, CHILE, PERU, OTROS)
        if (data.city) {
          finalCountry = `${data.country} - ${data.city}`;
        } else {
          finalCountry = data.country;
        }
      } else if (data.city) {
        // BRASIL o MÉXICO (sin país intermedio, solo ciudad)
        finalCountry = data.city;
      }
      
      const response = await fetch("/api/auth/register-with-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          inviteToken: token,
          username: data.username,
          password: data.password,
          country: finalCountry,
          region: data.region,
          category: data.category,
          subcategory: data.subcategory || null,
        }),
      });

      console.log("📬 Respuesta recibida:", response.status);
      const result = await response.json();
      console.log("📄 Datos de respuesta:", result);

      if (!response.ok) {
        throw new Error(result.message || "Error al completar el registro");
      }

      toast({
        title: "✅ ¡Registro completado!",
        description: result.regionAutoAssigned 
          ? `Tu cuenta está lista. Se te asignó automáticamente la región ${result.assignedRegion} desde donde fuiste invitado. Ya puedes iniciar sesión.`
          : result.message || "Tu cuenta está lista. Ya puedes iniciar sesión.",
      });

      console.log("✅ Registro exitoso, redirigiendo al login...");
      // Usar window.location.href para forzar recarga completa y limpiar estado
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (error: any) {
      console.error("❌ Error en registro:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo completar el registro",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-4" />
            <p className="text-gray-600">Verificando invitación...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-center">Invitación Inválida</CardTitle>
            <CardDescription className="text-center">
              Esta invitación no es válida o ya fue utilizada
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Completa tu Registro</CardTitle>
          <CardDescription className="text-center">
            Bienvenido al Programa de Lealtad
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteData && (
            <Alert className="mb-6">
              <AlertDescription>
                <strong>Email:</strong> {inviteData.user.email}<br />
                <strong>Nombre:</strong> {inviteData.user.firstName} {inviteData.user.lastName}
              </AlertDescription>
            </Alert>
          )}

          {inviteData?.invitation?.isRegionalInvite && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>📍 Invitación Regional:</strong> Has sido invitado desde la región <strong>{inviteData.invitation.region}</strong>. 
                Tu región será asignada automáticamente al completar el registro.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="username">Nombre de Usuario *</Label>
              <Input
                id="username"
                type="text"
                placeholder="Elige un nombre de usuario"
                {...register("username")}
                disabled={isSubmitting}
              />
              {errors.username && (
                <p className="text-sm text-red-500 mt-1">{errors.username.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                {...register("password")}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repite tu contraseña"
                {...register("confirmPassword")}
                disabled={isSubmitting}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="region">
                Región * 
                {inviteData?.invitation?.isRegionalInvite && (
                  <span className="text-blue-600 text-sm ml-2">(Asignada automáticamente)</span>
                )}
              </Label>
              <Select
                value={selectedRegion}
                onValueChange={(value) => {
                  setSelectedRegion(value);
                  setValue("region", value, { shouldValidate: true });
                  setSelectedCategory(""); // Reset category when region changes
                  setValue("category", "", { shouldValidate: false });
                  setValue("subcategory", "", { shouldValidate: false });
                }}
                disabled={isSubmitting || inviteData?.invitation?.isRegionalInvite}
              >
                <SelectTrigger className={errors.region ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecciona tu región" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOLA">NOLA (North of Latin America)</SelectItem>
                  <SelectItem value="SOLA">SOLA (South of Latin America)</SelectItem>
                  <SelectItem value="BRASIL">BRASIL</SelectItem>
                  <SelectItem value="MEXICO">MÉXICO</SelectItem>
                </SelectContent>
              </Select>
              {errors.region && (
                <p className="text-sm text-red-500 mt-1">{errors.region.message}</p>
              )}
            </div>

            {/* Mostrar selector de país solo si la región tiene países */}
            {selectedRegion && availableCountries.length > 0 && availableCountries[0] !== "" && (
              <div>
                <Label htmlFor="country">
                  {selectedRegion === "NOLA" ? "Subcategoría" : "País"} *
                </Label>
                <Select
                  value={selectedCountry}
                  onValueChange={(value) => {
                    setSelectedCountry(value);
                    setValue("country", value, { shouldValidate: true });
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedRegion === "NOLA" ? "Selecciona subcategoría" : "Selecciona país"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCountries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Mostrar selector de ciudad si hay ciudades disponibles */}
            {selectedRegion && availableCities.length > 0 && (
              <div>
                <Label htmlFor="city">Ciudad (Opcional)</Label>
                <Select
                  value={selectedCity}
                  onValueChange={(value) => {
                    setSelectedCity(value);
                    setValue("city", value);
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedRegion && (
              <div>
                <Label htmlFor="category">Categoría *</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setValue("category", value, { shouldValidate: true });
                    setValue("subcategory", "", { shouldValidate: false });
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecciona tu categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                    <SelectItem value="SMB">SMB</SelectItem>
                    {selectedRegion === "NOLA" && (
                      <SelectItem value="MSSP">MSSP</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>
                )}
              </div>
            )}

            {selectedRegion && selectedCategory && (
              <>
                {selectedRegion === "NOLA" && selectedCategory !== "MSSP" && (
                  <div>
                    <Label htmlFor="subcategory">Subcategoría *</Label>
                    <Select
                      onValueChange={(value) => setValue("subcategory", value, { shouldValidate: true })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tu subcategoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COLOMBIA">Colombia</SelectItem>
                        <SelectItem value="CENTRO AMÉRICA">Centro América</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedRegion === "MEXICO" && (
                  <div>
                    <Label htmlFor="subcategory">Nivel de Partner *</Label>
                    <Select
                      onValueChange={(value) => setValue("subcategory", value, { shouldValidate: true })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tu nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedCategory === "ENTERPRISE" && (
                          <>
                            <SelectItem value="PLATINUM">Platinum</SelectItem>
                            <SelectItem value="GOLD">Gold</SelectItem>
                          </>
                        )}
                        {selectedCategory === "SMB" && (
                          <>
                            <SelectItem value="PLATINUM">Platinum</SelectItem>
                            <SelectItem value="GOLD">Gold</SelectItem>
                            <SelectItem value="SILVER & REGISTERED">Silver & Registered</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <Alert>
              <AlertDescription className="text-xs">
                Una vez completado el registro, tu cuenta estará lista para usar inmediatamente.
                Recibirás un email de confirmación.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completando registro...
                </>
              ) : (
                "Completar Registro"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a href="/login" className="text-sm text-primary-600 hover:text-primary-700">
              ¿Ya tienes una cuenta? Inicia sesión
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
