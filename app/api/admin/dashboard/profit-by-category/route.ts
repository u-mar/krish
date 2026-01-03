// app/api/admin/profit-by-category/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfDay,
} from "date-fns";

import { productSchema } from "@/app/validationSchema/productSchema";

export async function POST(request: NextRequest) {
  if (request.headers.get("content-length") === "0") {
    return NextResponse.json(
      { error: "You have to provide body information" },
      { status: 400 }
    );
  }

  const body = await request.json();

  const validation = productSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(validation.error.format(), { status: 400 });
  }

  try {
    return NextResponse.json("you cannot update anything", { status: 201 });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { message: "Error registering product", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "this_year"; // Default to 'this_year'

    let startDate: Date;
    const endDate = new Date(); // Now

    switch (period) {
      case "today":
        startDate = startOfDay(endDate);
        break;
      case "this_week":
        startDate = startOfWeek(endDate, { weekStartsOn: 1 }); // Week starts on Monday
        break;
      case "this_month":
        startDate = startOfMonth(endDate);
        break;
      case "this_year":
      default:
        startDate = startOfYear(endDate);
        break;
    }

    // Fetch sales within the time period
    const sells = await prisma.sell.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    // Aggregate sales amount per product
    const productSales: { [productName: string]: number } = {};

    sells.forEach((sell) => {
      sell.items.forEach((item) => {
        const productName = item.product?.name || "Unknown";
        const itemTotal = item.price * item.quantity;

        if (productSales[productName]) {
          productSales[productName] += itemTotal;
        } else {
          productSales[productName] = itemTotal;
        }
      });
    });

    // Convert the result to an array
    const result = Object.keys(productSales).map((productName) => ({
      category: productName,
      total: productSales[productName],
    }));

    return NextResponse.json({
      totalProfit: result.reduce((sum, item) => sum + item.total, 0),
      data: result,
    });
  } catch (error) {
    console.error("Error fetching profit by category:", error);
    return NextResponse.json(
      { error: "Error fetching profit by category" },
      { status: 500 }
    );
  }
}
