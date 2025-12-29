import prisma from "@/prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shops = await prisma.shop.findMany({
      include: {
        _count: {
          select: {
            inventory: true,
            sells: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(shops);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch shops" },
      { status: 500 }
    );
  }
}
