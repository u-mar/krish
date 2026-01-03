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

  const { items, type, cashAmount, digitalAmount, shopId, isDebt, customerId: bankAccountId } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Items are required" }, { status: 400 });
  }

  if (!shopId) {
    return NextResponse.json(
      { error: "Shop ID is required" },
      { status: 400 }
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
          // Process items and resolve SKU IDs
          const processedItems = [];
          
          for (const item of items) {
            // Validate variantId is provided
            if (!item.variantId) {
              throw new Error(`Variant ID is required for item`);
            }

            // Get the variant to validate
            const variant = await transactionPrisma.variant.findUnique({
              where: { id: item.variantId },
              include: {
                skus: true,
              },
            });

            if (!variant) {
              throw new Error(`Variant with ID ${item.variantId} not found`);
            }

            if (item.quantity === 0) {
              throw new Error(`Quantity must be greater than 0.`);
            }

            // Use provided skuId or first SKU if available, otherwise null
            let skuId = item.skuId;
            if (!skuId && variant.skus && variant.skus.length > 0) {
              skuId = variant.skus[0].id;
            }

            // Store processed item with resolved skuId (may be null)
            processedItems.push({
              ...item,
              skuId: skuId || undefined,
            });

            // Update SKU stock if SKU exists
            if (skuId) {
              await transactionPrisma.sKU.update({
                where: { id: skuId },
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
            }

            // Reduce shop inventory
            const shopInventory = await transactionPrisma.shopInventory.findFirst({
              where: {
                shopId: shopId,
                productId: item.productId,
                variantId: item.variantId,
              },
            });

            if (!shopInventory) {
              throw new Error(
                `Product ${item.productId} with Variant ${item.variantId} not found in shop inventory`
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

          // Calculate total amount using processed items
          const totalAmount = processedItems.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0
          );

          // Determine cash and digital amounts based on type
          let finalCashAmount = 0;
          let finalDigitalAmount = 0;

          // If it's a debt order, don't process payment
          if (!isDebt) {
            if (type === "cash") {
              finalCashAmount = totalAmount;
            } else if (type === "digital") {
              finalDigitalAmount = totalAmount;
            } else if (type === "both") {
              const cashAmt = parseFloat(cashAmount) || 0;
              const digitalAmt = parseFloat(digitalAmount) || 0;
            
              if (cashAmt <= 0 && digitalAmt <= 0) {
                throw new Error(
                  "At least one of cashAmount or digitalAmount must be greater than zero for 'both' type transactions."
                );
              }
              finalCashAmount = cashAmt;
              finalDigitalAmount = digitalAmt;
            }
          }

          // Create the sell record using processed items with resolved SKU IDs
          const createdSell = await transactionPrisma.sell.create({
            data: {
              userId: userId,
              orderId: await generateOrderId(), // Auto-generate orderId here
              total: totalAmount,
              cashAmount: finalCashAmount > 0 ? finalCashAmount : undefined,
              digitalAmount: finalDigitalAmount > 0 ? finalDigitalAmount : undefined,
              discount: 0,
              type: type,
              status: body.status || "pending",
              shopId: shopId, // Link the sale to the shop
              isDebt: isDebt || false,
              debtAmount: isDebt ? totalAmount : 0,
              debtPaid: 0,
              bankAccountId: bankAccountId || undefined, // Link to bank account (customer) if provided
              items: {
                create: processedItems.map((item) => ({
                  productId: item.productId,
                  price: item.price,
                  quantity: item.quantity,
                  skuId: item.skuId,
                })),
              },
            },
            include: { items: true },
          });

          // Only update wallet if not a debt order
          if (!isDebt) {
            // Update wallet balance
            let wallet = await transactionPrisma.wallet.findFirst();
            
            if (!wallet) {
              // Create wallet if it doesn't exist
              wallet = await transactionPrisma.wallet.create({
                data: {
                  cashBalance: 0,
                  digitalBalance: 0,
                },
              });
            }

            // Update wallet with new amounts
            await transactionPrisma.wallet.update({
              where: { id: wallet.id },
              data: {
                cashBalance: { increment: finalCashAmount },
                digitalBalance: { increment: finalDigitalAmount },
              },
            });
          }

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
        isDebt: true,
        debtAmount: true,
        debtPaid: true,
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
