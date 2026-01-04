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
    

    return NextResponse.json('you cannot update anything', { status: 201 });
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
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    
    // Parse location parameter (format: "shop-{id}" or "all")
    const isShopFilter = location && location !== 'all' && location.startsWith('shop-');
    const shopId = isShopFilter ? location.split('-')[1] : null;

    if (shopId) {
      // Filter by specific shop inventory
      const shopInventory = await prisma.shopInventory.findMany({
        where: { shopId },
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      });

      // Calculate stats from shop inventory
      const uniqueProducts = new Set(shopInventory.map(inv => inv.variant.product.id));
      const totalProducts = uniqueProducts.size;

      const availableStock = shopInventory.reduce((sum, inv) => sum + inv.quantity, 0);

      const LOW_STOCK_THRESHOLD = 5;
      const lowStockCount = shopInventory.filter(inv => inv.quantity > 0 && inv.quantity <= LOW_STOCK_THRESHOLD).length;
      const outOfStockCount = shopInventory.filter(inv => inv.quantity === 0).length;

      return NextResponse.json({
        totalProducts,
        availableStock,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      });
    }

    // Default: All products stats
    const totalProducts = await prisma.product.count();

    // Available Stock (Total stock quantity of all products where stockQuantity > 0)
    const availableStockResult = await prisma.product.aggregate({
      _sum: {
        stockQuantity: true,
      },
      where: {
        stockQuantity: {
          gt: 0,
        },
      },
    });

    const availableStock = availableStockResult._sum.stockQuantity || 0;

    // Low Stock (Products where stockQuantity > 0 and stockQuantity <= threshold)
    const LOW_STOCK_THRESHOLD = 5;

    const lowStockCount = await prisma.product.count({
      where: {
        stockQuantity: {
          gt: 0,
          lte: LOW_STOCK_THRESHOLD,
        },
      },
    });

    // Out of Stock (Products where stockQuantity == 0)
    const outOfStockCount = await prisma.product.count({
      where: {
        stockQuantity: 0,
      },
    });

    return NextResponse.json({
      totalProducts,
      availableStock,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
  }
}
