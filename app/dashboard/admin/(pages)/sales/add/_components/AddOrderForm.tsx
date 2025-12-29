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

interface Account {
  id: string;
  account: string;
  balance: number;
  cashBalance: number;
  default: boolean;
}

export interface Order {
  id: string;
  status: string;
  type: Type;
  accountId: string;
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
  accountId: string;
  shopId?: string;
  amountPaid?: number;
}

const AddOrderForm: React.FC<{ order?: Order }> = ({ order }) => {
  const [selectedVariants, setSelectedVariants] = useState<{ [key: number]: Variant[] }>({});
  const [selectedSkus, setSelectedSkus] = useState<{ [key: number]: SKU[] }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [totalAmount, setTotalAmount] = useState<string>("0.00");
  const [isSubmitDisabled, setIsSubmitDisabled] = useState<boolean>(true);
  const [defaultAccount, setDefaultAccount] = useState<Account | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isValid },
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
        accountId: order.accountId || "",
        shopId: order.shopId || "",
      }
      : {
        products: [{ productId: "", name: "", price: 0, quantity: 1, unit: "pieces" as "pieces" | "boxes" }],
        status: "paid",
        type: "both",
        accountId: "",
        shopId: "",
      },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({ control, name: "products" });
  const watchProducts = watch("products");

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["adminSellProduct"],
    queryFn: () => axios.get<ProductWithVariants[]>(`${API}/admin/product`).then((res) => res.data),
    staleTime: 60 * 1000,
    retry: 3,
  });

  // Fetch accounts and set default account if available
  const { data: accounts } = useQuery({
    queryKey: ["adminSellAccounts"],
    queryFn: () => axios.get<Account[]>(`${API}/admin/account`).then((res) => res.data),
    staleTime: 60 * 1000,
    retry: 3,
  });

  // Fetch shops
  const { data: shops } = useQuery({
    queryKey: ["shops"],
    queryFn: () => axios.get(`${API}/admin/shop`).then((res) => res.data),
    staleTime: 60 * 1000,
    retry: 3,
  });

  useEffect(() => {
    if (accounts) {
      const defaultAcc = accounts.find((account) => account.default);
      if (defaultAcc) {
        setDefaultAccount(defaultAcc);
        setValue("accountId", defaultAcc.id);
      }
    }
  }, [accounts, setValue]);

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
    const selectedProduct = products?.find((p) => p.id === productId);
    if (selectedProduct) {
      setSelectedVariants((prev) => ({ ...prev, [index]: selectedProduct.variants }));
      setSelectedSkus((prev) => ({ ...prev, [index]: [] }));
      setValue(`products.${index}.productId`, productId);
      setValue(`products.${index}.variantId`, "");
      setValue(`products.${index}.skuId`, "");
      setValue(`products.${index}.price`, selectedProduct.price);
    }
  };

  const handleVariantSelect = (index: number, variantId: string) => {
    const selectedProduct = products?.find((p) => p.id === watchProducts[index].productId);
    const selectedVariant = selectedProduct?.variants.find((variant) => variant.id === variantId);
    if (selectedVariant) {
      setSelectedSkus((prev) => ({ ...prev, [index]: selectedVariant.skus }));
      setValue(`products.${index}.variantId`, variantId);
      setValue(`products.${index}.skuId`, "");
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
      (item) => item.productId && item.variantId && item.skuId && item.price > 0 && item.quantity > 0
    );
    const isFormValid = isProductsValid && isValid;

    setIsSubmitDisabled(!isFormValid);
  }, [watchProducts, totalAmount, isValid]);

  const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur();
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const outOfStockItems = data.products.filter(
      (item) => item.quantity > (item.stock || 0)
    );

    if (outOfStockItems.length > 0) {
      outOfStockItems.forEach((item) => {
        toast.error(
          `Not enough stock for ${item.name}. Available: ${item.stock}, Requested: ${item.quantity}`
        );
      });
      return;
    }
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
      type: "both",
      accountId: data.accountId,
      shopId: data.shopId || null,
      amountPaid: Number(data.amountPaid) || Number(totalAmount),
    };

    try {
      if (order) {
        await axios.patch(`${API}/admin/sell/${order.id}`, orderData);
        queryClient.invalidateQueries({ queryKey: ["order"] });
        toast.success("Order updated successfully!");
      } else {
        await axios.post(`${API}/admin/sell`, orderData);
        queryClient.invalidateQueries({ queryKey: ["order"] });
        toast.success("Order created successfully!");
      }
      setLoading(false);
      router.push("/dashboard/admin/sales");
    } catch (error: any) {
      setLoading(false);
      const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
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
                <th className="py-3 px-6 text-left">SKU</th>
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
                      onChange={(e) => handleVariantSelect(index, e.target.value)}
                    >
                      <option value="">Select Variant</option>
                      {selectedVariants[index]?.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.color}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-4 border">
                    <select
                      className="w-full border border-gray-300 rounded-lg p-3 text-base sm:text-sm focus:ring-2 focus:ring-blue-400"
                      value={watchProducts[index]?.skuId || ""}
                      onChange={(e) => handleSkuSelect(index, e.target.value)}
                    >
                      <option value="">Select SKU</option>
                      {selectedSkus[index]?.map((sku) => (
                        <option key={sku.id} value={sku.id}>
                          {sku.size} ({sku.stockQuantity} in stock)
                        </option>
                      ))}
                    </select>
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

        <div className="space-y-2 mt-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Amount Paid
          </label>
          <input
            type="number"
            step="any"
            min="0"
            {...register("amountPaid")}
            placeholder={`Total: ${totalAmount}`}
            defaultValue={totalAmount}
            className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-blue-400"
            onWheel={(e) => e.currentTarget.blur()}
          />
          <p className="text-xs text-gray-500">Leave empty to use total amount</p>
        </div>

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
