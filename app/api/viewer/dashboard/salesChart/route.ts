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

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "this_week";

    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case "today":
        startDate = startOfDay(endDate);
        break;
      case "this_week":
        startDate = startOfWeek(endDate, { weekStartsOn: 1 });
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

    // Fetch sales data within the time period
    const sales = await prisma.sell.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            product: true, // Include product details for price
          },
        },
      },
    });

    // Calculate total revenue and total profit
    let totalRevenue = 0;
    let totalProfit = 0;

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const revenue = item.price * item.quantity;
        const cost = item.product ? item.product.price * item.quantity : 0; // Assuming product cost is stored in product.price
        const profit = revenue - cost;

        totalRevenue += revenue;
        totalProfit += profit;
      });
    });

    // Prepare chart data
    let labels: string[] = [];
    let revenueData: number[] = [];
    let profitData: number[] = [];

    if (period === "today" || period === "this_week") {
      // Group data by day
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      labels = days.map((day) => format(day, "EEE"));
      revenueData = days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const daySales = sales.filter(
          (sale) => sale.createdAt >= dayStart && sale.createdAt < dayEnd
        );

        return daySales.reduce((sum, sale) => {
          return (
            sum +
            sale.items.reduce((itemSum, item) => {
              return itemSum + item.price * item.quantity;
            }, 0)
          );
        }, 0);
      });

      profitData = days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const daySales = sales.filter(
          (sale) => sale.createdAt >= dayStart && sale.createdAt < dayEnd
        );

        return daySales.reduce((sum, sale) => {
          return (
            sum +
            sale.items.reduce((itemSum, item) => {
              const revenue = item.price * item.quantity;
              const cost = item.product ? item.product.price * item.quantity : 0;
              return itemSum + (revenue - cost);
            }, 0)
          );
        }, 0);
      });
    } else if (period === "this_month") {
      // Group data by week
      const weeks = eachWeekOfInterval(
        { start: startDate, end: endDate },
        { weekStartsOn: 1 }
      );
      labels = weeks.map((weekStart, index) => `Week ${index + 1}`);
      revenueData = weeks.map((weekStart) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekSales = sales.filter(
          (sale) => sale.createdAt >= weekStart && sale.createdAt < weekEnd
        );

        return weekSales.reduce((sum, sale) => {
          return (
            sum +
            sale.items.reduce((itemSum, item) => {
              return itemSum + item.price * item.quantity;
            }, 0)
          );
        }, 0);
      });

      profitData = weeks.map((weekStart) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekSales = sales.filter(
          (sale) => sale.createdAt >= weekStart && sale.createdAt < weekEnd
        );

        return weekSales.reduce((sum, sale) => {
          return (
            sum +
            sale.items.reduce((itemSum, item) => {
              const revenue = item.price * item.quantity;
              const cost = item.product ? item.product.price * item.quantity : 0;
              return itemSum + (revenue - cost);
            }, 0)
          );
        }, 0);
      });
    } else if (period === "this_year") {
      // Group data by month
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      labels = months.map((month) => format(month, "MMM"));
      revenueData = months.map((monthStart) => {
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const monthSales = sales.filter(
          (sale) => sale.createdAt >= monthStart && sale.createdAt < monthEnd
        );

        return monthSales.reduce((sum, sale) => {
          return (
            sum +
            sale.items.reduce((itemSum, item) => {
              return itemSum + item.price * item.quantity;
            }, 0)
          );
        }, 0);
      });

      profitData = months.map((monthStart) => {
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const monthSales = sales.filter(
          (sale) => sale.createdAt >= monthStart && sale.createdAt < monthEnd
        );

        return monthSales.reduce((sum, sale) => {
          return (
            sum +
            sale.items.reduce((itemSum, item) => {
              const revenue = item.price * item.quantity;
              const cost = item.product ? item.product.price * item.quantity : 0;
              return itemSum + (revenue - cost);
            }, 0)
          );
        }, 0);
      });
    }

    return NextResponse.json({
      totalRevenue,
      totalProfit,
      labels,
      revenueData,
      profitData,
    });
  } catch (error) {
    console.error("Error fetching sales chart data:", error);
    return NextResponse.json(
      { error: "Error fetching sales chart data" },
      { status: 500 }
    );
  }
}
