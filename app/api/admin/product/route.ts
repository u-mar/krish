import { NextRequest, NextResponse } from "next/server";
import { productSchema } from "@/app/validationSchema/productSchema";
import prisma from "@/prisma/client";

export async function POST(request: NextRequest) {
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
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Calculate the total stock quantity from all SKUs (if they exist)
    let totalStockQuantity = 0;
    body.variants.forEach((variant: any) => {
      if (variant.skus) {
        variant.skus.forEach((sku: any) => {
          totalStockQuantity += sku.stockQuantity;
        });
      }
    });

    // Create the product with the calculated total stock quantity
    const newProduct = await prisma.product.create({
      data: {
        name: body.name,
        categoryId: body.categoryId,
        price: parseFloat(body.price),
        description: body.description,
        stockQuantity: totalStockQuantity,  // Set the total stock quantity here
        variants: {
          create: body.variants.map((variant: any) => ({
            color: variant.color,
            ...(variant.skus && variant.skus.length > 0 && {
              skus: {
                create: variant.skus.map((sku: any) => ({
                  size: sku.size,
                  sku: sku.sku,
                  stockQuantity: sku.stockQuantity,
                })),
              },
            }),
          })),
        },
      },
      include: {
        variants: {
          include: {
            skus: true,
          },
        },
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { message: "Error registering product", error: error.message },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {


  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        variants: {
          include: {
            skus: true,
          },
        },
        orderItem: {
          select: {
            quantity: true
          }
        }
      },
    });
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { message: "Error fetching product files" },
      { status: 500 }
    );
  }
}
