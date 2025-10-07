import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SupportTicketWithUser } from "@shared/schema";

export default function SupportTicketsTab() {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketWithUser | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery<SupportTicketWithUser[]>({
    queryKey: ["/api/admin/support-tickets"],
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        status?: string;
        adminResponse?: string;
        priority?: string;
      };
    }) => {
      const response = await apiRequest("PATCH", `/api/admin/support-tickets/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets"] });
      toast({
        title: "Ticket actualizado",
        description: "El ticket ha sido actualizado exitosamente",
      });
      setIsResponseDialogOpen(false);
      setAdminResponse("");
      setSelectedTicket(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el ticket",
        variant: "destructive",
      });
    },
  });

  const handleOpenResponseDialog = (ticket: SupportTicketWithUser) => {
    setSelectedTicket(ticket);
    setAdminResponse(ticket.adminResponse || "");
    setNewStatus(ticket.status);
    setIsResponseDialogOpen(true);
  };

  const handleSubmitResponse = () => {
    if (!selectedTicket) return;

    updateTicketMutation.mutate({
      id: selectedTicket.id,
      updates: {
        status: newStatus,
        adminResponse: adminResponse || undefined,
      },
    });
  };

  const handleQuickStatusUpdate = (ticketId: string, status: string) => {
    updateTicketMutation.mutate({
      id: ticketId,
      updates: { status },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <MessageCircle className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4" />;
      case "closed":
        return <XCircle className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "open":
        return "Abierto";
      case "in_progress":
        return "En Progreso";
      case "resolved":
        return "Resuelto";
      case "closed":
        return "Cerrado";
      default:
        return status;
    }
  };

  const formatPriority = (priority: string) => {
    switch (priority) {
      case "high":
        return "Alta";
      case "medium":
        return "Media";
      case "low":
        return "Baja";
      default:
        return priority;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const openTickets = tickets?.filter((t) => t.status === "open") || [];
  const inProgressTickets = tickets?.filter((t) => t.status === "in_progress") || [];
  const resolvedTickets = tickets?.filter((t) => t.status === "resolved") || [];
  const closedTickets = tickets?.filter((t) => t.status === "closed") || [];

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Abiertos</p>
                  <p className="text-2xl font-bold" data-testid="text-open-tickets">
                    {openTickets.length}
                  </p>
                </div>
                <MessageCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En Progreso</p>
                  <p className="text-2xl font-bold" data-testid="text-inprogress-tickets">
                    {inProgressTickets.length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Resueltos</p>
                  <p className="text-2xl font-bold" data-testid="text-resolved-tickets">
                    {resolvedTickets.length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cerrados</p>
                  <p className="text-2xl font-bold" data-testid="text-closed-tickets">
                    {closedTickets.length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tickets de Soporte</CardTitle>
          </CardHeader>
          <CardContent>
            {!tickets || tickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay tickets de soporte registrados
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <Card key={ticket.id} className="border-l-4" style={{
                    borderLeftColor: ticket.status === "open" ? "#3b82f6" : 
                                   ticket.status === "in_progress" ? "#eab308" :
                                   ticket.status === "resolved" ? "#22c55e" : "#6b7280"
                  }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(ticket.status)}
                            <h3 className="font-semibold text-lg" data-testid={`ticket-subject-${ticket.id}`}>
                              {ticket.subject}
                            </h3>
                          </div>

                          <p className="text-gray-600 mb-3" data-testid={`ticket-message-${ticket.id}`}>
                            {ticket.message}
                          </p>

                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge className={getStatusColor(ticket.status)} data-testid={`ticket-status-${ticket.id}`}>
                              {formatStatus(ticket.status)}
                            </Badge>
                            <Badge className={getPriorityColor(ticket.priority)} data-testid={`ticket-priority-${ticket.id}`}>
                              {formatPriority(ticket.priority)}
                            </Badge>
                          </div>

                          <div className="text-sm text-gray-500 space-y-1">
                            <p>
                              <span className="font-medium">Usuario:</span>{" "}
                              {ticket.userFirstName} {ticket.userLastName} ({ticket.userName})
                            </p>
                            <p>
                              <span className="font-medium">Email:</span> {ticket.userEmail}
                            </p>
                            <p>
                              <span className="font-medium">Creado:</span>{" "}
                              {formatDate(ticket.createdAt)}
                            </p>
                            {ticket.respondedAt && (
                              <p>
                                <span className="font-medium">Respondido:</span>{" "}
                                {formatDate(ticket.respondedAt)}
                              </p>
                            )}
                          </div>

                          {ticket.adminResponse && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-md">
                              <p className="text-sm font-medium text-blue-900 mb-1">
                                Respuesta del Admin:
                              </p>
                              <p className="text-sm text-blue-800">{ticket.adminResponse}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleOpenResponseDialog(ticket)}
                            data-testid={`button-respond-${ticket.id}`}
                          >
                            Responder
                          </Button>
                          {ticket.status === "open" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickStatusUpdate(ticket.id, "in_progress")}
                              data-testid={`button-start-${ticket.id}`}
                            >
                              Iniciar
                            </Button>
                          )}
                          {(ticket.status === "in_progress" || ticket.status === "open") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickStatusUpdate(ticket.id, "resolved")}
                              data-testid={`button-resolve-${ticket.id}`}
                            >
                              Resolver
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" data-testid="dialog-ticket-response">
          <DialogHeader>
            <DialogTitle>Responder Ticket de Soporte</DialogTitle>
            <DialogDescription>
              Responde al usuario y actualiza el estado del ticket
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-md">
                <h4 className="font-semibold mb-2">{selectedTicket.subject}</h4>
                <p className="text-sm text-gray-600 mb-2">{selectedTicket.message}</p>
                <p className="text-xs text-gray-500">
                  Usuario: {selectedTicket.userFirstName} {selectedTicket.userLastName} (
                  {selectedTicket.userEmail})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger data-testid="select-ticket-status">
                    <SelectValue placeholder="Selecciona el estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Abierto</SelectItem>
                    <SelectItem value="in_progress">En Progreso</SelectItem>
                    <SelectItem value="resolved">Resuelto</SelectItem>
                    <SelectItem value="closed">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Respuesta (opcional)
                </label>
                <Textarea
                  placeholder="Escribe tu respuesta al usuario..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  className="min-h-[120px]"
                  data-testid="textarea-admin-response"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsResponseDialogOpen(false)}
                  data-testid="button-cancel-response"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitResponse}
                  disabled={updateTicketMutation.isPending}
                  data-testid="button-submit-response"
                >
                  {updateTicketMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
