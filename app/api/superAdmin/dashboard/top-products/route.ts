import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client"; // Adjust the path to your Prisma client file

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all products and their associated SellItems (order items)
    const products = await prisma.product.findMany({
      include: {
        orderItem: true, // Includes SellItems associated with each product
      },
    });

    // Calculate metrics for each product
    const productData = products.map((product) => {
      const productPrice = product.price;

      // Total quantity sold
      const quantitySold = product.orderItem.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      // Total sales value (quantity sold * product price from orderItem)
      const totalSales = product.orderItem.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Profit = total sales - cost of sold items (quantity sold * original product price)
      const profit = totalSales - quantitySold * productPrice;

      return {
        productName: product.name,
        productPrice,
        quantitySold,
        totalSales,
        profit,
      };
    });

    // Sort products by quantity sold (descending), and then by profit (descending)
    const sortedProducts = productData
      .sort((a, b) => b.quantitySold - a.quantitySold || b.profit - a.profit)
      .slice(0, 10); // Take the top 10 products

    // Return the top 10 products
    return NextResponse.json(sortedProducts, { status: 200 });
  } catch (error) {
    console.error("Error fetching top products:", error);
    return NextResponse.json(
      { error: "Failed to fetch top 10 products" },
      { status: 500 }
    );
  }
}
