'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, MonitorUp, Package, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

export default function ShopStoreMetrics() {
  const { data: shops } = useQuery({
    queryKey: ['shops'],
    queryFn: () => axios.get(`${API}/superAdmin/shop`).then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: () => axios.get(`${API}/superAdmin/store`).then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const metrics = useMemo(() => {
    const totalShops = shops?.length || 0;
    const totalStores = stores?.length || 0;
    
    const totalShopInventory = shops?.reduce((acc: number, shop: any) => 
      acc + (shop._count?.inventory || 0), 0) || 0;
    
    const totalStoreInventory = stores?.reduce((acc: number, store: any) => 
      acc + (store._count?.inventory || 0), 0) || 0;

    return { totalShops, totalStores, totalShopInventory, totalStoreInventory };
  }, [shops, stores]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Shops */}
      <Link href="/dashboard/superAdmin/shop">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
            <MonitorUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalShops}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active retail locations
            </p>
          </CardContent>
        </Card>
      </Link>

      {/* Total Stores */}
      <Link href="/dashboard/superAdmin/store">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStores}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Warehouse locations
            </p>
          </CardContent>
        </Card>
      </Link>

      {/* Shop Inventory */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Shop Inventory</CardTitle>
          <Package className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalShopInventory.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total products in shops
          </p>
        </CardContent>
      </Card>

      {/* Store Inventory */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Store Inventory</CardTitle>
          <TrendingUp className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalStoreInventory.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total products in stores
          </p>
        </CardContent>
      </Card>

      {/* Shop Details Grid */}
      {shops && shops.length > 0 && (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MonitorUp className="h-5 w-5" />
              Shop Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shops.map((shop: any) => (
                <Link key={shop.id} href={`/dashboard/superAdmin/shop/view/${shop.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-background">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{shop.name}</h3>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>{shop._count?.inventory || 0} products</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              <span>{shop._count?.sells || 0} sales</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          Shop
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Store Details Grid */}
      {stores && stores.length > 0 && (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Store Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((store: any) => (
                <Link key={store.id} href={`/dashboard/superAdmin/store/view/${store.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-purple-50 to-white dark:from-purple-950 dark:to-background">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{store.name}</h3>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>{store._count?.inventory || 0} products</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                          Store
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
