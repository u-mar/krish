import { NextRequest, NextResponse } from "next/server";
import { bankTransactionSchema } from "@/app/validationSchema/bankTransactionSchema";
import prisma from "@/prisma/client";


export async function POST(request: NextRequest) {
  if (request.headers.get("content-length") === "0") {
    return NextResponse.json(
      { error: "You have to provide body information" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const validation = bankTransactionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(validation.error.format(), { status: 400 });
  }

  try {
    // Handle accountId - get first account if not provided or invalid
    let accountId = body.accountId;
    if (!accountId || accountId === "default" || accountId.length !== 24) {
      const firstAccount = await prisma.accounts.findFirst();
      if (!firstAccount) {
        return NextResponse.json(
          { error: "No accounts available in the system" },
          { status: 404 }
        );
      }
      accountId = firstAccount.id;
    }

    const account = await prisma.accounts.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Adjust balances based on transaction type
    let newCashBalance = account.cashBalance;
    let newBalance = account.balance;

    if (body.acc === "cr") {
      // Credit: Increase both cash and digital balances based on provided values
      newCashBalance += body.cashBalance ?? 0;
      newBalance += body.digitalBalance ?? 0;
    } else if (body.acc === "dr") {
      // Debit: Decrease both cash and digital balances based on provided values
      newCashBalance -= body.cashBalance ?? 0;
      newBalance -= body.digitalBalance ?? 0;
    } else {
      return NextResponse.json(
        { error: "Invalid transaction type (acc). Must be 'cr' or 'dr'." },
        { status: 400 }
      );
    }

    // Create the bank transaction
    const newTransaction = await prisma.bankTransaction.create({
      data: {
        bankAccountId: body.bankAccountId,
        accountId: accountId,
        cashBalance: body.cashBalance ?? 0.0,
        digitalBalance: body.digitalBalance ?? 0.0,
        details: body.details,
        amount: (body.cashBalance ?? 0.0) + (body.digitalBalance ?? 0.0),
        acc: body.acc,
        createdAt: new Date(),
      },
    });

    // Update the account with the new balance and cash balance
    await prisma.accounts.update({
      where: { id: accountId },
      data: {
        cashBalance: newCashBalance,
        balance: newBalance,
      },
    });

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error: any) {
    console.error("Error creating bank transaction:", error);
    return NextResponse.json(
      { message: "Error creating bank transaction", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const transactions = await prisma.bankTransaction.findMany({
      orderBy: { createdAt: "desc" },
      include: { account: { select: { id: true, account: true } } },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error("Error fetching bank transactions:", error);
    return NextResponse.json(
      { message: "Error fetching bank transactions", error: error.message },
      { status: 500 }
    );
  }
}
