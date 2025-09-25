import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Reward } from "@shared/schema";

const rewardSchema = z.object({
  name: z.string().min(1, "Reward name is required"),
  description: z.string().optional(),
  pointsCost: z.string().min(1, "Points cost is required"),
  category: z.string().min(1, "Category is required"),
  isActive: z.boolean().default(true),
  stockQuantity: z.string().optional(),
  imageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type RewardForm = z.infer<typeof rewardSchema>;

interface RewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward?: Reward | null;
}

const categories = [
  "Gift Cards",
  "Electronics",
  "Travel",
  "Accessories",
  "Software",
  "Training",
  "Merchandise",
  "Experiences"
];

export default function RewardModal({ isOpen, onClose, reward }: RewardModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!reward;

  const form = useForm<RewardForm>({
    resolver: zodResolver(rewardSchema),
    defaultValues: {
      name: "",
      description: "",
      pointsCost: "",
      category: "",
      isActive: true,
      stockQuantity: "",
      imageUrl: "",
    },
  });

  // Reset form when reward prop changes
  useEffect(() => {
    if (reward) {
      form.reset({
        name: reward.name || "",
        description: reward.description || "",
        pointsCost: reward.pointsCost?.toString() || "",
        category: reward.category || "",
        isActive: reward.isActive ?? true,
        stockQuantity: reward.stockQuantity?.toString() || "",
        imageUrl: reward.imageUrl || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        pointsCost: "",
        category: "",
        isActive: true,
        stockQuantity: "",
        imageUrl: "",
      });
    }
  }, [reward, form]);

  const createRewardMutation = useMutation({
    mutationFn: async (data: RewardForm) => {
      const rewardData = {
        ...data,
        pointsCost: parseInt(data.pointsCost),
        stockQuantity: data.stockQuantity ? parseInt(data.stockQuantity) : null,
        imageUrl: data.imageUrl || null,
      };
      
      if (isEditing) {
        return apiRequest("PATCH", `/api/admin/rewards/${reward.id}`, rewardData);
      } else {
        return apiRequest("POST", "/api/admin/rewards", rewardData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Reward ${isEditing ? "updated" : "created"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards"] });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} reward`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RewardForm) => {
    createRewardMutation.mutate(data);
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
            {isEditing ? "Edit Reward" : "Create New Reward"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reward Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="$100 Amazon Gift Card"
                        data-testid="input-reward-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="pointsCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points Cost</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="10000"
                        data-testid="input-points-cost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Detailed description of the reward..."
                      className="h-24"
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="stockQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="100"
                        data-testid="input-stock-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      data-testid="input-image-url"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <div className="text-sm text-gray-500">
                      Inactive rewards won't be visible to users
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createRewardMutation.isPending}
                data-testid="button-submit-reward"
              >
                {createRewardMutation.isPending 
                  ? (isEditing ? "Updating..." : "Creating...") 
                  : (isEditing ? "Update Reward" : "Create Reward")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
