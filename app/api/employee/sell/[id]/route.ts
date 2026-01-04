import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import AuthOptions from "../../../auth/[...nextauth]/AuthOptions";
import prisma from "@/prisma/client";
import { User } from "@prisma/client";

const MAX_RETRIES = 3; // Retry up to 3 times in case of transient errors

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

  if (!session) {
    return NextResponse.json(
      { error: "You must be logged in to perform this action" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const userId = (session.user as User).id;

  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { items, accountId, type, cashAmount, digitalAmount } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Items are required" }, { status: 400 });
  }

  if (!accountId) {
    return NextResponse.json(
      { error: "Account ID is required" },
      { status: 400 }
    );
  }

  if (!type) {
    return NextResponse.json({ error: "Type is required" }, { status: 400 });
  }

  // Ensure cashAmount and digitalAmount are numbers if type is 'both'
  let cashAmt = 0;
  let digitalAmt = 0;

  if (type === "both") {
    if (cashAmount === undefined || digitalAmount === undefined) {
      return NextResponse.json(
        {
          error:
            "Both cash and digital amounts must be provided for 'both' type.",
        },
        { status: 400 }
      );
    }

    // Convert to numbers and validate
    cashAmt = Number(cashAmount);
    digitalAmt = Number(digitalAmount);

    if (isNaN(cashAmt) || isNaN(digitalAmt)) {
      return NextResponse.json(
        { error: "Cash and digital amounts must be valid numbers." },
        { status: 400 }
      );
    }
  }

  let attempt = 0;
  let success = false;
  let updatedSell;

  // Adjust balances based on the change in type and amounts
  const adjustBalances = (
    oldType: "cash" | "digital" | "both",
    newType: "cash" | "digital" | "both",
    oldCashAmount: number,
    oldDigitalAmount: number,
    newCashAmount: number,
    newDigitalAmount: number,
    account: any
  ) => {
    // Reverse old amounts first
    if (oldType === "cash") {
      account.cashBalance -= oldCashAmount;
    } else if (oldType === "digital") {
      account.balance -= oldDigitalAmount;
    } else if (oldType === "both") {
      account.cashBalance -= oldCashAmount;
      account.balance -= oldDigitalAmount;
    }

    // Apply new amounts
    if (newType === "cash") {
      account.cashBalance += newCashAmount;
    } else if (newType === "digital") {
      account.balance += newDigitalAmount;
    } else if (newType === "both") {
      account.cashBalance += newCashAmount;
      account.balance += newDigitalAmount;
    }
  };

  while (attempt < MAX_RETRIES && !success) {
    try {
      updatedSell = await prisma.$transaction(
        async (transactionPrisma) => {
          const existingSell = await transactionPrisma.sell.findUnique({
            where: { id: params.id },
            include: { items: true },
          });

          if (!existingSell) {
            throw new Error(`Sale with ID ${params.id} not found`);
          }

          const oldAccountId = existingSell.accountId;
          const oldType = existingSell.type;
          const oldCashAmount = existingSell.cashAmount || 0;
          const oldDigitalAmount = existingSell.digitalAmount || 0;

          // Reverse stock quantities for existing items
          for (const existingItem of existingSell.items) {
            if (!existingItem.skuId) continue;
            await transactionPrisma.sKU.update({
              where: { id: existingItem.skuId },
              data: {
                stockQuantity: {
                  increment: existingItem.quantity, // Restock old items
                },
              },
            });
          }

          // Delete the old sell items
          await transactionPrisma.sellItem.deleteMany({
            where: { sellId: params.id },
          });

          // Process each new item in the updated sale
          for (const item of items) {
            const sku = await transactionPrisma.sKU.findUnique({
              where: { id: item.skuId },
            });

            if (!sku || sku.stockQuantity < item.quantity) {
              throw new Error(
                `Not enough stock for SKU ${sku?.sku || item.skuId}.`
              );
            }

            // Decrease the SKU stock quantity
            await transactionPrisma.sKU.update({
              where: { id: item.skuId },
              data: {
                stockQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          }

          // Calculate new total amount
          const newTotal = items.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0
          );

          // Update the sale with new items and recalculate the total
          const updatedSell = await transactionPrisma.sell.update({
            where: { id: params.id },
            data: {
              accountId: accountId, // Update the accountId
              total: newTotal,
              discount: 0,
              type: type,
              cashAmount: type === "both" ? cashAmt : undefined,
              digitalAmount: type === "both" ? digitalAmt : undefined,
              status: body.status || "pending", // Default to 'pending' if status is missing
              items: {
                create: items.map((item) => ({
                  productId: item.productId,
                  price: item.price,
                  quantity: item.quantity,
                  skuId: item.skuId,
                })),
              },
            },
            include: { items: true }, // Include associated items in the response
          });

          // Fetch old account
          const oldAccount = oldAccountId
            ? await transactionPrisma.accounts.findUnique({
                where: { id: oldAccountId },
              })
            : null;

          const newAccount =
            accountId !== oldAccountId
              ? await transactionPrisma.accounts.findUnique({
                  where: { id: accountId },
                })
              : oldAccount;

          if (!newAccount) {
            throw new Error(`New account with ID ${accountId} not found`);
          }

          // Adjust balances based on type change or amount change
          if (oldType !== type || oldCashAmount !== cashAmt || oldDigitalAmount !== digitalAmt) {
            adjustBalances(
              oldType,
              type,
              oldCashAmount,
              oldDigitalAmount,
              cashAmt,
              digitalAmt,
              newAccount
            );
          }

          // Update the account balances in the database
          if (oldAccount && oldAccountId) {
            await transactionPrisma.accounts.update({
              where: { id: oldAccountId },
              data: {
                balance: oldAccount.balance,
                cashBalance: oldAccount.cashBalance,
              },
            });
          }

          if (accountId !== oldAccountId) {
            await transactionPrisma.accounts.update({
              where: { id: accountId },
              data: {
                balance: newAccount.balance,
                cashBalance: newAccount.cashBalance,
              },
            });
          }

          return updatedSell;
        },
        {
          maxWait: 15000,
          timeout: 30000,
        }
      );

      success = true;
    } catch (error: any) {
      attempt++;
      console.error("Transaction failed, retrying...", error);
      if (attempt >= MAX_RETRIES) {
        return NextResponse.json(
          {
            message: "Transaction failed after multiple retries",
            error: error.message,
          },
          { status: 400 }
        );
      }
    }
  }

  return NextResponse.json(updatedSell, { status: 200 });
}



// DELETE Handler - Delete a sale
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sellId = params.id;
  if (!sellId) {
    return NextResponse.json({ error: "Sell ID is required" }, { status: 400 });
  }

  let attempt = 0;
  let success = false;

  while (attempt < MAX_RETRIES && !success) {
    try {
      // Start transaction with options
      await prisma.$transaction(
        async (transactionPrisma) => {
          // Fetch existing sell items inside the transaction
          const existingSell = await transactionPrisma.sell.findUnique({
            where: { id: sellId },
            include: { items: true },
          });

          if (!existingSell) {
            throw new Error("Sell not found");
          }

          // Adjust account balances
          const accountId = existingSell.accountId;
          const type = existingSell.type;
          const totalAmount = existingSell.total;
          const cashAmount = existingSell.cashAmount || 0;
          const digitalAmount = existingSell.digitalAmount || 0;

          if (!accountId) {
            throw new Error("Sell has no associated account");
          }

          const account = await transactionPrisma.accounts.findUnique({
            where: { id: accountId },
          });

          if (!account) {
            throw new Error(`Account with ID ${accountId} not found`);
          }

          // Adjust balances based on type
          let newBalance = account.balance;
          let newCashBalance = account.cashBalance;

          if (type === "cash") {
            // If the sale was cash-only, reduce cash balance
            newCashBalance -= totalAmount;
          } else if (type === "digital") {
            // If the sale was digital-only, reduce digital balance
            newBalance -= totalAmount;
          } else if (type === "both") {
            // If the sale was both, reduce both cash and digital amounts accordingly
            newCashBalance -= cashAmount;
            newBalance -= digitalAmount;
          }

          // Ensure balances do not go negative (if that's a requirement)
          if (newCashBalance < 0) newCashBalance = 0;
          if (newBalance < 0) newBalance = 0;

          // Update the account with the adjusted balances
          await transactionPrisma.accounts.update({
            where: { id: accountId },
            data: {
              balance: newBalance,
              cashBalance: newCashBalance,
            },
          });

          // Update the stock quantity for each item
          for (const item of existingSell.items) {
            if (!item.skuId) continue;
            const sku = await transactionPrisma.sKU.findUnique({
              where: { id: item.skuId },
              include: {
                variant: {
                  select: {
                    productId: true,
                  },
                },
              },
            });

            if (!sku) {
              throw new Error(`SKU with ID ${item.skuId} not found`);
            }

            // Increment the SKU stock quantity
            await transactionPrisma.sKU.update({
              where: { id: sku.id },
              data: {
                stockQuantity: {
                  increment: item.quantity,
                },
              },
            });

            const productId = sku.variant.productId;

            // Recalculate the total stock quantity for the product
            const updatedSkus = await transactionPrisma.sKU.findMany({
              where: {
                variant: { productId: productId },
              },
              select: { stockQuantity: true },
            });

            const totalStockQuantity = updatedSkus.reduce(
              (total, sku) => total + sku.stockQuantity,
              0
            );

            // Update the product's stock quantity
            await transactionPrisma.product.update({
              where: { id: productId },
              data: { stockQuantity: totalStockQuantity },
            });
          }

          // Delete the associated sell items
          await transactionPrisma.sellItem.deleteMany({
            where: { sellId: sellId },
          });

          // Delete the sell and its associated items
          await transactionPrisma.sell.delete({
            where: { id: sellId },
          });
        },
        {
          maxWait: 15000, // Increase wait time to 15 seconds (default is 2000 ms)
          timeout: 30000, // Increase transaction timeout to 30 seconds (default is 5000 ms)
        }
      );

      success = true; // Transaction was successful
    } catch (error: any) {
      attempt++;
      console.error("Transaction failed, retrying...", error);
      if (attempt >= MAX_RETRIES) {
        return NextResponse.json(
          {
            message: "Transaction failed after multiple retries",
            error: error.message,
          },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json(
    { message: "Sell deleted successfully" },
    { status: 200 }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sellId = params.id;
  if (!sellId) {
    return NextResponse.json({ error: "Sell ID is required" }, { status: 400 });
  }

  try {
    const sell = await prisma.sell.findUnique({
      where: { id: sellId },
      include: {
        items: {
          select: {
            sku: {
              select: {
                size: true,
                variant: {
                  select: {
                    color: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!sell) {
      return NextResponse.json({ error: "Sell not found" }, { status: 404 });
    }

    return NextResponse.json(sell, { status: 200 });
  } catch (error) {
    console.error("Error retrieving sell:", error);
    return NextResponse.json(
      { message: "Error retrieving sell" },
      { status: 500 }
    );
  }
}
