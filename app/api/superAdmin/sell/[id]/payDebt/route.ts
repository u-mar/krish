import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { AuthOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/prisma/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// POST - Pay debt for a sell order
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(AuthOptions);

    if (!session) {
      return NextResponse.json(
        { error: "You must be logged in to perform this action" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cashAmount, digitalAmount } = body;

    const sellId = params.id;

    // Validate amounts
    const cash = parseFloat(cashAmount) || 0;
    const digital = parseFloat(digitalAmount) || 0;
    const totalPayment = cash + digital;

    if (totalPayment <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Get the sell order
    const sell = await prisma.sell.findUnique({
      where: { id: sellId },
    });

    if (!sell) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!sell.isDebt) {
      return NextResponse.json(
        { error: "This order is not a debt" },
        { status: 400 }
      );
    }

    const remainingDebt = sell.debtAmount - sell.debtPaid;

    if (remainingDebt <= 0) {
      return NextResponse.json(
        { error: "This debt is already fully paid" },
        { status: 400 }
      );
    }

    // Check if payment exceeds remaining debt
    if (totalPayment > remainingDebt) {
      return NextResponse.json(
        { error: `Payment amount exceeds remaining debt of ${remainingDebt.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Process payment in a transaction
    const result = await prisma.$transaction(
      async (tx) => {
        // Create debt payment record
        const payment = await tx.debtPayment.create({
          data: {
            sellId: sellId,
            cashAmount: cash,
            digitalAmount: digital,
            totalPaid: totalPayment,
          },
        });

        // Update sell debt amounts
        const newDebtPaid = sell.debtPaid + totalPayment;

        const updatedSell = await tx.sell.update({
          where: { id: sellId },
          data: {
            debtPaid: newDebtPaid,
            cashAmount: (sell.cashAmount || 0) + cash,
            digitalAmount: (sell.digitalAmount || 0) + digital,
          },
        });

        // Create bank transaction if order is linked to a customer
        if (sell.bankAccountId) {
          await tx.bankTransaction.create({
            data: {
              bankAccountId: sell.bankAccountId,
              accountId: sell.accountId || undefined,
              details: `Debt payment for Order ${sell.orderId}`,
              cashBalance: cash,
              digitalBalance: digital,
              amount: totalPayment,
              amountPaid: totalPayment,
              acc: "cr", // Credit - money received
            },
          });
        }

        // Update wallet balances
        let wallet = await tx.wallet.findFirst();

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              cashBalance: 0,
              digitalBalance: 0,
            },
          });
        }

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            cashBalance: { increment: cash },
            digitalBalance: { increment: digital },
          },
        });

        return { payment, updatedSell };
      },
      {
        maxWait: 10000, // 10 seconds max wait
        timeout: 20000, // 20 seconds timeout
      }
    );

    return NextResponse.json(
      {
        message: "Payment recorded successfully",
        payment: result.payment,
        remainingDebt: result.updatedSell.debtAmount - result.updatedSell.debtPaid,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error processing debt payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payment" },
      { status: 500 }
    );
  }
}
