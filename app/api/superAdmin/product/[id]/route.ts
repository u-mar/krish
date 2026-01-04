import { NextRequest, NextResponse } from "next/server";
import { productSchema } from "@/app/validationSchema/productSchema";
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

  const validation = productSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(validation.error.format(), { status: 400 });
  }

  try {
    // Calculate total stock quantity from all SKUs
    let totalStockQuantity = 0;
    body.variants.forEach((variant: any) => {
      variant.skus.forEach((sku: any) => {
        totalStockQuantity += sku.stockQuantity;
      });
    });

    // Step 1: Update the main product details
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: body.name,
        categoryId: body.categoryId,
        price: parseFloat(body.price),
        description: body.description,
        stockQuantity: totalStockQuantity,
      },
    });

    // Step 2: Handle existing and new variants
    const existingVariants = await prisma.variant.findMany({
      where: { productId: params.id },
      include: {
        skus: true,
      },
    });

    // In the PATCH function
for (const variant of body.variants) {
  let existingVariant;

  if (variant.id) {
    existingVariant = existingVariants.find((v) => v.id === variant.id);
  }

  if (existingVariant) {
    // Update existing variant
    await prisma.variant.update({
      where: { id: existingVariant.id },
      data: {
        color: variant.color,
      },
    });

    // Handle SKUs
    const existingSkus = existingVariant.skus;

    for (const sku of variant.skus) {
      let existingSku;

      if (sku.id) {
        existingSku = existingSkus.find((s) => s.id === sku.id);
      }

      if (existingSku) {
        // Update existing SKU
        await prisma.sKU.update({
          where: { id: existingSku.id },
          data: {
            size: sku.size,
            sku: sku.sku,
            stockQuantity: sku.stockQuantity,
          },
        });
      } else {
        // Create new SKU
        await prisma.sKU.create({
          data: {
            variantId: existingVariant.id,
            size: sku.size,
            sku: sku.sku,
            stockQuantity: sku.stockQuantity,
          },
        });
      }
    }
  } else {
    // Create new variant and its SKUs
    const newVariant = await prisma.variant.create({
      data: {
        productId: params.id,
        color: variant.color,
      },
    });

    for (const sku of variant.skus) {
      await prisma.sKU.create({
        data: {
          variantId: newVariant.id,
          size: sku.size,
          sku: sku.sku,
          stockQuantity: sku.stockQuantity,
        },
      });
    }
  }
}


    // Fetch the updated product with variants and SKUs
    const fullProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: {
          include: {
            skus: true,
            shopInventory: true,
            storeInventory: true,
          },
        },
      },
    });

    return NextResponse.json(fullProduct, { status: 200 });
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { message: "Error updating product", error: error.message },
      { status: 500 }
    );
  }
}



export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {

  try {
    // Check if there are any sales associated with the product
    const relatedSales = await prisma.sellItem.findMany({
      where: { productId: params.id },
    });

    if (relatedSales.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete product while there are sales associated with it." },
        { status: 400 }
      );
    }

    // Delete the product if no related sales are found
    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Product deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { message: "Error deleting product", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {

  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: {
          include: {
            skus: true,
            shopInventory: true,
            storeInventory: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { message: "Error fetching product", error: error.message },
      { status: 500 }
    );
  }
}
