import { NextRequest, NextResponse } from "next/server";
import { transactionSchema } from "@/app/validationSchema/transactionSchema";
import prisma from "@/prisma/client";
import { getServerSession } from "next-auth";
import AuthOptions from "@/app/api/auth/[...nextauth]/AuthOptions";
import { User } from "@prisma/client";

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

  const session = await getServerSession(AuthOptions);
  const userId = (session?.user as User).id;
  const body = await request.json();
  const validation = transactionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(validation.error.format(), { status: 400 });
  }

  try {
    // Fetch the existing transaction
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: params.id },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Determine if any relevant fields have changed
    const hasAmountChanged = existingTransaction.amount !== body.amount;
    const hasAccChanged = existingTransaction.acc !== body.acc;
    const hasTypeChanged = existingTransaction.type !== body.type;
    const hasIsExchangeChanged =
      existingTransaction.isExchange !== body.isExchange;
    const hasExchangeTypeChanged =
      existingTransaction.exchangeType !== body.exchangeType;
    const hasAccountIdChanged =
      existingTransaction.accountId !== body.accountId;

    const balanceAffected =
      hasAmountChanged ||
      hasAccChanged ||
      hasTypeChanged ||
      hasIsExchangeChanged ||
      hasExchangeTypeChanged ||
      hasAccountIdChanged;

    // Initialize a map to keep track of account balances
    const balancesByAccountId: Record<
      string,
      { balance: number; cashBalance: number }
    > = {};

    if (balanceAffected) {
      // Revert existing transaction's effect on the old account
      const oldAccountId = existingTransaction.accountId;
      const oldAccount = oldAccountId
        ? (balancesByAccountId[oldAccountId] ||
          (await prisma.accounts.findUnique({
            where: { id: oldAccountId },
          })))
        : null;

      if (!oldAccount) {
        return NextResponse.json(
          { error: "Original Account not found" },
          { status: 404 }
        );
      }

      let { balance: oldBalance, cashBalance: oldCashBalance } =
        (oldAccountId && balancesByAccountId[oldAccountId]) || {
          balance: oldAccount.balance,
          cashBalance: oldAccount.cashBalance,
        };

      ({ newBalance: oldBalance, newCashBalance: oldCashBalance } =
        revertTransactionEffect(
          existingTransaction,
          oldBalance,
          oldCashBalance
        ));

      if (oldAccountId) {
        balancesByAccountId[oldAccountId] = {
          balance: oldBalance,
          cashBalance: oldCashBalance,
        };
      }

      // Apply new transaction's effect on the new account
      const newAccountId = body.accountId;
      const newAccount =
        hasAccountIdChanged && newAccountId !== oldAccountId
          ? await prisma.accounts.findUnique({ where: { id: newAccountId } })
          : oldAccount;

      if (!newAccount) {
        return NextResponse.json(
          { error: "New Account not found" },
          { status: 404 }
        );
      }

      let { balance: newBalance, cashBalance: newCashBalance } =
        balancesByAccountId[newAccountId] || {
          balance:
            hasAccountIdChanged && newAccountId !== oldAccountId
              ? newAccount.balance
              : oldBalance,
          cashBalance:
            hasAccountIdChanged && newAccountId !== oldAccountId
              ? newAccount.cashBalance
              : oldCashBalance,
        };

      ({ newBalance, newCashBalance } = applyTransactionEffect(
        body,
        newBalance,
        newCashBalance
      ));

      balancesByAccountId[newAccountId] = {
        balance: newBalance,
        cashBalance: newCashBalance,
      };

      // Update all affected accounts
      for (const [accountId, { balance, cashBalance }] of Object.entries(
        balancesByAccountId
      )) {
        await prisma.accounts.update({
          where: { id: accountId },
          data: {
            balance,
            cashBalance,
          },
        });
      }
    }

    // Update the transaction with the new values
    const updatedTransaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        userId: userId,
        accountId: body.accountId,
        categoryId: body.categoryId,
        details: body.details,
        tranDate: body.tranDate,
        type: body.type || null,
        amount: body.amount,
        amountType: body.amountType,
        acc: body.acc || null,
        ref: body.ref,
        isExchange: body.isExchange || false,
        exchangeType: body.exchangeType || null,
        senderName: body.senderName || null,
        senderPhone: body.senderPhone || null,
        receiverName: body.receiverName || null,
        receiverPhone: body.receiverPhone || null,
      },
    });

    return NextResponse.json(updatedTransaction, { status: 200 });
  } catch (error: any) {
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { message: "Error updating transaction", error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to revert the existing transaction's effect
function revertTransactionEffect(
  transaction: any,
  balance: number,
  cashBalance: number
) {
  let newBalance = balance;
  let newCashBalance = cashBalance;

  if (transaction.isExchange) {
    if (transaction.exchangeType === "withdrawal") {
      // Revert withdrawal (add back to cash and subtract from digital)
      newCashBalance += transaction.amount;
      newBalance -= transaction.amount;
    } else if (transaction.exchangeType === "deposit") {
      // Revert deposit (subtract from cash and add to digital)
      newCashBalance -= transaction.amount;
      newBalance += transaction.amount;
    }
  } else {
    if (transaction.type === "cash") {
      // Revert cash transaction
      if (transaction.acc === "Cr") {
        newCashBalance -= transaction.amount;
      } else if (transaction.acc === "Dr") {
        newCashBalance += transaction.amount;
      }
    } else {
      // Revert digital transaction
      if (transaction.acc === "Cr") {
        newBalance -= transaction.amount;
      } else if (transaction.acc === "Dr") {
        newBalance += transaction.amount;
      }
    }
  }

  return { newBalance, newCashBalance };
}

// Helper function to apply the new transaction's effect
function applyTransactionEffect(
  transactionData: any,
  balance: number,
  cashBalance: number
) {
  let newBalance = balance;
  let newCashBalance = cashBalance;

  if (transactionData.isExchange) {
    if (transactionData.exchangeType === "withdrawal") {
      // Withdrawal: Decrease cash balance and increase digital balance
      newCashBalance -= transactionData.amount;
      newBalance += transactionData.amount;
    } else if (transactionData.exchangeType === "deposit") {
      // Deposit: Increase cash balance and decrease digital balance
      newCashBalance += transactionData.amount;
      newBalance -= transactionData.amount;
    }
  } else {
    if (transactionData.type === "cash") {
      // Adjust cashBalance if the transaction type is cash
      if (transactionData.acc === "Cr") {
        newCashBalance += transactionData.amount;
      } else if (transactionData.acc === "Dr") {
        newCashBalance -= transactionData.amount;
      }
    } else {
      // Adjust digital balance if the transaction type is not cash
      if (transactionData.acc === "Cr") {
        newBalance += transactionData.amount;
      } else if (transactionData.acc === "Dr") {
        newBalance -= transactionData.amount;
      }
    }
  }

  return { newBalance, newCashBalance };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch the transaction to adjust the balance or cash balance
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (!transaction.accountId) {
      return NextResponse.json(
        { error: "Transaction has no associated account" },
        { status: 400 }
      );
    }

    // Fetch the account details
    const account = await prisma.accounts.findUnique({
      where: { id: transaction.accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    let newBalance = account.balance;
    let newCashBalance = account.cashBalance;

    // Revert transaction's effect on balances
    if (transaction.isExchange) {
      if (transaction.exchangeType === "withdrawal") {
        // Revert withdrawal: Increase cash and decrease digital
        newCashBalance += transaction.amount;
        newBalance -= transaction.amount;
      } else if (transaction.exchangeType === "deposit") {
        // Revert deposit: Decrease cash and increase digital
        newCashBalance -= transaction.amount;
        newBalance += transaction.amount;
      }
    } else {
      if (transaction.type === "cash") {
        // Revert cash transaction
        if (transaction.acc === "Cr") {
          newCashBalance -= transaction.amount;
        } else if (transaction.acc === "Dr") {
          newCashBalance += transaction.amount;
        }
      } else {
        // Revert digital transaction
        if (transaction.acc === "Cr") {
          newBalance -= transaction.amount;
        } else if (transaction.acc === "Dr") {
          newBalance += transaction.amount;
        }
      }
    }

    // Update the account balance or cash balance
    await prisma.accounts.update({
      where: { id: transaction.accountId },
      data: {
        balance: newBalance,
        cashBalance: newCashBalance,
      },
    });

    // Delete the transaction
    await prisma.transaction.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      { message: "Transaction deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { message: "Error deleting transaction", error: error.message },
      { status: 500 }
    );
  }
}
