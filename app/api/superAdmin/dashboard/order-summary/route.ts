import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  format,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
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
    const period = searchParams.get("period") || "this_week"; // Default to 'this_week'
    const location = searchParams.get("location");

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
        startDate = startOfYear(endDate);
        break;
      default:
        startDate = startOfWeek(endDate, { weekStartsOn: 1 });
        break;
    }

    // Build where clause with optional location filter
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Add shop filter if location is specified and not "all"
    if (location && location !== "all" && location.startsWith("shop-")) {
      const shopId = location.replace("shop-", "");
      whereClause.shopId = shopId;
    }

    // Fetch sells within the time period
    const sells = await prisma.sell.findMany({
      where: whereClause,
      include: {
        items: true,
      },
    });

    // Calculate total profit (assuming profit is the sum of item prices)
    const totalProfit = sells.reduce((sum, sell) => {
      const sellTotal = sell.items.reduce((itemSum, item) => {
        return itemSum + item.price * item.quantity;
      }, 0);
      return sum + sellTotal;
    }, 0);

    // Prepare data for the chart
    let labels: string[] = [];
    let data: number[] = [];

    if (period === "today" || period === "this_week") {
      // Group data by day
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      labels = days.map((day) => format(day, "EEE")); // 'EEE' for abbreviated day names (e.g., 'Mon')
      data = days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const daySells = sells.filter(
          (sell) => sell.createdAt >= dayStart && sell.createdAt < dayEnd
        );

        const dayTotal = daySells.reduce((sum, sell) => {
          const sellTotal = sell.items.reduce((itemSum, item) => {
            return itemSum + item.price * item.quantity;
          }, 0);
          return sum + sellTotal;
        }, 0);

        return dayTotal;
      });
    } else if (period === "this_month") {
      // Group data by week
      const weeks = eachWeekOfInterval(
        { start: startDate, end: endDate },
        { weekStartsOn: 1 }
      );
      labels = weeks.map((weekStart, index) => `Week ${index + 1}`);
      data = weeks.map((weekStart, index) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekSells = sells.filter(
          (sell) => sell.createdAt >= weekStart && sell.createdAt < weekEnd
        );

        const weekTotal = weekSells.reduce((sum, sell) => {
          const sellTotal = sell.items.reduce((itemSum, item) => {
            return itemSum + item.price * item.quantity;
          }, 0);
          return sum + sellTotal;
        }, 0);

        return weekTotal;
      });
    } else if (period === "this_year") {
      // Group data by month
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      labels = months.map((month) => format(month, "MMM")); // 'MMM' for abbreviated month names (e.g., 'Jan')
      data = months.map((monthStart) => {
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const monthSells = sells.filter(
          (sell) => sell.createdAt >= monthStart && sell.createdAt < monthEnd
        );

        const monthTotal = monthSells.reduce((sum, sell) => {
          const sellTotal = sell.items.reduce((itemSum, item) => {
            return itemSum + item.price * item.quantity;
          }, 0);
          return sum + sellTotal;
        }, 0);

        return monthTotal;
      });
    }

    return NextResponse.json({
      totalProfit,
      labels,
      data,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error("Error fetching order summary:", error);
    return NextResponse.json(
      { error: "Error fetching order summary" },
      { status: 500 }
    );
  }
}
