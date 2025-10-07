import { useState } from "react";
import { MessageCircle, HelpCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const supportTicketSchema = z.object({
  subject: z.string().min(5, "El asunto debe tener al menos 5 caracteres"),
  message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres"),
  priority: z.enum(["low", "medium", "high"]),
});

type SupportTicketForm = z.infer<typeof supportTicketSchema>;

const faqs = [
  {
    question: "¿Cómo puedo registrar un nuevo deal?",
    answer:
      "Para registrar un nuevo deal, dirígete a la sección 'Deals' en el menú principal y haz clic en 'Nuevo Deal'. Completa todos los campos requeridos como tipo de producto, nombre, valor, cantidad y fecha de cierre. Una vez enviado, el deal quedará pendiente de aprobación por un administrador.",
  },
  {
    question: "¿Cuántos puntos gano por cada deal?",
    answer:
      "Los puntos se calculan automáticamente basándose en el valor del deal. Normalmente, ganas 1 punto por cada dólar del deal. Los puntos solo se acreditan una vez que el deal es aprobado por un administrador. Algunos productos o campañas especiales pueden tener multiplicadores de puntos.",
  },
  {
    question: "¿Cómo canjeo mis puntos por recompensas?",
    answer:
      "Ve a la sección 'Recompensas' donde podrás ver todas las recompensas disponibles y los puntos necesarios para cada una. Selecciona la recompensa que deseas, verifica que tienes suficientes puntos y haz clic en 'Canjear'. La solicitud será procesada por un administrador y recibirás una notificación cuando sea aprobada.",
  },
  {
    question: "¿Cuánto tiempo tarda en aprobarse mi deal?",
    answer:
      "El tiempo de aprobación de deals varía dependiendo de la complejidad y el volumen de solicitudes. Generalmente, los deals son revisados en un plazo de 24-48 horas hábiles. Recibirás una notificación por correo cuando tu deal sea aprobado o si se requiere información adicional.",
  },
  {
    question: "¿Puedo cancelar o modificar un deal después de enviarlo?",
    answer:
      "Una vez que un deal ha sido enviado, no puedes modificarlo directamente. Si necesitas realizar cambios, contacta al soporte a través de este botón o envía un correo al administrador. Los deals pendientes pueden ser modificados por un administrador antes de su aprobación.",
  },
  {
    question: "¿Qué hago si no veo mis puntos reflejados?",
    answer:
      "Los puntos se acreditan automáticamente cuando tu deal es aprobado. Si tu deal fue aprobado y no ves los puntos, verifica en tu historial de puntos. Si el problema persiste después de 24 horas, contacta al soporte con el número de deal afectado.",
  },
  {
    question: "¿Las recompensas tienen fecha de expiración?",
    answer:
      "Los puntos acumulados no expiran, pero algunas recompensas pueden tener disponibilidad limitada por stock. Las recompensas especiales o de temporada pueden estar disponibles solo por tiempo limitado. Te recomendamos revisar regularmente el catálogo de recompensas.",
  },
  {
    question: "¿Cómo puedo rastrear el envío de mi recompensa?",
    answer:
      "Una vez que tu solicitud de recompensa sea aprobada y enviada, recibirás un correo con la información de seguimiento. También puedes verificar el estado en la sección 'Mis Recompensas' donde verás el estado actual (Pendiente, Aprobado, Enviado, Entregado).",
  },
];

export default function SupportButton() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<SupportTicketForm>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      subject: "",
      message: "",
      priority: "medium",
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: SupportTicketForm) => {
      return apiRequest("POST", "/api/support-tickets", data);
    },
    onSuccess: () => {
      toast({
        title: "Ticket enviado",
        description:
          "Tu solicitud de soporte ha sido enviada. Te contactaremos pronto.",
      });
      setTicketDialogOpen(false);
      setMenuOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el ticket de soporte",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupportTicketForm) => {
    createTicketMutation.mutate(data);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {menuOpen && (
          <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-48 mb-2">
            <button
              onClick={() => {
                setTicketDialogOpen(true);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 rounded-md transition-colors"
              data-testid="button-open-ticket"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">Enviar Solicitud</span>
            </button>
            <button
              onClick={() => {
                setFaqDialogOpen(true);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 rounded-md transition-colors"
              data-testid="button-open-faq"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="text-sm">Preguntas Frecuentes</span>
            </button>
          </div>
        )}

        <Button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all"
          data-testid="button-support"
        >
          {menuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </Button>
      </div>

      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-support-ticket">
          <DialogHeader>
            <DialogTitle>Solicitud de Soporte</DialogTitle>
            <DialogDescription>
              Describe tu problema o consulta y nos pondremos en contacto
              contigo lo antes posible.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asunto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Problema con canje de recompensa"
                        {...field}
                        data-testid="input-subject"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue placeholder="Selecciona la prioridad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensaje</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe tu problema o consulta..."
                        className="min-h-[120px]"
                        {...field}
                        data-testid="textarea-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTicketDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  data-testid="button-submit-ticket"
                >
                  {createTicketMutation.isPending ? (
                    "Enviando..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="dialog-faq">
          <DialogHeader>
            <DialogTitle>Preguntas Frecuentes (FAQ)</DialogTitle>
            <DialogDescription>
              Encuentra respuestas rápidas a las preguntas más comunes sobre
              nuestro programa de lealtad.
            </DialogDescription>
          </DialogHeader>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left" data-testid={`faq-question-${index}`}>
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600" data-testid={`faq-answer-${index}`}>
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              ¿No encuentras lo que buscas?{" "}
              <button
                onClick={() => {
                  setFaqDialogOpen(false);
                  setTicketDialogOpen(true);
                }}
                className="text-primary hover:underline font-medium"
                data-testid="button-contact-support"
              >
                Contacta con soporte
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
