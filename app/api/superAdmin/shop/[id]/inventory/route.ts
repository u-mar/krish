import prisma from "@/prisma/client";
import { getServerSession } from "next-auth";
import AuthOptions from "@/app/api/auth/[...nextauth]/AuthOptions";
import { NextRequest, NextResponse } from "next/server";

// Add inventory to a shop
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

    const { variantId, quantity, items } = body;
    
    // Support both single item (variantId/quantity) and multiple items (items array)
    const itemsToProcess = items || [{ variantId, quantity }];
    
    console.log("POST /inventory - Shop ID:", params.id, "Items:", itemsToProcess);

    // Validate all items
    for (const item of itemsToProcess) {
      if (!item.variantId || item.quantity === undefined || item.quantity < 0) {
        return NextResponse.json(
          { error: "Variant ID and valid quantity are required for all items" },
          { status: 400 }
        );
      }
    }

    // Process all items
    const results = [];
    for (const item of itemsToProcess) {
      // Get variant to find productId
      const variant = await prisma.variant.findUnique({
        where: { id: item.variantId },
        select: {
          productId: true
        }
      });

      if (!variant) {
        return NextResponse.json(
          { error: `Variant ${item.variantId} not found` },
          { status: 404 }
        );
      }

      const productId = variant.productId;

      // Check if inventory already exists
      const existingInventory = await prisma.shopInventory.findUnique({
        where: {
          shopId_variantId: {
            shopId: params.id,
            variantId: item.variantId,
          },
        },
      });

      let inventory;
      if (existingInventory) {
        // Update existing inventory by adding quantity
        inventory = await prisma.shopInventory.update({
          where: {
            shopId_variantId: {
              shopId: params.id,
              variantId: item.variantId,
            },
          },
          data: {
            quantity: existingInventory.quantity + item.quantity,
          },
          include: {
            variant: {
              include: {
                product: true,
                skus: true,
              },
            },
          },
        });
      } else {
        // Create new inventory
        inventory = await prisma.shopInventory.create({
          data: {
            shop: {
              connect: { id: params.id }
            },
            product: {
              connect: { id: productId }
            },
            variant: {
              connect: { id: item.variantId }
            },
            quantity: item.quantity,
          },
          include: {
            variant: {
              include: {
                product: true,
                skus: true,
              },
            },
          },
        });
      }
      results.push(inventory);
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error adding shop inventory:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add inventory" },
      { status: 500 }
    );
  }
}

// Get shop inventory
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(AuthOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inventory = await prisma.shopInventory.findMany({
      where: { shopId: params.id },
      include: {
        sku: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
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
