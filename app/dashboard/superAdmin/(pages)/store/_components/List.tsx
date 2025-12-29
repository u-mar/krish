"use client";
import { DataTable } from "@/components/ui/dataTable";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { API } from "@/lib/config";
import Loading from "@/app/loading";
import { Store, Package, Plus } from "lucide-react";

export default function List() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: () => axios.get(`${API}/superAdmin/store`).then((res) => res.data),
    staleTime: 60 * 1000,
    retry: 3,
  });

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !data) {
    return <div className="p-6 text-center text-red-500">Error loading stores.</div>;
  }

  const totalProducts = data.reduce((acc: number, store: any) => acc + (store._count?.inventory || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stores</h1>
            <p className="text-muted-foreground">Manage your storage locations</p>
          </div>
        </div>
        <Link href={"/dashboard/superAdmin/store/add"}>
          <Button variant={"default"} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Store
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
            <p className="text-xs text-muted-foreground">Active storage locations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">Items in all stores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. per Store</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length > 0 ? Math.round(totalProducts / data.length) : 0}</div>
            <p className="text-xs text-muted-foreground">Average inventory</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Directory</CardTitle>
          <CardDescription>View and manage all storage locations</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} type={"store"} search={"name"} />
        </CardContent>
      </Card>
    </div>
  );
}
