import { NextRequest, NextResponse } from "next/server";
import { bankTransactionSchema } from "@/app/validationSchema/bankTransactionSchema";
import prisma from "@/prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const existingTransaction = await prisma.bankTransaction.findUnique({
      where: { id: params.id },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Bank transaction not found" },
        { status: 404 }
      );
    }

    const oldAccountId = existingTransaction.accountId;
    
    if (!oldAccountId) {
      return NextResponse.json(
        { error: "Transaction has no associated account" },
        { status: 400 }
      );
    }

    const oldAccount = await prisma.accounts.findUnique({
      where: { id: oldAccountId },
    });

    if (!oldAccount) {
      return NextResponse.json(
        { error: "Original account not found" },
        { status: 404 }
      );
    }

    let oldCashBalance = oldAccount.cashBalance;
    let oldDigitalBalance = oldAccount.balance;

    // Revert old transaction effect on old account
    if (existingTransaction.acc === "cr") {
      oldCashBalance -= existingTransaction.cashBalance ?? 0;
      oldDigitalBalance -= existingTransaction.digitalBalance ?? 0;
    } else if (existingTransaction.acc === "dr") {
      oldCashBalance += existingTransaction.cashBalance ?? 0;
      oldDigitalBalance += existingTransaction.digitalBalance ?? 0;
    }

    const newAccountId = body.accountId;
    let newAccountIdChanged = newAccountId !== oldAccountId;

    // Initialize variables for new account balances
    let newAccount: any;
    let newCashBalance = 0;
    let newDigitalBalance = 0;

    if (newAccountIdChanged) {
      // Fetch the new account
      newAccount = await prisma.accounts.findUnique({
        where: { id: newAccountId },
      });

      if (!newAccount) {
        return NextResponse.json(
          { error: "New account not found" },
          { status: 404 }
        );
      }

      newCashBalance = newAccount.cashBalance;
      newDigitalBalance = newAccount.balance;
    } else {
      // Use old account for new account
      newAccount = oldAccount;
      newCashBalance = oldCashBalance;
      newDigitalBalance = oldDigitalBalance;
    }

    // Apply new transaction effect on new account
    if (body.acc === "cr") {
      newCashBalance += body.cashBalance ?? 0;
      newDigitalBalance += body.digitalBalance ?? 0;
    } else if (body.acc === "dr") {
      newCashBalance -= body.cashBalance ?? 0;
      newDigitalBalance -= body.digitalBalance ?? 0;
    } else {
      return NextResponse.json(
        { error: "Invalid transaction type (acc). Must be 'cr' or 'dr'." },
        { status: 400 }
      );
    }

    // Start a database transaction to ensure atomicity
    await prisma.$transaction(async (prisma) => {
      // Update the old account balances
      await prisma.accounts.update({
        where: { id: oldAccountId },
        data: {
          cashBalance: oldCashBalance,
          balance: oldDigitalBalance,
        },
      });

      if (newAccountIdChanged) {
        // Update the new account balances
        await prisma.accounts.update({
          where: { id: newAccountId },
          data: {
            cashBalance: newCashBalance,
            balance: newDigitalBalance,
          },
        });
      } else {
        // If the account didn't change, update the balances in the same account
        await prisma.accounts.update({
          where: { id: newAccountId },
          data: {
            cashBalance: newCashBalance,
            balance: newDigitalBalance,
          },
        });
      }

      // Update the transaction with new data
      await prisma.bankTransaction.update({
        where: { id: params.id },
        data: {
          accountId: newAccountId,
          details: body.details,
          cashBalance: body.cashBalance ?? 0.0,
          digitalBalance: body.digitalBalance ?? 0.0,
          acc: body.acc,
          amount: (body.cashBalance ?? 0.0) + (body.digitalBalance ?? 0.0),
        },
      });
    });

    // Fetch the updated transaction to return in the response
    const updatedTransaction = await prisma.bankTransaction.findUnique({
      where: { id: params.id },
    });

    return NextResponse.json(updatedTransaction, { status: 200 });
  } catch (error: any) {
    console.error("Error updating bank transaction:", error);
    return NextResponse.json(
      { message: "Error updating bank transaction", error: error.message },
      { status: 500 }
    );
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transaction = await prisma.bankTransaction.findUnique({
      where: { id: params.id },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Bank transaction not found" },
        { status: 404 }
      );
    }

    if (!transaction.accountId) {
      return NextResponse.json(
        { error: "Transaction has no associated account" },
        { status: 400 }
      );
    }

    const account = await prisma.accounts.findUnique({
      where: { id: transaction.accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    let newCashBalance = account.cashBalance;
    let newDigitalBalance = account.balance;

    // Revert transaction's effect on balances
    if (transaction.acc === "cr") {
      newCashBalance -= transaction.cashBalance ?? 0;
      newDigitalBalance -= transaction.digitalBalance ?? 0;
    } else if (transaction.acc === "dr") {
      newCashBalance += transaction.cashBalance ?? 0;
      newDigitalBalance += transaction.digitalBalance ?? 0;
    }

    // Update the account with new balances
    await prisma.accounts.update({
      where: { id: transaction.accountId },
      data: {
        cashBalance: newCashBalance,
        balance: newDigitalBalance,
      },
    });

    // Delete the transaction
    await prisma.bankTransaction.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      { message: "Bank transaction deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting bank transaction:", error);
    return NextResponse.json(
      { message: "Error deleting bank transaction", error: error.message },
      { status: 500 }
    );
  }
}
