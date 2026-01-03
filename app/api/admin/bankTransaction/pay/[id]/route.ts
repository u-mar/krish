import { NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { getServerSession } from "next-auth";
import AuthOptions from "@/app/api/auth/[...nextauth]/AuthOptions";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(AuthOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;
  const body = await request.json();
  const { paymentAmount } = body;

  if (!paymentAmount || paymentAmount <= 0) {
    return NextResponse.json(
      { error: "Invalid payment amount" },
      { status: 400 }
    );
  }

  try {
    // Get the transaction
    const transaction = await prisma.bankTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Only allow payment for debit transactions
    if (transaction.acc !== "dr") {
      return NextResponse.json(
        { error: "Can only pay debit transactions" },
        { status: 400 }
      );
    }

    const newAmountPaid = transaction.amountPaid + paymentAmount;
    const remainingBalance = transaction.amount - newAmountPaid;

    // Check if payment exceeds remaining balance
    if (newAmountPaid > transaction.amount) {
      return NextResponse.json(
        { error: "Payment amount exceeds remaining balance" },
        { status: 400 }
      );
    }

    // Update the transaction with the new amount paid
    const updatedTransaction = await prisma.bankTransaction.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
      },
    });

    // Update the bank account balance
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: transaction.bankAccountId },
    });

    if (bankAccount) {
      await prisma.bankAccount.update({
        where: { id: transaction.bankAccountId },
        data: {
          cashBalance:
            bankAccount.cashBalance +
            (transaction.cashBalance > 0 ? paymentAmount : 0),
          digitalBalance:
            bankAccount.digitalBalance +
            (transaction.digitalBalance > 0 ? paymentAmount : 0),
          totalBalance: bankAccount.totalBalance + paymentAmount,
        },
      });
    }

    return NextResponse.json(updatedTransaction, { status: 200 });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
