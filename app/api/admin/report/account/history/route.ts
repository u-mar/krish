import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (!accountId) {
    return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
  }

  if (!fromDate || !toDate) {
    return NextResponse.json({ error: "From date and to date are required" }, { status: 400 });
  }

  const fromDateTime = new Date(fromDate);
  const toDateTime = new Date(new Date(toDate).setHours(23, 59, 59, 999));

  try {
    // Get the account
    const account = await prisma.accounts.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Get all transactions for this account in the date range
    const transactions = await prisma.transaction.findMany({
      where: {
        accountId,
        tranDate: {
          gte: fromDateTime,
          lte: toDateTime
        }
      },
      include: {
        user: {
          select: {
            name: true,
          }
        },
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        tranDate: 'asc'
      }
    });

    // Get all sells for this account in the date range
    const sells = await prisma.sell.findMany({
      where: {
        accountId,
        createdAt: {
          gte: fromDateTime,
          lte: toDateTime
        }
      },
      include: {
        user: {
          select: {
            name: true
          }
        },
        customer: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Get account swaps involving this account in the date range
    const accountSwaps = await prisma.accountSwap.findMany({
      where: {
        OR: [
          { fromAccountId: accountId },
          { toAccountId: accountId }
        ],
        createdAt: {
          gte: fromDateTime,
          lte: toDateTime
        }
      },
      include: {
        fromAccount: true,
        toAccount: true,
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Get bank transactions for this account in the date range
    const bankTransactions = await prisma.bankTransaction.findMany({
      where: {
        accountId,
        createdAt: {
          gte: fromDateTime,
          lte: toDateTime
        }
      },
      include: {
        bankAccount: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Calculate balance at the start date (before any transactions in the range)
    // We need to get all transactions, sells, and swaps BEFORE the start date
    const previousTransactions = await prisma.transaction.findMany({
      where: {
        accountId,
        tranDate: {
          lt: fromDateTime
        }
      },
      select: {
        amount: true,
        amountType: true
      }
    });

    const previousSells = await prisma.sell.findMany({
      where: {
        accountId,
        createdAt: {
          lt: fromDateTime
        }
      },
      select: {
        total: true
      }
    });

    const previousSwapsFrom = await prisma.accountSwap.findMany({
      where: {
        fromAccountId: accountId,
        createdAt: {
          lt: fromDateTime
        }
      },
      select: {
        fromAmount: true
      }
    });

    const previousSwapsTo = await prisma.accountSwap.findMany({
      where: {
        toAccountId: accountId,
        createdAt: {
          lt: fromDateTime
        }
      },
      select: {
        toAmount: true
      }
    });

    // Calculate the starting balance
    let startingBalance = 0;
    
    // Add initial balance from system
    startingBalance = account.balance;
    
    // Subtract all outgoing transactions before start date
    const outgoingSum = previousTransactions
      .filter(t => t.amountType === 'out')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Add all incoming transactions before start date
    const incomingSum = previousTransactions
      .filter(t => t.amountType === 'in')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Add all sales before start date
    const previousSalesSum = previousSells.reduce((sum, s) => sum + s.total, 0);
    
    // Subtract all outgoing swaps before start date
    const outgoingSwapsSum = previousSwapsFrom.reduce((sum, s) => sum + s.fromAmount, 0);
    
    // Add all incoming swaps before start date
    const incomingSwapsSum = previousSwapsTo.reduce((sum, s) => sum + s.toAmount, 0);
    
    // Adjust the starting balance
    startingBalance = startingBalance - outgoingSum + incomingSum + previousSalesSum - outgoingSwapsSum + incomingSwapsSum;

    // Create a combined timeline of all events
    let timeline: any[] = [
      // Start with the initial balance entry
      {
        date: fromDateTime,
        type: 'initial',
        description: 'Starting Balance',
        amount: startingBalance,
        balance: startingBalance,
        details: null
      }
    ];

    let runningBalance = startingBalance;

    // Add transactions to timeline
    transactions.forEach(transaction => {
      const isIncoming = transaction.amountType === 'in';
      if (isIncoming) {
        runningBalance += transaction.amount;
      } else {
        runningBalance -= transaction.amount;
      }

      timeline.push({
        date: transaction.tranDate,
        type: isIncoming ? 'transaction-in' : 'transaction-out',
        description: `${transaction.details} (${transaction.category.name})`,
        amount: transaction.amount,
        balance: runningBalance,
        details: {
          user: transaction.user?.name,
          reference: transaction.ref,
          type: transaction.type,
          category: transaction.category.name
        }
      });
    });

    // Add sells to timeline
    sells.forEach(sell => {
      runningBalance += sell.total;
      timeline.push({
        date: sell.createdAt,
        type: 'sale',
        description: `Sale ${sell.orderId || ''}`,
        amount: sell.total,
        balance: runningBalance,
        details: {
          user: sell.user?.name,
          orderId: sell.orderId,
          customer: sell.customer?.phone || 'Walk-in customer',
          paymentType: sell.type
        }
      });
    });

    // Add swaps to timeline
    accountSwaps.forEach(swap => {
      if (swap.fromAccountId === accountId) {
        // Money going out of this account
        runningBalance -= swap.fromAmount;
        timeline.push({
          date: swap.createdAt,
          type: 'swap-out',
          description: `Swap to ${swap.toAccount.account}`,
          amount: swap.fromAmount,
          balance: runningBalance,
          details: {
            user: swap.user?.name,
            fromAccount: swap.fromAccount.account,
            toAccount: swap.toAccount.account,
            exchangeRate: swap.exchangeRate
          }
        });
      } else {
        // Money coming into this account
        runningBalance += swap.toAmount;
        timeline.push({
          date: swap.createdAt,
          type: 'swap-in',
          description: `Swap from ${swap.fromAccount.account}`,
          amount: swap.toAmount,
          balance: runningBalance,
          details: {
            user: swap.user?.name,
            fromAccount: swap.fromAccount.account,
            toAccount: swap.toAccount.account,
            exchangeRate: swap.exchangeRate
          }
        });
      }
    });
    
    // Add bank transactions to timeline
    bankTransactions.forEach(bankTran => {
      // For bank transactions, we'll treat credits (cr) as money coming in
      // and debits (dr) as money going out
      const isCredit = bankTran.acc === 'cr';
      
      if (isCredit) {
        runningBalance += bankTran.amount;
        timeline.push({
          date: bankTran.createdAt,
          type: 'bank-in',
          description: `Bank Credit: ${bankTran.details || 'Bank Transaction'} (${bankTran.bankAccount.name})`,
          amount: bankTran.amount,
          balance: runningBalance,
          details: {
            bankName: bankTran.bankAccount.name,
            accountNumber: bankTran.bankAccount.accountNumber
          }
        });
      } else {
        runningBalance -= bankTran.amount;
        timeline.push({
          date: bankTran.createdAt,
          type: 'bank-out',
          description: `Bank Debit: ${bankTran.details || 'Bank Transaction'} (${bankTran.bankAccount.name})`,
          amount: bankTran.amount,
          balance: runningBalance,
          details: {
            bankName: bankTran.bankAccount.name,
            accountNumber: bankTran.bankAccount.accountNumber
          }
        });
      }
    });

    // Sort the timeline by date
    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate summary data
    const finalBalance = timeline.length > 0 ? timeline[timeline.length - 1].balance : startingBalance;
    const netChange = finalBalance - startingBalance;
    
    // Calculate total money in (transactions in + sales + swaps in)
    const totalTransactionsIn = transactions
      .filter(t => t.amountType === 'in')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalSalesAmount = sells.reduce((sum, s) => sum + s.total, 0);
    
    const totalSwapIn = accountSwaps
      .filter(s => s.toAccountId === accountId)
      .reduce((sum, s) => sum + s.toAmount, 0);
      
    const totalBankIn = bankTransactions
      .filter(bt => bt.acc === 'cr')
      .reduce((sum, bt) => sum + bt.amount, 0);
      
    const totalIn = totalTransactionsIn + totalSalesAmount + totalSwapIn + totalBankIn;
    
    // Calculate total money out (transactions out + swaps out)
    const totalOut = transactions
      .filter(t => t.amountType === 'out')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalSwapOut = accountSwaps
      .filter(s => s.fromAccountId === accountId)
      .reduce((sum, s) => sum + s.fromAmount, 0);
      
    const totalBankOut = bankTransactions
      .filter(bt => bt.acc === 'dr')
      .reduce((sum, bt) => sum + bt.amount, 0);
      
    const totalOutAmount = totalOut + totalSwapOut + totalBankOut;

    return NextResponse.json({
      account: {
        id: account.id,
        name: account.account,
        currentBalance: account.balance
      },
      summary: {
        startingBalance,
        finalBalance,
        netChange,
        totalIn,
        totalOut: totalOutAmount,
        totalSwapIn,
        totalSwapOut,
        totalBankIn,
        totalBankOut,
        totalSales: totalSalesAmount,
        transactionCount: transactions.length,
        salesCount: sells.length,
        swapCount: accountSwaps.length,
        bankTransactionCount: bankTransactions.length
      },
      timeline
    });
  } catch (error) {
    console.error("Error fetching account history:", error);
    return NextResponse.json({ error: "Error fetching account history data." }, { status: 500 });
  }
}
