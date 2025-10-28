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
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
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

  const {
    register,
    handleSubmit,
    formState: { errors },
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

  const verifyToken = async (inviteToken: string) => {
    try {
      const response = await fetch(`/api/auth/verify-invite/${inviteToken}`, {
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (data.valid) {
        setIsValid(true);
        setInviteData(data.user);
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
      console.log("🚀 Enviando petición a /api/auth/register-with-token");
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
        description: result.message || "Tu cuenta está lista. Ya puedes iniciar sesión.",
      });

      console.log("✅ Registro exitoso, redirigiendo...");
      setTimeout(() => navigate("/login"), 2000);
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
                <strong>Email:</strong> {inviteData.email}<br />
                <strong>Nombre:</strong> {inviteData.firstName} {inviteData.lastName}<br />
                <strong>País:</strong> {inviteData.country}
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
