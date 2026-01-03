import { bankSchema } from "@/app/validationSchema/bankSchema";
import { NextRequest, NextResponse } from "next/server";
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

  const validation = bankSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(validation.error.format(), { status: 400 });
  }

  const bank = await prisma.bankAccount.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!bank) {
    return NextResponse.json("Unknown bank, please check out", {
      status: 404,
    });
  }

  const updatedBank = await prisma.bankAccount.update({
    where: {
      id: params.id,
    },
    data: {
      name: body.name ,
      userId: body.userId ? body.userId : undefined,        
    },
  });

  return NextResponse.json(updatedBank, { status: 200 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check if the bank exists
  const bank = await prisma.bankAccount.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!bank) {
    return NextResponse.json("Unknown bank, please check out", {
      status: 404,
    });
  }

  // Check if the bank is associated with any products
  const associatedProducts = await prisma.bankTransaction.findMany({
    where: {
      bankAccountId: params.id,
    },
  });

  if (associatedProducts.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete bank as it is associated with transactions" },
      { status: 400 }
    );
  }

  // Proceed to delete the bank if no associations are found
  const deletedBank = await prisma.bankAccount.delete({
    where: {
      id: params.id,
    },
  });

  return NextResponse.json(deletedBank, { status: 200 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Get The bank
  const GetBank = await prisma.bankAccount.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!GetBank)
    return NextResponse.json("unknown bank please check out", {
      status: 404,
    });

    const bank = await prisma.bankAccount.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        cashBalance: true,
        digitalBalance: true,
        totalBalance: true,
      },
    });

    // Fetch related transactions
   const transactions = await prisma.bankTransaction.findMany({
      where: { bankAccountId: params.id },
      orderBy: { createdAt: "desc" },
      include: { account: { select: { id: true, account: true } } },
    });

    // Fetch debt orders for this customer
    const debtOrders = await prisma.sell.findMany({
      where: {
        bankAccountId: params.id,
        isDebt: true,
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
        },
        shop: {
          select: { id: true, name: true },
        },
      },
    });

    console.log(`📋 Bank Account ${params.id} - Found ${debtOrders.length} debt orders`);
  
  return NextResponse.json({bank, transactions, debtOrders}, { status: 200 });
}
