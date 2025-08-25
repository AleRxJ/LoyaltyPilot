import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const dealSchema = z.object({
  productType: z.enum(["software", "hardware"], {
    required_error: "Please select a product type",
  }),
  productName: z.string().min(1, "Product name is required"),
  dealValue: z.string().min(1, "Deal value is required"),
  quantity: z.string().min(1, "Quantity is required"),
  closeDate: z.string().min(1, "Close date is required"),
  clientInfo: z.string().optional(),
});

type DealForm = z.infer<typeof dealSchema>;

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DealModal({ isOpen, onClose }: DealModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DealForm>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      productType: undefined,
      productName: "",
      dealValue: "",
      quantity: "",
      closeDate: "",
      clientInfo: "",
    },
  });

  const createDealMutation = useMutation({
    mutationFn: async (data: DealForm) => {
      const dealData = {
        ...data,
        dealValue: data.dealValue, // Keep as string
        quantity: parseInt(data.quantity),
        closeDate: data.closeDate, // Send as string, will be transformed by schema
      };
      return apiRequest("POST", "/api/deals", dealData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal registered successfully and is pending approval",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to register deal",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DealForm) => {
    createDealMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Register New Deal
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-product-type">
                          <SelectValue placeholder="Select product type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="software">Software</SelectItem>
                        <SelectItem value="hardware">Hardware</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dealValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Value ($)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="25000"
                        data-testid="input-deal-value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enterprise Software License"
                      data-testid="input-product-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity/Licenses</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="100"
                        data-testid="input-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="closeDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Close Date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        data-testid="input-close-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="clientInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Information (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Client name and additional details..."
                      className="h-24"
                      data-testid="textarea-client-info"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createDealMutation.isPending}
                data-testid="button-submit-deal"
              >
                {createDealMutation.isPending ? "Submitting..." : "Submit Deal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
