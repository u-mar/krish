import { NextRequest, NextResponse } from "next/server";
import { bankSchema } from "@/app/validationSchema/bankSchema";
import prisma from "@/prisma/client";

async function generateAccountNumber() {
  const lastSwap = await prisma.bankAccount.findFirst({
    orderBy: { createdAt: "desc" },
    select: { accountNumber: true },
  });

  const lastSwapNumber = lastSwap?.accountNumber
    ? parseInt(lastSwap.accountNumber.split("-")[1])
    : 0;
  return `ACC-${String(lastSwapNumber + 1).padStart(4, "0")}`;
}
export async function POST(request: NextRequest) {
  if (request.headers.get("content-length") === "0") {
    return NextResponse.json(
      { error: "You have to provide body information" },
      { status: 400 }
    );
  }

  const body = await request.json();

  const validation = bankSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(validation.error.format(), { status: 400 });
  }

  try {
    // Create the bank with its associated atLeast attributes
    const newBank = await prisma.bankAccount.create({
      data: {
        name: body.name,
        accountNumber: await generateAccountNumber(), // Auto-generate orderId here
        totalBalance: 0,
        cashBalance: 0,
        digitalBalance: 0,
        userId: body.userId || undefined,
      },
    });

    return NextResponse.json(newBank, { status: 201 });
  } catch (error: any) {
    console.error("Error creating bank", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Fetch all bank accounts with their transactions
  const bankAccounts = await prisma.bankAccount.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      transactions: {
        select: {
          amount: true,
          amountPaid: true,
          acc: true, // 'cr' or 'dr' to indicate credit or debit
        },
      },
    },
  });

  // Calculate the balance and debt owed for each bank account
  const bankAccountsWithBalance = bankAccounts.map((account) => {
    const totalCr = account.transactions
      .filter((transaction) => transaction.acc === "cr")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    // For debits, calculate remaining debt (amount - amountPaid)
    const totalDr = account.transactions
      .filter((transaction) => transaction.acc === "dr")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const debtOwed = account.transactions
      .filter((transaction) => transaction.acc === "dr")
      .reduce((sum, transaction) => sum + (transaction.amount - transaction.amountPaid), 0);

    // Calculate balance by subtracting total debits from total credits
    const balance = totalCr - totalDr;

    // Return the account data along with the calculated balance and debt owed
    return {
      ...account,
      balance, // Include the calculated balance
      debtOwed, // Include the debt owed after payments
    };
  });

  return NextResponse.json(bankAccountsWithBalance, { status: 200 });
}
