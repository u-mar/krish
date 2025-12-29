"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { API } from "@/lib/config";
import Loading from "@/app/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DeleteAlertDialog from "@/app/dashboard/_components/DeleteAlertDialog";
import AddInventoryDialog from "@/app/dashboard/superAdmin/(pages)/_components/AddInventoryDialog";
import { Store, Package, Calendar, FileText, Edit, ArrowLeft, Plus, Palette, Ruler } from "lucide-react";

export default function ViewStorePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();

  const { data: store, isLoading, isError } = useQuery({
    queryKey: ["store", params.id],
    queryFn: () =>
      axios.get(`${API}/superAdmin/store/${params.id}`).then((res) => res.data),
    staleTime: 60 * 1000,
    retry: 3,
  });

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !store) {
    return <div className="p-6 text-center text-red-500">Error loading store details.</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="w-fit"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Stores
        </Button>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{store.name}</h1>
              <p className="text-muted-foreground">Store Details</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/superAdmin/store/edit/${store.id}`}>
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <DeleteAlertDialog id={store.id} type="store" />
          </div>
        </div>
      </div>

      {/* Store Information Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{store.inventory?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Items in inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(store.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(store.createdAt).getFullYear()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="default" className="text-base">Active</Badge>
            <p className="text-xs text-muted-foreground mt-1">Operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Store Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Store Information</CardTitle>
          </div>
          <CardDescription>Basic details about this storage location</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
            <p className="text-base">{store.description || "No description provided"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <CardTitle>Inventory</CardTitle>
              </div>
              <CardDescription>All products stored in this location</CardDescription>
            </div>
            <AddInventoryDialog
              locationId={store.id}
              locationType="store"
              locationName={store.name}
            />
          </div>
        </CardHeader>
        <CardContent>
          {!store.inventory || store.inventory.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">No products yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Add products to this store to get started</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="min-w-full divide-y">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Palette className="h-3 w-3" />
                        Color
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Ruler className="h-3 w-3" />
                        Size
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y">
                  {store.inventory.map((item: any) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        {item.product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className="font-mono">{item.sku.sku}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary">{item.sku.variant.color}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary">{item.sku.size}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="default" className="font-mono">{item.quantity}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
