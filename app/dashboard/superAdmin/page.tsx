"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API } from "@/lib/config";
import CardsDetails from "./_components/Card";
import OrderSummary from "./_components/OrderSummary";
import ProfitByCategory from "./_components/ProfitByCategory";
import SalesChart from "./_components/SalesChart";
import TopProducts from "./_components/TopProducts";
import ShopStoreMetrics from "./_components/ShopStoreMetrics";
import { LayoutDashboard, MonitorUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const Dashboard = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Fetch shops
  const { data: shops } = useQuery({
    queryKey: ["shops"],
    queryFn: () => axios.get(`${API}/superAdmin/shop`).then((res) => res.data),
    staleTime: 60 * 1000,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Location Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your business overview</p>
          </div>
        </div>

        {/* Location Filter */}
        <Card className="w-full md:w-80">
          <CardContent className="p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Shop</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  {shops && shops.length > 0 && (
                    <>
                      {shops.map((shop: any) => (
                        <SelectItem key={shop.id} value={`shop-${shop.id}`}>
                          <div className="flex items-center gap-2">
                            <MonitorUp className="h-4 w-4" />
                            {shop.name}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardsDetails selectedLocation={selectedLocation} />
      </div>

      {/* Shop & Store Metrics */}
      {selectedLocation === "all" && <ShopStoreMetrics />}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit by Category */}
        <ProfitByCategory selectedLocation={selectedLocation} />

        {/* Order Summary */}
        <OrderSummary selectedLocation={selectedLocation} />
      </div>

      {/* Sales Chart - Full Width */}
      <div className="w-full">
        <SalesChart selectedLocation={selectedLocation} />
      </div>

      {/* Top Products - Full Width */}
      <div className="w-full">
        <TopProducts selectedLocation={selectedLocation} />
      </div>
    </div>
  );
};

export default Dashboard;
