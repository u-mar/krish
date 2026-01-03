"use client";

import { useForm, useFieldArray, SubmitHandler, Controller } from "react-hook-form";
import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/lib/config";
import toast, { Toaster } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product, Type } from "@prisma/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Select from "react-select"; // Import react-select


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
  productId: string;
}

interface ProductWithVariants extends Product {
  variants: Variant[];
}

interface OrderItem {
  id: string;
  productId: string | null;
  skuId: string;
  price: number;
  quantity: number;
  product: ProductWithVariants | null;
  sku: SKU;
}

export interface Order {
  id: string;
  status: string;
  type: Type;
  shopId?: string;
  items: OrderItem[];
  cashAmount?: number;
  digitalAmount?: number;
}

interface FormValues {
  products: {
    id?: string;
    productId: string | null;
    name: string;
    variantId?: string;
    skuId?: string;
    price: number;
    quantity: number;
    unit: "pieces" | "boxes";
    stock?: number;
  }[];
  status: string;
  type: Type;
  shopId?: string;
  isDebt?: boolean;
  bankAccountId?: string;
  cashAmount?: number;
  digitalAmount?: number;
}

const AddOrderForm: React.FC<{ order?: Order }> = ({ order }) => {
  const [selectedVariants, setSelectedVariants] = useState<{ [key: number]: Variant[] }>({});
  const [selectedSkus, setSelectedSkus] = useState<{ [key: number]: SKU[] }>({});

  // Debug selectedVariants changes
  useEffect(() => {
    console.log('🔵 [ORDER FORM] selectedVariants updated:', selectedVariants);
  }, [selectedVariants]);

  useEffect(() => {
    console.log('🔵 [ORDER FORM] selectedSkus updated:', selectedSkus);
  }, [selectedSkus]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalAmount, setTotalAmount] = useState<string>("0.00");
  const [isSubmitDisabled, setIsSubmitDisabled] = useState<boolean>(true);
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isValid, errors },
  } = useForm<FormValues>({
    defaultValues: order
      ? {
        products: order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          name: item.product?.name || "",
          variantId: item.sku.variantId,
          skuId: item.skuId,
          price: item.price,
          quantity: item.quantity,
          unit: "pieces" as "pieces" | "boxes",
          stock: item.sku.stockQuantity,
        })),
        status: order.status,
        type: "both",
        shopId: order.shopId || "",
        cashAmount: order.cashAmount || 0,
        digitalAmount: order.digitalAmount || 0,
      }
      : {
        products: [{ productId: "", name: "", variantId: "", skuId: "", price: 0, quantity: 1, unit: "pieces" as "pieces" | "boxes" }],
        status: "paid",
        type: "both",
        shopId: "",
        isDebt: false,
        bankAccountId: "",
        cashAmount: 0,
        digitalAmount: 0,
      },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({ control, name: "products" });
  const watchProducts = watch("products");

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["superAdminSellProduct"],
    queryFn: async () => {
      console.log('🔵 [ORDER FORM] Fetching products...');
      const response = await axios.get<ProductWithVariants[]>(`${API}/superAdmin/product`);
      console.log('🔵 [ORDER FORM] Products fetched:', response.data?.length || 0);
      if (response.data && response.data.length > 0) {
        console.log('🔵 [ORDER FORM] First product sample:', response.data[0]);
        console.log('🔵 [ORDER FORM] First product variants:', response.data[0]?.variants);
      }
      return response.data;
    },
    staleTime: 60 * 1000,
    retry: 3,
  });

  // Fetch shops
  const { data: shops } = useQuery({
    queryKey: ["shops"],
    queryFn: () => axios.get(`${API}/superAdmin/shop`).then((res) => res.data),
    staleTime: 60 * 1000,
    retry: 3,
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => axios.get(`${API}/superAdmin/bank`).then((res) => res.data),
    staleTime: 60 * 1000,
    retry: 3,
  });

  // Set selected variants and SKUs if in edit mode
  useEffect(() => {
    if (order && products) {
      order.items.forEach((item, index) => {
        const product = item.product;
        if (product) {
          setSelectedVariants((prev) => ({ ...prev, [index]: product.variants }));
          const variant = product.variants.find((v) => v.id === item.sku.variantId);
          if (variant) {
            setSelectedSkus((prev) => ({ ...prev, [index]: variant.skus }));
          }
        }
      });
    }
  }, [order, products]);

  const handleProductSelect = (index: number, productId: string | null) => {
    console.log('🔵 [ORDER FORM] Product selected at index:', index, 'productId:', productId);
    const selectedProduct = products?.find((p) => p.id === productId);
    console.log('🔵 [ORDER FORM] Selected product:', selectedProduct);
    console.log('🔵 [ORDER FORM] Product variants:', selectedProduct?.variants);
    
    if (selectedProduct) {
      console.log('🔵 [ORDER FORM] Setting variants for index', index, ':', selectedProduct.variants);
      setSelectedVariants((prev) => ({ ...prev, [index]: selectedProduct.variants }));
      setSelectedSkus((prev) => ({ ...prev, [index]: [] }));
      setValue(`products.${index}.productId`, productId);
      setValue(`products.${index}.variantId`, "");
      setValue(`products.${index}.skuId`, "");
      setValue(`products.${index}.price`, selectedProduct.price);
      console.log('✅ [ORDER FORM] Product setup complete');
    } else {
      console.warn('⚠️ [ORDER FORM] Product not found');
    }
  };

  const handleVariantSelect = (index: number, variantId: string) => {
    console.log('🔵 [ORDER FORM] Variant selected at index:', index, 'variantId:', variantId);
    console.log('🔵 [ORDER FORM] Current watchProducts:', watchProducts[index]);
    console.log('🔵 [ORDER FORM] Available products:', products?.length);
    
    const selectedProduct = products?.find((p) => p.id === watchProducts[index].productId);
    console.log('🔵 [ORDER FORM] Found product:', selectedProduct);
    
    const selectedVariant = selectedProduct?.variants.find((variant) => variant.id === variantId);
    console.log('🔵 [ORDER FORM] Found variant:', selectedVariant);
    console.log('🔵 [ORDER FORM] Variant SKUs:', selectedVariant?.skus);
    
    if (selectedVariant) {
      // Always set the variant ID
      setValue(`products.${index}.variantId`, variantId);
      console.log('✅ [ORDER FORM] Variant ID set:', variantId);
      
      // If SKUs exist, auto-select the first one
      if (selectedVariant.skus && selectedVariant.skus.length > 0) {
        console.log('🔵 [ORDER FORM] Setting SKUs for index', index, ':', selectedVariant.skus);
        setSelectedSkus((prev) => ({ ...prev, [index]: selectedVariant.skus }));
        
        // Auto-select first SKU
        const firstSku = selectedVariant.skus[0];
        console.log('🔵 [ORDER FORM] Auto-selecting first SKU:', firstSku);
        setValue(`products.${index}.skuId`, firstSku.id);
        setValue(`products.${index}.stock`, firstSku.stockQuantity);
      } else {
        console.log('⚠️ [ORDER FORM] No SKUs available, variant set without SKU');
        setSelectedSkus((prev) => ({ ...prev, [index]: [] }));
        setValue(`products.${index}.skuId`, "");
        setValue(`products.${index}.stock`, 0);
      }
      console.log('✅ [ORDER FORM] Variant setup complete');
    } else {
      console.error('❌ [ORDER FORM] Variant not found');
      console.log('🔵 [ORDER FORM] selectedVariant:', selectedVariant);
    }
  };

  const handleSkuSelect = (index: number, skuId: string) => {
    setValue(`products.${index}.skuId`, skuId);
    const selectedSku = selectedSkus[index]?.find((sku) => sku.id === skuId);
    setValue(`products.${index}.stock`, selectedSku?.stockQuantity || 0);
  };

  useEffect(() => {
    const subscription = watch((values) => {
      const total = (values.products ?? [])
        .reduce(
          (acc, item) => {
            const quantity = item?.unit === "boxes" ? Number(item?.quantity || 0) * 12 : Number(item?.quantity || 0);
            return acc + Number(item?.price || 0) * quantity;
          },
          0
        )
        .toFixed(2);
      setTotalAmount(total);
    });

    // Clean up the subscription when the component unmounts
    return () => subscription.unsubscribe();
  }, [watch, setTotalAmount]);

  // Validate form fields and conditions for submit button
  useEffect(() => {
    const isProductsValid = watchProducts.every(
      (item) => item.productId && item.variantId && item.price > 0 && item.quantity > 0
    );
    const isFormValid = isProductsValid && isValid;

    setIsSubmitDisabled(!isFormValid);
  }, [watchProducts, totalAmount, isValid]);

  const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur();
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    // Remove client-side stock validation since we're now checking shop inventory on the server
    // The server will validate actual shop inventory based on variants
    
    console.log('🔵 [ORDER FORM] Submitting order with data:', data);
    
    setLoading(true);
    const orderData = {
      items: data.products.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        skuId: item.skuId,
        price: Number(item.price),
        quantity: item.unit === "boxes" ? Number(item.quantity) * 12 : Number(item.quantity),
      })),
      status: data.status,
      type: data.type,
      shopId: data.shopId || null,
      isDebt: data.isDebt || false,
      customerId: data.bankAccountId || null, // Send as customerId for the API
      cashAmount: data.isDebt ? 0 : (Number(data.cashAmount) || 0),
      digitalAmount: data.isDebt ? 0 : (Number(data.digitalAmount) || 0),
    };
    
    console.log('🔵 [ORDER FORM] Prepared orderData:', orderData);

    try {
      if (order) {
        await axios.patch(`${API}/superAdmin/sell/${order.id}`, orderData);
        queryClient.invalidateQueries({ queryKey: ["order"] });
        toast.success("Order updated successfully!");
      } else {
        await axios.post(`${API}/superAdmin/sell`, orderData);
        queryClient.invalidateQueries({ queryKey: ["order"] });
        toast.success("Order created successfully!");
      }
      setLoading(false);
      router.push("/dashboard/superAdmin/sales");
    } catch (error: any) {
      setLoading(false);
      console.error('❌ [ORDER FORM] Error submitting order:', error);
      console.error('❌ [ORDER FORM] Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "An unexpected error occurred.";
      toast.error(errorMessage);
    }
  };

  // Prepare product options for react-select
  const productOptions = products?.map((product) => ({
    value: product.id,
    label: product.name,
  }));

  return (
    <div className="container mx-auto my-10 p-6 bg-gray-50 rounded-lg shadow-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Order Form</h1>
        <div className="overflow-x-auto md:overflow-x-visible">
          <table className="min-w-full bg-white border border-gray-200 rounded-md">
            <thead className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal hidden sm:table-header-group">
              <tr>
                <th className="py-3 px-6 text-left">Product</th>
                <th className="py-3 px-6 text-left">Variant</th>
                <th className="py-3 px-6 text-left">Price</th>
                <th className="py-3 px-6 text-left">Quantity</th>
                <th className="py-3 px-6 text-left">Unit</th>
                <th className="py-3 px-6 text-left">Total</th>
                <th className="py-3 px-6 text-center">Remove</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr
                  key={field.id}
                  className={`${index % 2 === 0 ? "bg-gray-50" : "bg-white"
                    } hover:bg-gray-100 flex flex-col sm:table-row`}
                >
                  <td className="p-4 border">
                    <Controller
                      control={control}
                      name={`products.${index}.productId`}
                      render={({ field }) => (
                        <Select
                          {...field}
                          options={productOptions}
                          onChange={(selectedOption) => {
                            field.onChange(selectedOption?.value || "");
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
                              minHeight: "48px", // Larger height for better touch interaction
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

                  <td className="p-4 border">
                    <select
                      className="w-full border border-gray-300 rounded-lg p-3 text-base sm:text-sm focus:ring-2 focus:ring-blue-400"
                      value={watchProducts[index]?.variantId || ""}
                      onChange={(e) => {
                        console.log('🔵 [ORDER FORM] Variant dropdown changed:', e.target.value);
                        handleVariantSelect(index, e.target.value);
                      }}
                      disabled={!selectedVariants[index] || selectedVariants[index].length === 0}
                    >
                      <option value="">Select Variant</option>
                      {selectedVariants[index]?.map((variant) => {
                        console.log('🔵 [ORDER FORM] Rendering variant option:', variant.id, variant.color);
                        return (
                          <option key={variant.id} value={variant.id}>
                            {variant.color}
                          </option>
                        );
                      })}
                    </select>
                    {selectedVariants[index] && selectedVariants[index].length === 0 && (
                      <p className="text-xs text-red-500 mt-1">No variants available for this product</p>
                    )}
                  </td>

                  <td className="p-4 border">
                    <input
                      type="number"
                      step="any" // Allows decimal numbers
                      onWheel={handleWheel}
                      className="w-full border border-gray-300 rounded-lg p-3 text-base sm:text-sm focus:ring-2 focus:ring-blue-400"
                      placeholder={`Price: ${watchProducts[index]?.price || ""}`}
                      {...register(`products.${index}.price`)}
                      onFocus={(e) => (e.target.value = "")}
                    />
                  </td>

                  <td className="p-4 border">
                    <input
                      type="number"
                      onWheel={handleWheel}
                      className="w-full border border-gray-300 rounded-lg p-3 text-base sm:text-sm focus:ring-2 focus:ring-blue-400"
                      {...register(`products.${index}.quantity`)}
                    />
                  </td>

                  <td className="p-4 border">
                    <select
                      className="w-full border border-gray-300 rounded-lg p-3 text-base sm:text-sm focus:ring-2 focus:ring-blue-400"
                      {...register(`products.${index}.unit`)}
                    >
                      <option value="pieces">Pieces</option>
                      <option value="boxes">Boxes (12 pcs)</option>
                    </select>
                  </td>

                  <td className="p-4 border text-gray-700 text-base sm:text-sm">
                    {(
                      Number(watchProducts[index]?.price || 0) *
                      (watchProducts[index]?.unit === "boxes" 
                        ? Number(watchProducts[index]?.quantity || 0) * 12 
                        : Number(watchProducts[index]?.quantity || 0))
                    ).toFixed(2)}
                  </td>

                  <td className="p-4 border text-center">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-600 transition text-base sm:text-sm"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Button
            type="button"
            onClick={() =>
              append({
                productId: null, // Ensure the product is null to align with React Select
                name: "",
                price: 0,
                quantity: 1,
                unit: "pieces",
                variantId: "",
                skuId: "",
                stock: 0,
              })
            }
            className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-md transition"
          >
            Add Product
          </Button>

        </div>

        <div className="space-y-2 mt-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Shop
          </label>
          <select
            {...register("shopId")}
            className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Select Shop (Optional)</option>
            {shops?.map((shop: any) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <input
            type="checkbox"
            id="isDebt"
            {...register("isDebt")}
            className="w-4 h-4 text-yellow-600 focus:ring-2 focus:ring-yellow-400 cursor-pointer"
          />
          <label htmlFor="isDebt" className="text-gray-700 font-semibold cursor-pointer">
            📋 This is a debt order (payment will be made later)
          </label>
        </div>

        {watch("isDebt") && (
          <div className="mt-4 space-y-2">
            <label className="block text-gray-700 font-semibold mb-2">
              👤 Select Customer *
            </label>
            <select
              {...register("bankAccountId", {
                required: watch("isDebt") ? "Customer is required for debt orders" : false,
              })}
              className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Select a customer</option>
              {customers?.map((customer: any) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.accountNumber}
                </option>
              ))}
            </select>
            {errors.bankAccountId && (
              <p className="text-red-500 text-sm">{errors.bankAccountId.message}</p>
            )}
          </div>
        )}

        {!watch("isDebt") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <label className="block text-gray-700 font-semibold mb-2">
                💵 Cash Amount Received
              </label>
              <input
                type="number"
                step="any"
                min="0"
                {...register("cashAmount")}
                placeholder="0.00"
                className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-green-400"
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-gray-700 font-semibold mb-2">
                💳 Digital Amount Received
              </label>
              <input
                type="number"
                step="any"
                min="0"
                {...register("digitalAmount")}
                placeholder="0.00"
                className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-blue-400"
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
          </div>
        )}

        <div className="text-right mt-4">
          <p className="text-lg font-semibold text-gray-800">
            Subtotal: {totalAmount}
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading || isSubmitDisabled}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-md mt-6 transition"
        >
          {loading ? (
            <Loader2 className="animate-spin h-5 w-5 mx-auto" />
          ) : order ? (
            "Update Order"
          ) : (
            "Create Order"
          )}
        </Button>
      </form>
      <Toaster />
    </div>

  );
};

export default AddOrderForm;
