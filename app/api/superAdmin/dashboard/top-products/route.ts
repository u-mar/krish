import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client"; // Adjust the path to your Prisma client file

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");

    // Build where clause for sells based on location
    const sellWhereClause: any = {};
    
    // Add shop filter if location is specified and not "all"
    if (location && location !== "all" && location.startsWith("shop-")) {
      const shopId = location.replace("shop-", "");
      sellWhereClause.shopId = shopId;
    }

    // Fetch sells with items based on location filter
    const sells = await prisma.sell.findMany({
      where: sellWhereClause,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Aggregate product data from sells
    const productMetrics: {
      [productId: string]: {
        productName: string;
        productPrice: number;
        quantitySold: number;
        totalSales: number;
        profit: number;
      };
    } = {};

    sells.forEach((sell) => {
      sell.items.forEach((item) => {
        if (!item.product) return;

        const productId = item.productId;
        if (productId == null) return;
        const productPrice = item.product.price;
        const itemSales = item.price * item.quantity;
        const itemProfit = itemSales - productPrice * item.quantity;

        if (productMetrics[productId]) {
          productMetrics[productId].quantitySold += item.quantity;
          productMetrics[productId].totalSales += itemSales;
          productMetrics[productId].profit += itemProfit;
        } else {
          productMetrics[productId] = {
            productName: item.product.name,
            productPrice,
            quantitySold: item.quantity,
            totalSales: itemSales,
            profit: itemProfit,
          };
        }
      });
    });

    // Convert to array and sort
    const sortedProducts = Object.values(productMetrics)
      .sort((a, b) => b.quantitySold - a.quantitySold || b.profit - a.profit)
      .slice(0, 10); // Take the top 10 products

    // Return the top 10 products
    return NextResponse.json(sortedProducts, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error("Error fetching top products:", error);
    return NextResponse.json(
      { error: "Failed to fetch top 10 products" },
      { status: 500 }
    );
  }
}
