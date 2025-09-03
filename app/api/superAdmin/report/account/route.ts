import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const user = searchParams.get("user");
  const dateRange = searchParams.get("dateRange");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const exchangeType = searchParams.get("exchangeType");

  let transactionWhere: any = {
    isExchange: true,
    exchangeType: exchangeType && exchangeType !== "all" ? exchangeType : undefined
  };

  if (user && user !== 'all') {
    transactionWhere.userId = user;
  }

  // Apply date filters
  const currentDate = new Date();
  if (dateRange === "today") {
    transactionWhere.tranDate = {
      gte: new Date(currentDate.setHours(0, 0, 0, 0)),
      lt: new Date(currentDate.setHours(24, 0, 0, 0)),
    };
  }

  if (dateRange === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(currentDate.getDate() - 1);
    transactionWhere.tranDate = {
      gte: new Date(yesterday.setHours(0, 0, 0, 0)),
      lt: new Date(currentDate.setHours(0, 0, 0, 0)),
    };
  }

  if (dateRange === "specific-date" && fromDate && toDate) {
    transactionWhere.tranDate = {
      gte: new Date(fromDate),
      lt: new Date(new Date(toDate).setHours(23, 59, 59, 999)),
    };
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: transactionWhere,
      include: {
        user: true,
        account: {
          select: {
            id: true,
            account: true,
          },
        },
      },
    });

    // Calculate totals for deposits and withdrawals
    const totalDeposits = transactions.filter(t => t.exchangeType === 'deposit').length;
    const totalWithdrawals = transactions.filter(t => t.exchangeType === 'withdrawal').length;
    const totalDepositAmount = transactions
      .filter(t => t.exchangeType === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawalAmount = transactions
      .filter(t => t.exchangeType === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      transactions,
      summary: {
        totalDeposits,
        totalWithdrawals,
        totalDepositAmount,
        totalWithdrawalAmount,
      },
    });
  } catch (error) {
    console.error("Error fetching exchange transactions:", error);
    return NextResponse.json({ error: "Error fetching exchange transaction data." }, { status: 500 });
  }
}
