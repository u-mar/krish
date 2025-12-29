import { NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { getServerSession } from "next-auth";
import { AuthOptions } from "@/app/api/auth/[...nextauth]/AuthOptions";

// POST transfer product between locations
export async function POST(request: Request) {
  const session = await getServerSession(AuthOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      fromType,
      fromStoreId,
      fromShopId,
      toType,
      toStoreId,
      toShopId,
      productId,
      skuId,
      quantity,
      notes,
    } = body;

    // Validate input
    if (!fromType || !toType || !productId || !skuId || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than 0" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check source inventory
    let sourceInventory;
    if (fromType === "store" && fromStoreId) {
      sourceInventory = await prisma.storeInventory.findUnique({
        where: {
          storeId_skuId: {
            storeId: fromStoreId,
            skuId: skuId,
          },
        },
      });
    } else if (fromType === "shop" && fromShopId) {
      sourceInventory = await prisma.shopInventory.findUnique({
        where: {
          shopId_skuId: {
            shopId: fromShopId,
            skuId: skuId,
          },
        },
      });
    }

    if (!sourceInventory || sourceInventory.quantity < quantity) {
      return NextResponse.json(
        { error: "Insufficient inventory at source location" },
        { status: 400 }
      );
    }

    // Perform transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Decrease source inventory
      if (fromType === "store" && fromStoreId) {
        await tx.storeInventory.update({
          where: {
            storeId_skuId: {
              storeId: fromStoreId,
              skuId: skuId,
            },
          },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        });
      } else if (fromType === "shop" && fromShopId) {
        await tx.shopInventory.update({
          where: {
            shopId_skuId: {
              shopId: fromShopId,
              skuId: skuId,
            },
          },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        });
      }

      // Increase destination inventory or create if doesn't exist
      if (toType === "store" && toStoreId) {
        await tx.storeInventory.upsert({
          where: {
            storeId_skuId: {
              storeId: toStoreId,
              skuId: skuId,
            },
          },
          update: {
            quantity: {
              increment: quantity,
            },
          },
          create: {
            storeId: toStoreId,
            productId: productId,
            skuId: skuId,
            quantity: quantity,
          },
        });
      } else if (toType === "shop" && toShopId) {
        await tx.shopInventory.upsert({
          where: {
            shopId_skuId: {
              shopId: toShopId,
              skuId: skuId,
            },
          },
          update: {
            quantity: {
              increment: quantity,
            },
          },
          create: {
            shopId: toShopId,
            productId: productId,
            skuId: skuId,
            quantity: quantity,
          },
        });
      }

      // Create transfer record
      const transfer = await tx.productTransfer.create({
        data: {
          fromType: fromType,
          fromStoreId: fromStoreId || null,
          fromShopId: fromShopId || null,
          toType: toType,
          toStoreId: toStoreId || null,
          toShopId: toShopId || null,
          productId: productId,
          skuId: skuId,
          quantity: quantity,
          notes: notes || null,
          userId: user.id,
        },
        include: {
          fromStore: true,
          fromShop: true,
          toStore: true,
          toShop: true,
          sku: {
            include: {
              variant: true,
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

      return transfer;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error transferring product:", error);
    return NextResponse.json(
      { error: "Failed to transfer product" },
      { status: 500 }
    );
  }
}

// GET all transfers
export async function GET() {
  const session = await getServerSession(AuthOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const transfers = await prisma.productTransfer.findMany({
      include: {
        fromStore: true,
        fromShop: true,
        toStore: true,
        toShop: true,
        sku: {
          include: {
            variant: {
              include: {
                product: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(transfers, { status: 200 });
  } catch (error) {
    console.error("Error fetching transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfers" },
      { status: 500 }
    );
  }
}
