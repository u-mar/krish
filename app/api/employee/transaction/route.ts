import { NextRequest, NextResponse } from "next/server";
import { transactionSchema } from "@/app/validationSchema/transactionSchema";
import prisma from "@/prisma/client";
import { getServerSession } from "next-auth";
import AuthOptions from "../../auth/[...nextauth]/AuthOptions";
import { User } from "@prisma/client";


export async function POST(request: NextRequest) {
  if (request.headers.get("content-length") === "0") {
    return NextResponse.json(
      { error: "You have to provide body information" },
      { status: 400 }
    );
  }

  const session = await getServerSession(AuthOptions);
  const userId = (session?.user as User).id;
  const body = await request.json();
  const validation = transactionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(validation.error.format(), { status: 400 });
  }

  try {
    const { cashAmount = 0, digitalAmount = 0, details, tranDate } = body;
    const totalAmount = cashAmount + digitalAmount;

    // Generate reference number
    const currentDate = new Date();
    const dateStr = currentDate.toISOString().split("T")[0];
    const timeStr = currentDate.toISOString().split("T")[1].split(".")[0];
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const ref = `EXP-${dateStr}-${timeStr}-${randomDigits}`;

    // Create the transaction
    const newTransaction = await prisma.transaction.create({
      data: {
        userId: userId,
        details: details,
        tranDate: tranDate ? new Date(tranDate) : new Date(),
        amount: totalAmount,
        cashAmount: cashAmount,
        digitalAmount: digitalAmount,
        ref: ref,
        amountType: "KES",
      },
    });

    // Update wallet - deduct the amounts
    const wallet = await prisma.wallet.findFirst();
    
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        cashBalance: { decrement: cashAmount },
        digitalBalance: { decrement: digitalAmount },
      },
    });

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { message: "Error registering transaction", error: error.message },
      { status: 500 }
    );
  }
}



export async function GET(request: NextRequest) {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    });
    return NextResponse.json(transactions, { status: 200 });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { message: "Error fetching transaction files" },
      { status: 500 }
    );
  }
}
