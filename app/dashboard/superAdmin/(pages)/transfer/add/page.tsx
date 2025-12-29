"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API } from "@/lib/config";
import Loading from "@/app/loading";
import ReactSelect from "react-select";
import { Plus, X } from "lucide-react";

type FormData = {
  fromType: "store" | "shop";
  fromLocationId: string;
  toType: "store" | "shop";
  toLocationId: string;
  items: {
    productId: string | null;
    variantId: string;
    quantity: number;
    unit: "pieces" | "boxes";
  }[];
  notes?: string;
};

interface SKU {
  id: string;
  size: string;
  sku: string;
  stockQuantity: number;
  variantId: string;
  variant: Variant;
}

interface Variant {
  id: string;
  color: string;
  skus: SKU[];
}

interface Product {
  id: string;
  name: string;
  variants: Variant[];
}

export default function AddTransferPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<{ [key: number]: Variant[] }>({});
  const [selectedSkus, setSelectedSkus] = useState<{ [key: number]: SKU[] }>({});
  
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      items: [{ productId: null, variantId: "", quantity: 1, unit: "pieces" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch("items");

  const fromType = watch("fromType");
  const fromLocationId = watch("fromLocationId");
  const toType = watch("toType");

  // Fetch stores
  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: () => axios.get(`${API}/superAdmin/store`).then((res) => res.data),
  });

  // Fetch shops
  const { data: shops } = useQuery({
    queryKey: ["shops"],
    queryFn: () => axios.get(`${API}/superAdmin/shop`).then((res) => res.data),
  });

  // Fetch products with variants and SKUs
  const { data: products } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => axios.get(`${API}/superAdmin/product`).then((res) => res.data),
  });

  const handleProductSelect = (index: number, productId: string | null) => {
    const selectedProduct = products?.find((p) => p.id === productId);
    if (selectedProduct) {
      setSelectedVariants((prev) => ({ ...prev, [index]: selectedProduct.variants }));
      setValue(`items.${index}.productId`, productId);
      setValue(`items.${index}.variantId`, "");
    }
  };

  const onSubmit = async (data: FormData) => {
    // Validate all items
    const invalidItems = data.items.filter(
      (item) => !item.productId || !item.variantId || item.quantity < 1
    );

    if (invalidItems.length > 0) {
      toast.error("Please complete all product selections and enter valid quantities");
      return;
    }

    setLoading(true);
    try {
      // Submit all transfers
      for (const item of data.items) {
        const payload = {
          fromType: data.fromType,
          fromStoreId: data.fromType === "store" ? data.fromLocationId : null,
          fromShopId: data.fromType === "shop" ? data.fromLocationId : null,
          toType: data.toType,
          toStoreId: data.toType === "store" ? data.toLocationId : null,
          toShopId: data.toType === "shop" ? data.toLocationId : null,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.unit === "boxes" ? Number(item.quantity) * 12 : Number(item.quantity),
          notes: data.notes,
        };

        await axios.post(`${API}/superAdmin/transfer`, payload);
      }

      const totalItems = data.items.reduce((sum, item) => sum + Number(item.quantity), 0);
      toast.success(`Successfully transferred ${totalItems} units`);
      router.push("/dashboard/superAdmin/transfer");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to transfer products");
    } finally {
      setLoading(false);
    }
  };

  const fromLocations = fromType === "store" ? stores : shops;
  const toLocations = toType === "store" ? stores : shops;

  // Prepare product options for react-select
  const productOptions = products?.map((product) => ({
    value: product.id,
    label: product.name,
  }));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Transfer Product</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FROM Section */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h2 className="font-semibold text-lg">From</h2>
            
            <div className="space-y-2">
              <Label htmlFor="fromType">Location Type *</Label>
              <Controller
                name="fromType"
                control={control}
                rules={{ required: "From type is required" }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="store">Store</SelectItem>
                      <SelectItem value="shop">Shop</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.fromType && (
                <p className="text-sm text-red-500">{errors.fromType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromLocationId">Location *</Label>
              <Controller
                name="fromLocationId"
                control={control}
                rules={{ required: "From location is required" }}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!fromType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {fromLocations?.map((loc: any) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.fromLocationId && (
                <p className="text-sm text-red-500">{errors.fromLocationId.message}</p>
              )}
            </div>
          </div>

          {/* TO Section */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h2 className="font-semibold text-lg">To</h2>
            
            <div className="space-y-2">
              <Label htmlFor="toType">Location Type *</Label>
              <Controller
                name="toType"
                control={control}
                rules={{ required: "To type is required" }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="store">Store</SelectItem>
                      <SelectItem value="shop">Shop</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.toType && (
                <p className="text-sm text-red-500">{errors.toType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="toLocationId">Location *</Label>
              <Controller
                name="toLocationId"
                control={control}
                rules={{ required: "To location is required" }}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!toType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {toLocations?.map((loc: any) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.toLocationId && (
                <p className="text-sm text-red-500">{errors.toLocationId.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Product Selection */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h2 className="font-semibold text-lg">Product Details</h2>
          
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
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            {...register("notes")}
            placeholder="Optional notes"
            rows={3}
            disabled={loading}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Transferring..." : "Transfer Products"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
