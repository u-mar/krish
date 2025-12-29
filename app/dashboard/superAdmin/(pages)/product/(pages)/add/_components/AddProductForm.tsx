"use client";
import { z } from "zod";
import React, { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  FormField,
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
import { API } from "@/lib/config";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PlusCircle, Trash } from "lucide-react";
import { Product } from "@prisma/client";
import CategoryIdSelect from "./CategoryIdSelect";

const productSchema = z.object({
  name: z.string(),
  price: z.number(),
  categoryId: z.string(),
  description: z.string().optional(),
  variants: z.array(
    z.object({
      id: z.string().optional(),
      color: z.string(),
    })
  ),
});


type Variant = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  productId: string;
  color: string;
  skus: { 
    id: string; 
    size: string; 
    sku: string; 
    stockQuantity: number;
    shopInventory?: any[];
    storeInventory?: any[];
  }[];
};

type ProductWithVariants = Product & {
  variants: Variant[];
};

const generateUniqueSKU = (productName: string, color: string, size: string) => {
  const randomPart = Math.floor(Math.random() * 10000); // Random 4 digit number
  const sku = `${productName.substring(0, 3).toUpperCase()}-${color.substring(0, 3).toUpperCase()}-${size.toUpperCase()}-${randomPart}`;
  return sku;
};

// Handle Enter Key Press to navigate between fields
const handleEnterPress = (
  event: React.KeyboardEvent,
  nextRef: React.RefObject<any>
) => {
  if (event.key === "Enter") {
    event.preventDefault(); // Prevent form submission on Enter
    if (nextRef.current && typeof nextRef.current.focus === "function") {
      nextRef.current.focus(); // Focus on the next input
    }
  }
};

const AddProductForm = ({ product }: { product?: ProductWithVariants }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      price: product?.price || 0,
      categoryId: product?.categoryId || "",
      description: product?.description || "",
      variants:
        product?.variants?.map((variant) => ({
          id: variant.id || "", // Ensure id is included
          color: variant.color || "",
          skus: variant.skus?.map((sku) => ({
            id: sku.id || "", // Ensure sku id is included
            size: sku.size || "",
            sku: sku.sku || "",
            stockQuantity: sku.stockQuantity || 0,
          })) || [],
        })) || [],
    },
  });

  const { watch } = form;
  const priceRef = useRef<HTMLInputElement | null>(null);
  const categoryRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const addVariantButtonRef = useRef<HTMLInputElement | null>(null);
  const firstVariantSizeRef = useRef<HTMLInputElement | null>(null);
  const firstVariantColorRef = useRef<HTMLInputElement | null>(null);
  const firstVariantStockQuantityRef = useRef<HTMLInputElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  // Watch the entire form and log the current values in real time
  const formData = watch(); // This will re-render on every change
  useEffect(() => {
  }, [formData]);

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control: form.control,
    name: "variants", // Field array for variants
  });

  const onSubmit = async (values: z.infer<typeof productSchema>) => {

    // Check if we are editing an existing product
    const isEditing = !!product;


    setLoading(true);
    try {
      const response = isEditing
        ? await axios.patch(`${API}/superAdmin/product/${product?.id}`, values)
        : await axios.post(`${API}/superAdmin/product`, values);

      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success(`Successfully ${isEditing ? "Updated" : "Created"} Product`);
      router.push("/dashboard/superAdmin/product");
    } catch (error) {
      console.error(error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <Card className="max-w-4xl mx-auto my-10 p-4 shadow-lg rounded-lg">
        <CardHeader className="mb-6">
          <CardTitle className="text-2xl font-bold">
            {product ? "Update Product" : "Register New Product"}
          </CardTitle>
          <CardDescription className="text-sm text-gray-500">
            {product ? "Update product details" : "Register a new product"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Product Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} onKeyDown={(e) => handleEnterPress(e, priceRef)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category ID */}
              <FormField
                control={form.control}
                name="categoryId"
                render={() => <CategoryIdSelect control={form.control} />}
              />

              {/* Product Price */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any" // Allows decimal numbers
                        placeholder="Enter product price"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                        ref={priceRef}
                        onKeyDown={(e) => handleEnterPress(e, descriptionRef)} // Set focus to next input
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Product Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter product description"
                        {...field}
                        ref={descriptionRef}
                         />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Variants Management */}
              <div className="space-y-6">
                <h3 className="font-bold text-lg">Variants</h3>

                {variantFields.map((variant, variantIndex) => (
                  <div
                    key={variant.id || variantIndex}
                    className="border p-4 rounded-md space-y-4 bg-gray-50"
                  >
                    {/* Variant Color */}
                    <FormField
                      control={form.control}
                      name={`variants.${variantIndex}.color`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variant Color</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter variant color"
                              {...field}
                              ref={firstVariantColorRef}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Remove Variant Button */}
                    <Button
                      variant="destructive"
                      type="button"
                      onClick={() => removeVariant(variantIndex)}
                      className="flex items-center space-x-2 mt-4 bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Trash className="h-4 w-4" />
                      <span>Remove Variant</span>
                    </Button>
                  </div>
                ))}

                {/* Add Variant Button */}
                <Button
                  type="button"
                  onClick={() =>
                    appendVariant({
                      id: "",
                      color: "",
                      skus: [],
                    })
                  }
                  className="flex items-center space-x-2 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <PlusCircle className="h-5 w-5" />
                  <span>Add Variant</span>
                </Button>
              </div>

              <SubmitButtonWithContent
                loading={form.formState.isSubmitting || loading}
                isUpdate={!!product}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
      <Toaster />
    </>
  );
};

export default AddProductForm;

// Component for handling SKUs within a variant
const SKUsFieldArray = ({
  control,
  variantIndex,
  isEditing,
  firstVariantSizeRef,
  firstVariantStockQuantityRef,
}: {
  control: any;
  variantIndex: number;
  isEditing: boolean;
  firstVariantSizeRef: React.RefObject<HTMLInputElement>;
  firstVariantStockQuantityRef: React.RefObject<HTMLInputElement>;
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `variants.${variantIndex}.skus`,
  });

  return (
    <div className="space-y-4">
      {fields.map((sku, skuIndex) => (
        <div key={sku.id || skuIndex} className="flex space-x-4">
          {/* SKU Size */}
          <FormField
            control={control}
            name={`variants.${variantIndex}.skus.${skuIndex}.size`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Size</FormLabel>
                <FormControl>
                  <Input placeholder="Size" {...field} ref={firstVariantSizeRef}
                    onKeyDown={(e) => handleEnterPress(e, firstVariantStockQuantityRef)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* SKU Field (Hidden or Disabled) */}
          {isEditing ? (
            <FormField
              control={control}
              name={`variants.${variantIndex}.skus.${skuIndex}.sku`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="SKU" {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="flex-1 hidden">
              <FormLabel>SKU</FormLabel>
              <p>Will be generated automatically</p>
            </div>
          )}

          {/* Stock Quantity */}
          <FormField
            control={control}
            name={`variants.${variantIndex}.skus.${skuIndex}.stockQuantity`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Stock Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Stock Quantity"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                    onWheel={(e) => e.currentTarget.blur()} // Disable mouse wheel change
                    ref={firstVariantStockQuantityRef}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Remove SKU Button */}
          <Button
            variant="destructive"
            type="button"
            onClick={() => remove(skuIndex)}
            className="self-end mt-4 bg-red-500 hover:bg-red-600 text-white"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {/* Add SKU Button */}
      {!isEditing && (
        <Button
          type="button"
          onClick={() => append({ size: "", sku: "", stockQuantity: 0 })}
          className="flex items-center space-x-2 bg-green-600 text-white hover:bg-green-700"
        >
          <PlusCircle className="h-5 w-5" />
          <span>Add SKU</span>
        </Button>
      )}
    </div>
  );
};





// Submit Button Component
export const SubmitButtonWithContent = ({
  loading,
  isUpdate,
}: {
  loading: boolean;
  isUpdate: boolean;
}) => {
  if (loading) {
    return (
      <Button className="space-x-2 gap-x-1 bg-gray-400" disabled>
        {isUpdate ? "Updating" : "Registering"} Product
        <Loader2 className="animate-spin h-5 w-5 text-white mx-2" />
      </Button>
    );
  }

  return (
    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
      {isUpdate ? "Update Product" : "Register Product"}
    </Button>
  );
};
