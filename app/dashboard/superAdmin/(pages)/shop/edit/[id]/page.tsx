"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API } from "@/lib/config";
import Loading from "@/app/loading";

type FormData = {
  name: string;
  description?: string;
};

export default function EditShopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>();

  const { data: shop, isLoading, isError } = useQuery({
    queryKey: ["shop", resolvedParams.id],
    queryFn: () =>
      axios.get(`${API}/superAdmin/shop/${resolvedParams.id}`).then((res) => res.data),
    staleTime: 60 * 1000,
    retry: 3,
  });

  useEffect(() => {
    if (shop) {
      setValue("name", shop.name);
      setValue("description", shop.description || "");
    }
  }, [shop, setValue]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await axios.put(`${API}/superAdmin/shop/${resolvedParams.id}`, data);
      toast.success("Shop updated successfully");
      router.push("/dashboard/superAdmin/shop");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to update shop");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !shop) {
    return <div>Error loading shop.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Shop</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Shop Name *</Label>
          <Input
            id="name"
            {...register("name", { required: "Shop name is required" })}
            placeholder="e.g., Shop A"
            disabled={loading}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Optional description"
            rows={4}
            disabled={loading}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Shop"}
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
