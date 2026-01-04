import prisma from "@/prisma/client";
import { getServerSession } from "next-auth";
import AuthOptions from "@/app/api/auth/[...nextauth]/AuthOptions";
import { NextRequest, NextResponse } from "next/server";

// Add inventory to a store
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(AuthOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { skuId, quantity, items } = body;
    
    // Support both single item (skuId/quantity) and multiple items (items array)
    const itemsToProcess = items || [{ skuId, quantity }];
    
    console.log("POST /inventory - Store ID:", params.id, "Items:", itemsToProcess);

    // Validate all items
    for (const item of itemsToProcess) {
      if (!item.skuId || item.quantity === undefined || item.quantity < 0) {
        return NextResponse.json(
          { error: "SKU ID and valid quantity are required for all items" },
          { status: 400 }
        );
      }
    }

    // Process all items
    const results = [];
    for (const item of itemsToProcess) {
      // Get SKU to find productId and variantId
      const sku = await prisma.sKU.findUnique({
        where: { id: item.skuId },
        include: {
          variant: {
            select: {
              id: true,
              productId: true
            }
          }
        }
      });

      if (!sku) {
        return NextResponse.json(
          { error: `SKU ${item.skuId} not found` },
          { status: 404 }
        );
      }

      const productId = sku.variant.productId;
      const variantId = sku.variant.id;

      // Check if inventory already exists (using variantId, not skuId)
      const existingInventory = await prisma.storeInventory.findUnique({
        where: {
          storeId_variantId: {
            storeId: params.id,
            variantId: variantId,
          },
        },
      });

      let inventory;
      if (existingInventory) {
        // Update existing inventory by adding quantity
        inventory = await prisma.storeInventory.update({
          where: {
            storeId_variantId: {
              storeId: params.id,
              variantId: variantId,
            },
          },
          data: {
            quantity: existingInventory.quantity + item.quantity,
          },
          include: {
            variant: {
              include: {
                skus: true,
                product: true,
              },
            },
          },
        });
      } else {
        // Create new inventory
        inventory = await prisma.storeInventory.create({
          data: {
            store: {
              connect: { id: params.id }
            },
            product: {
              connect: { id: productId }
            },
            variant: {
              connect: { id: variantId }
            },
            quantity: item.quantity,
          },
          include: {
            variant: {
              include: {
                skus: true,
                product: true,
              },
            },
          },
        });
      }
      results.push(inventory);
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error adding store inventory:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add inventory" },
      { status: 500 }
    );
  }
}

// Get store inventory
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(AuthOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inventory = await prisma.storeInventory.findMany({
      where: { storeId: params.id },
      include: {
        variant: {
          include: {
            skus: true,
            product: true,
          },
        },
      },
    });

    return NextResponse.json(inventory);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
