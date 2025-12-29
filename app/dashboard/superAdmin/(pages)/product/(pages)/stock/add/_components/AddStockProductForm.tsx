"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import Select from "react-select";
import ReactSelect from "react-select";
import { API } from "@/lib/config";
import { StockQuantity } from "@prisma/client";

// Validation schema - updated to support multiple items
const stockSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1, "Please select a product"),
    variantId: z.string().min(1, "Please select a variant"),
    skuId: z.string().min(1, "Please select an SKU"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unit: z.enum(["pieces", "boxes"]),
  })).min(1, "At least one product is required"),
});

// Types
interface Product {
  id: string;
  name: string;
  variants: Variant[];
}

interface Variant {
  id: string;
  color: string;
  skus: SKU[];
}

interface SKU {
  id: string;
  size: string;
  sku: string;
  stockQuantity: number;
}

const StockQuantityForm = ({
  stockQuantity,
}: {
  stockQuantity?: StockQuantity;
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<{ [key: number]: Variant[] }>({});
  const [selectedSKUs, setSelectedSKUs] = useState<{ [key: number]: SKU[] }>({});

  const form = useForm({
    resolver: zodResolver(stockSchema),
    defaultValues: stockQuantity
      ? {
          items: [{
            productId: stockQuantity.productId || "",
            variantId: stockQuantity.variantId || "",
            skuId: stockQuantity.skuId || "",
            quantity: stockQuantity.quantity || 1,
            unit: "pieces" as const,
          }],
        }
      : {
          items: [{ productId: "", variantId: "", skuId: "", quantity: 1, unit: "pieces" as const }],
        },
  });

  const { control, handleSubmit, watch, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch("items");

  // Fetch products with variants and SKUs included
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () =>
      axios.get<Product[]>(`${API}/superAdmin/product`).then((res) => res.data),
    staleTime: 60 * 1000,
  });

  const handleProductSelect = (index: number, productId: string) => {
    const selectedProduct = products?.find((p) => p.id === productId);
    if (selectedProduct) {
      setSelectedVariants((prev) => ({ ...prev, [index]: selectedProduct.variants || [] }));
      setSelectedSKUs((prev) => ({ ...prev, [index]: [] }));
      setValue(`items.${index}.productId`, productId);
      setValue(`items.${index}.variantId`, "");
      setValue(`items.${index}.skuId`, "");
    }
  };

  const handleVariantSelect = (index: number, variantId: string) => {
    const selectedVariant = selectedVariants[index]?.find((variant) => variant.id === variantId);
    if (selectedVariant) {
      setSelectedSKUs((prev) => ({ ...prev, [index]: selectedVariant.skus || [] }));
      setValue(`items.${index}.variantId`, variantId);
      setValue(`items.${index}.skuId`, "");
    }
  };

  // Set selected variants and SKUs if in edit mode
  useEffect(() => {
    if (stockQuantity && products) {
      const product = products.find((p) => p.id === stockQuantity.productId);
      if (product) {
        setSelectedVariants({ 0: product.variants || [] });
        const variant = product.variants.find((v) => v.id === stockQuantity.variantId);
        if (variant) {
          setSelectedSKUs({ 0: variant.skus || [] });
        }
      }
    }
  }, [stockQuantity, products]);

  const onSubmit = async (values: z.infer<typeof stockSchema>) => {
    setLoading(true);
    try {
      if (stockQuantity) {
        // Update stock quantity (single item only for edit mode)
        const item = values.items[0];
        await axios.patch(
          `${API}/superAdmin/product/stock/${stockQuantity.id}`,
          {
            ...item,
            quantity: item.unit === "boxes" ? item.quantity * 12 : item.quantity,
          }
        );
        toast.success("Stock updated successfully");
      } else {
        // Add new stock quantities (supports multiple items)
        for (const item of values.items) {
          await axios.post(`${API}/superAdmin/product/stock`, {
            ...item,
            quantity: item.unit === "boxes" ? item.quantity * 12 : item.quantity,
          });
        }
        const totalItems = values.items.reduce(
          (sum, item) => sum + (item.unit === "boxes" ? item.quantity * 12 : item.quantity),
          0
        );
        toast.success(`${totalItems} stock items added successfully`);
      }
      router.push("/dashboard/superAdmin/product/stock");
    } catch (error) {
      console.error(error);
      toast.error("An error occurred. Please try again.");
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
    <div className="container mx-auto my-10 p-6 bg-gray-50 rounded-lg shadow-xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {stockQuantity ? "Update Stock Quantity" : "Add Stock Quantity"}
          </CardTitle>
          <CardDescription>
            {stockQuantity
              ? "Update the existing stock quantity"
              : "Add a new stock quantity for a product"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-md">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-xs leading-normal">
                    <tr>
                      <th className="py-3 px-4 text-left">Product</th>
                      <th className="py-3 px-4 text-left">Variant</th>
                      <th className="py-3 px-4 text-left">SKU</th>
                      <th className="py-3 px-4 text-left">Quantity</th>
                      <th className="py-3 px-4 text-left">Unit</th>
                      {!stockQuantity && (
                        <th className="py-3 px-4 text-center">Remove</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="p-3 border">
                          <FormField
                            control={control}
                            name={`items.${index}.productId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Controller
                                    name={`items.${index}.productId`}
                                    control={control}
                                    render={({ field }) => (
                                      <ReactSelect
                                        {...field}
                                        options={productOptions}
                                        onChange={(selectedOption) => {
                                          field.onChange(selectedOption?.value || "");
                                          handleProductSelect(index, selectedOption?.value || "");
                                        }}
                                        value={
                                          productOptions?.find(
                                            (option) => option.value === field.value
                                          ) || null
                                        }
                                        placeholder="Select Product"
                                        isClearable
                                        isLoading={loadingProducts}
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
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>

                        <td className="p-3 border">
                          <FormField
                            control={control}
                            name={`items.${index}.variantId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <select
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400"
                                    value={field.value || ""}
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      handleVariantSelect(index, e.target.value);
                                    }}
                                  >
                                    <option value="">Select Variant</option>
                                    {selectedVariants[index]?.map((variant) => (
                                      <option key={variant.id} value={variant.id}>
                                        {variant.color}
                                      </option>
                                    ))}
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>

                        <td className="p-3 border">
                          <FormField
                            control={control}
                            name={`items.${index}.skuId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <select
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400"
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value)}
                                  >
                                    <option value="">Select SKU</option>
                                    {selectedSKUs[index]?.map((sku) => (
                                      <option key={sku.id} value={sku.id}>
                                        {sku.size} ({sku.stockQuantity} in stock)
                                      </option>
                                    ))}
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>

                        <td className="p-3 border">
                          <FormField
                            control={control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    onWheel={(e) => e.currentTarget.blur()}
                                    placeholder="Quantity"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(parseFloat(e.target.value) || 0)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>

                        <td className="p-3 border">
                          <FormField
                            control={control}
                            name={`items.${index}.unit`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <select
                                    {...field}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="pieces">Pieces</option>
                                    <option value="boxes">Boxes (12 pcs)</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>

                        {!stockQuantity && (
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
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!stockQuantity && (
                <Button
                  type="button"
                  onClick={() =>
                    append({
                      productId: "",
                      variantId: "",
                      skuId: "",
                      quantity: 1,
                      unit: "pieces",
                    })
                  }
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              )}

              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5 mx-auto" />
                ) : (
                  "Submit"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
};

export default StockQuantityForm;
