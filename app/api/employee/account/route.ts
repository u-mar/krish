import { NextRequest, NextResponse } from "next/server";
import { accountSchema } from "@/app/validationSchema/account";
import prisma from "@/prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {

  const categories = await prisma.accounts.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      transactions: true,
    }
  });
  return NextResponse.json(categories, { status: 200 });
}
