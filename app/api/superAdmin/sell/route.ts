import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import AuthOptions from "../../auth/[...nextauth]/AuthOptions";
import prisma from "@/prisma/client";
import { User } from "@prisma/client";

const MAX_RETRIES = 3; // Retry up to 3 times in case of transient errors

async function generateOrderId() {
  const lastSell = await prisma.sell.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { orderId: true },
  });

  const lastOrderNumber = lastSell?.orderId ? parseInt(lastSell.orderId.split('-')[1]) : 0;
  return `ORD-${String(lastOrderNumber + 1).padStart(4, '0')}`;
}


export async function POST(request: NextRequest) {
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

  const { items, accountId, type, cashAmount, digitalAmount, shopId } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Items are required" }, { status: 400 });
  }

  if (!accountId) {
    return NextResponse.json(
      { error: "Account ID is required" },
      { status: 400 }
    );
  }

  if (!shopId) {
    return NextResponse.json(
      { error: "Shop ID is required" },
      { status: 400 }
    );
  }

  // Verify that the account exists
  const account = await prisma.accounts.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    return NextResponse.json(
      { error: "Account not found" },
      { status: 404 }
    );
  }

  let attempt = 0;
  let success = false;
  let newSell;

  while (attempt < MAX_RETRIES && !success) {
    try {
      // Start the transaction
      newSell = await prisma.$transaction(
        async (transactionPrisma) => {
          for (const item of items) {
            const sku = await transactionPrisma.sKU.findUnique({
              where: { id: item.skuId },
            });

            if (!sku) {
              throw new Error(`SKU with ID ${item.skuId} not found`);
            }

            if (sku.stockQuantity === 0) {
              throw new Error(`SKU ${sku.sku} is out of stock.`);
            }

            if (sku.stockQuantity < item.quantity) {
              throw new Error(
                `Not enough stock for SKU ${sku.sku}. Available: ${sku.stockQuantity}, Requested: ${item.quantity}.`
              );
            }

            if (item.quantity === 0) {
              throw new Error(`Quantity must be greater than 0.`);
            }

            await transactionPrisma.sKU.update({
              where: { id: item.skuId },
              data: {
                stockQuantity: {
                  decrement: item.quantity,
                },
              },
            });

            const updatedSkus = await transactionPrisma.sKU.findMany({
              where: { variant: { productId: item.productId } },
              select: { stockQuantity: true },
            });

            const totalStockQuantity = updatedSkus.reduce(
              (total, sku) => total + sku.stockQuantity,
              0
            );

            await transactionPrisma.product.update({
              where: { id: item.productId },
              data: { stockQuantity: totalStockQuantity },
            });

            // Reduce shop inventory
            const shopInventory = await transactionPrisma.shopInventory.findFirst({
              where: {
                shopId: shopId,
                productId: item.productId,
                skuId: item.skuId,
              },
            });

            if (!shopInventory) {
              throw new Error(
                `Product ${item.productId} with SKU ${item.skuId} not found in shop inventory`
              );
            }

            if (shopInventory.quantity < item.quantity) {
              throw new Error(
                `Not enough shop inventory. Available: ${shopInventory.quantity}, Requested: ${item.quantity}`
              );
            }

            await transactionPrisma.shopInventory.update({
              where: { id: shopInventory.id },
              data: {
                quantity: {
                  decrement: item.quantity,
                },
              },
            });
          }

          // Calculate total amount
          const totalAmount = items.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0
          );

          // Validate the cash and digital amounts if the type is 'both'
          if (type === "both") {
            const cashAmt = parseFloat(cashAmount);
            const digitalAmt = parseFloat(digitalAmount);
          
            if (isNaN(cashAmt) || isNaN(digitalAmt)) {
              throw new Error("Cash amount and digital amount must be valid numbers.");
            }
          
            if (cashAmt <= 0 && digitalAmt <= 0) {
              throw new Error(
                "At least one of cashAmount or digitalAmount must be greater than zero for 'both' type transactions."
              );
            }
          }

          // Create the sell record
          const createdSell = await transactionPrisma.sell.create({
            data: {
              userId: userId,
              orderId: await generateOrderId(), // Auto-generate orderId here
              total: totalAmount,
              cashAmount: type === "both" ? cashAmount : undefined,
              digitalAmount: type === "both" ? digitalAmount : undefined,
              discount: 0,
              type: type,
              status: body.status || "pending",
              accountId: accountId,
              shopId: shopId, // Link the sale to the shop
              items: {
                create: items.map((item) => ({
                  productId: item.productId,
                  price: item.price,
                  quantity: item.quantity,
                  skuId: item.skuId,
                })),
              },
            },
            include: { items: true },
          });

          // Adjust the account balance based on the type of payment
          let newBalance = account.balance;
          let newCashBalance = account.cashBalance;

          if (type === "cash") {
            newCashBalance += totalAmount;
          } else if (type === "digital") {
            newBalance += totalAmount;
          } else if (type === "both") {
            newCashBalance += cashAmount;
            newBalance += digitalAmount;
          }

          await transactionPrisma.accounts.update({
            where: { id: accountId },
            data: {
              balance: newBalance,
              cashBalance: newCashBalance,
            },
          });

          return createdSell;
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

  return NextResponse.json(newSell, { status: 200 });
}




// Handle GET request to retrieve sell records
export async function GET(request: NextRequest) {
  try {
    const sells = await prisma.sell.findMany({
      orderBy: { createdAt: "desc" }, // Order by creation date in descending order
      select: {
        id: true,
        orderId: true,
        createdAt: true,
        total: true,
        type: true,
        cashAmount: true,
        digitalAmount: true,
        status: true,
        discount: true,
        userId: true,
        accountId: true,
        shopId: true,
        customerId: true,
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            productId: true,
            skuId: true,
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
            sku: {
              select: {
                size: true,
                sku: true,
                stockQuantity: true,
                variant: true,
                createdAt: true,
              },
            },
          },
        },
        account: {
          select: {
            id: true,
            account: true,
            balance: true,
            cashBalance: true,
            default: true,
          },
        },
        customer: {
          select: {
            id: true,
            phone: true,
            customerType: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(sells, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    });
  } catch (error: any) {
    console.error("Error retrieving sells:", error);
    return NextResponse.json(
      { message: "Error retrieving sells", error: error.message },
      { status: 500 }
    );
  }
}
