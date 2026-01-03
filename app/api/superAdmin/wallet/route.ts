import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import AuthOptions from "../../auth/[...nextauth]/AuthOptions";
import prisma from "@/prisma/client";

export async function GET(request: NextRequest) {
  const session = await getServerSession(AuthOptions);

  if (!session) {
    return NextResponse.json(
      { error: "You must be logged in to view wallet" },
      { status: 401 }
    );
  }

  try {
    let wallet = await prisma.wallet.findFirst();

    // Create wallet if it doesn't exist
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          cashBalance: 0,
          digitalBalance: 0,
        },
      });
    }

    return NextResponse.json(wallet, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch wallet" },
      { status: 500 }
    );
  }
}
