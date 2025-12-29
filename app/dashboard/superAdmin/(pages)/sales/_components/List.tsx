"use client";
import { DataTable } from "@/components/ui/dataTable";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { API } from "@/lib/config";
import Loading from "@/app/loading";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Store, DollarSign } from "lucide-react";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subWeeks, subMonths, endOfDay, endOfWeek, endOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


export default function List() {
  const [selectedShop, setSelectedShop] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const { data, isError, isLoading } = useQuery({
    queryKey: ["order"],
    queryFn: () => axios.get(`${API}/superAdmin/sell`).then((res) => res.data),
    staleTime: 60 * 1000,
    retry: 3,
  });

  const { data: shops } = useQuery({
    queryKey: ['shops'],
    queryFn: () => axios.get(`${API}/superAdmin/shop`).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const getDateRange = (filter: string) => {
    const now = new Date();
    
    switch (filter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "this_week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "last_week":
        const lastWeek = subWeeks(now, 1);
        return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "this_year":
        return { start: startOfYear(now), end: now };
      default:
        return null;
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    
    let filtered = data;

    // Filter by shop
    if (selectedShop !== "all") {
      filtered = filtered.filter((order: any) => order.shopId === selectedShop);
    }

    // Filter by date range
    if (dateFilter !== "all") {
      const dateRange = getDateRange(dateFilter);
      if (dateRange) {
        filtered = filtered.filter((order: any) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= dateRange.start && orderDate <= dateRange.end;
        });
      }
    }

    return filtered;
  }, [data, selectedShop, dateFilter]);

  const totalAmount = useMemo(() => {
    return filteredData.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
  }, [filteredData]);

  if (isLoading) {
    return <Loading />;
  }
  if (isError || !data) {
    return <div>Error loading orders.</div>;
  }


  return (
    <div className="my-4 space-y-4 sm:p-6 lg:p-2">
      <div className="flex justify-between">
        <h1 className="font-bold text-2xl">Orders</h1>
        <Link href={"/dashboard/superAdmin/sales/add"}>
          <Button variant={"default"}>
            Add Order
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-2 block">Filter by Shop</label>
          <Select value={selectedShop} onValueChange={setSelectedShop}>
            <SelectTrigger className="w-full">
              <Store className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shops</SelectItem>
              {shops?.map((shop: any) => (
                <SelectItem key={shop.id} value={shop.id}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-2 block">Filter by Date</label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(selectedShop !== "all" || dateFilter !== "all") && (
          <Button
            variant="outline"
            onClick={() => {
              setSelectedShop("all");
              setDateFilter("all");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Total Amount Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">KSH {totalAmount.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            {filteredData.length} order{filteredData.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <DataTable columns={columns} data={filteredData} search={'orderId'} />
    </div>
  );
}
