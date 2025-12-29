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
import { ShoppingBag, Package, TrendingUp, Plus } from "lucide-react";

export default function List() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["shops"],
    queryFn: () => axios.get(`${API}/superAdmin/shop`).then((res) => res.data),
    staleTime: 60 * 1000,
    retry: 3,
  });

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !data) {
    return <div className="p-6 text-center text-red-500">Error loading shops.</div>;
  }

  const totalProducts = data.reduce((acc: number, shop: any) => acc + (shop._count?.inventory || 0), 0);
  const totalOrders = data.reduce((acc: number, shop: any) => acc + (shop._count?.sells || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShoppingBag className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shops</h1>
            <p className="text-muted-foreground">Manage your retail locations</p>
          </div>
        </div>
        <Link href={"/dashboard/superAdmin/shop/add"}>
          <Button variant={"default"} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Shop
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
            <p className="text-xs text-muted-foreground">Active retail locations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">Items in all shops</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">All-time sales</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shop Directory</CardTitle>
          <CardDescription>View and manage all retail locations</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} type={"shop"} search={"name"} />
        </CardContent>
      </Card>
    </div>
  );
}
