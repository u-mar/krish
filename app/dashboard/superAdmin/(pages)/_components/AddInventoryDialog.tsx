"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import axios from "axios";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/config";
import { Plus, X } from "lucide-react";
import ReactSelect from "react-select";

interface AddInventoryDialogProps {
  locationId: string;
  locationType: "store" | "shop";
  locationName: string;
}

interface FormValues {
  items: {
    productId: string | null;
    variantId: string;
    quantity: number;
    unit: "pieces" | "boxes";
  }[];
}

interface Variant {
  id: string;
  color: string;
}

interface Product {
  id: string;
  name: string;
  variants: Variant[];
}

export default function AddInventoryDialog({
  locationId,
  locationType,
  locationName,
}: AddInventoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<{ [key: number]: Variant[] }>({});
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { register, control, handleSubmit, watch, setValue, reset } = useForm<FormValues>({
    defaultValues: {
      items: [{ productId: null, variantId: "", quantity: 1, unit: "pieces" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch("items");

  // Fetch products with variants and SKUs
  const { data: products } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      console.log('🔵 [ADD INVENTORY] Fetching products...');
      const response = await axios.get(`${API}/superAdmin/product`);
      console.log('🔵 [ADD INVENTORY] Products fetched:', response.data?.length);
      if (response.data && response.data.length > 0) {
        console.log('🔵 [ADD INVENTORY] First product sample:', {
          name: response.data[0]?.name,
          variants: response.data[0]?.variants?.length,
          firstVariant: response.data[0]?.variants?.[0],
        });
      }
      return response.data;
    },
    enabled: open,
  });

  const handleProductSelect = (index: number, productId: string | null) => {
    console.log('🔵 [ADD INVENTORY] Product selected at index', index, ':', productId);
    const selectedProduct = products?.find((p) => p.id === productId);
    console.log('🔵 [ADD INVENTORY] Found product:', selectedProduct?.name);
    console.log('🔵 [ADD INVENTORY] Product variants:', selectedProduct?.variants?.length);
    
    if (selectedProduct) {
      setSelectedVariants((prev) => ({ ...prev, [index]: selectedProduct.variants }));
      setValue(`items.${index}.productId`, productId);
      setValue(`items.${index}.variantId`, "");
      console.log('✅ [ADD INVENTORY] Product setup complete for index', index);
    } else {
      console.warn('⚠️ [ADD INVENTORY] Product not found');
    }
  };

  const onSubmit = async (data: FormValues) => {
    console.log('🔵 [ADD INVENTORY] Form data:', JSON.stringify(data, null, 2));
    
    // Validate all items
    const invalidItems = data.items.filter(
      (item) => !item.productId || !item.variantId || item.quantity < 1
    );

    if (invalidItems.length > 0) {
      console.error('❌ [ADD INVENTORY] Invalid items found:', JSON.stringify(invalidItems, null, 2));
      
      const missingFields = [];
      if (invalidItems.some(item => !item.productId)) missingFields.push("Product");
      if (invalidItems.some(item => !item.variantId)) missingFields.push("Variant");
      if (invalidItems.some(item => item.quantity < 1)) missingFields.push("Quantity");
      
      toast.error(`Please complete: ${missingFields.join(", ")}`);
      return;
    }

    console.log('🔵 [ADD INVENTORY] Submitting to API...');
    setLoading(true);
    try {
      const payload = {
        items: data.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.unit === "boxes" ? Number(item.quantity) * 12 : Number(item.quantity),
        })),
      };
      console.log('🔵 [ADD INVENTORY] Payload:', payload);
      
      await axios.post(
        `${API}/superAdmin/${locationType}/${locationId}/inventory`,
        payload
      );

      const totalItems = data.items.reduce((sum, item) => sum + Number(item.quantity), 0);
      toast.success(
        `Added ${totalItems} units to ${locationName} successfully`
      );
      console.log('✅ [ADD INVENTORY] Success');
      queryClient.invalidateQueries({ queryKey: [locationType, locationId] });
      queryClient.invalidateQueries({ queryKey: [`${locationType}s`] });
      
      // Reset form
      reset();
      setSelectedVariants({});
      setOpen(false);
    } catch (error: any) {
      console.error('❌ [ADD INVENTORY] Error:', error);
      toast.error(
        error?.response?.data?.error || error?.message || "Failed to add inventory"
      );
    } finally {
      setLoading(false);
    }
  };

  // Prepare product options for react-select
  const productOptions = products?.map((product) => ({
    value: product.id,
    label: product.name,
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Inventory
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Products to {locationName}</DialogTitle>
          <DialogDescription>
            Select products and specify quantities to add to this {locationType}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="py-4">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-md">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs leading-normal">
                  <tr>
                    <th className="py-3 px-4 text-left">Product</th>
                    <th className="py-3 px-4 text-left">Variant</th>
                    <th className="py-3 px-4 text-left">Quantity</th>
                    <th className="py-3 px-4 text-left">Unit</th>
                    <th className="py-3 px-4 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="p-3 border">
                        <Controller
                          control={control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <ReactSelect
                              {...field}
                              options={productOptions}
                              onChange={(selectedOption) => {
                                field.onChange(selectedOption?.value || null);
                                handleProductSelect(index, selectedOption?.value || null);
                              }}
                              value={
                                productOptions?.find(
                                  (option) => option.value === field.value
                                ) || null
                              }
                              placeholder="Select Product"
                              isClearable
                              styles={{
                                control: (provided) => ({
                                  ...provided,
                                  minHeight: "40px",
                                  borderColor: "rgb(209 213 219)",
                                  borderRadius: "0.375rem",
                                }),
                                menu: (provided) => ({
                                  ...provided,
                                  zIndex: 9999,
                                }),
                              }}
                            />
                          )}
                        />
                      </td>

                      <td className="p-3 border">
                        <select
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400"
                          value={watchItems[index]?.variantId || ""}
                          onChange={(e) => setValue(`items.${index}.variantId`, e.target.value)}
                        >
                          <option value="">Select Variant</option>
                          {selectedVariants[index]?.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {variant.color}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-3 border">
                        <input
                          type="number"
                          min="1"
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400"
                          {...register(`items.${index}.quantity`)}
                        />
                      </td>

                      <td className="p-3 border">
                        <select
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400"
                          {...register(`items.${index}.unit`)}
                        >
                          <option value="pieces">Pieces</option>
                          <option value="boxes">Boxes (12 pcs)</option>
                        </select>
                      </td>

                      <td className="p-3 border text-center">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          className="text-red-500 hover:text-red-600 disabled:text-gray-300 transition"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              type="button"
              onClick={() =>
                append({
                  productId: null,
                  variantId: "",
                  quantity: 1,
                  unit: "pieces",
                })
              }
              className="mt-4 bg-emerald-500 hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                reset();
                setSelectedVariants({});
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Inventory"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
