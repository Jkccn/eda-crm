import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CONTRACT_STATUSES, CONTRACT_TYPES } from "@/lib/constants";

export async function GET(request: Request) {
  const opportunityId = new URL(request.url).searchParams.get("opportunityId");
  if (!opportunityId) {
    return NextResponse.json({ error: "缺少 opportunityId" }, { status: 400 });
  }
  const items = await prisma.contract.findMany({
    where: { opportunityId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.opportunityId) {
    return NextResponse.json({ error: "缺少 opportunityId" }, { status: 400 });
  }
  const item = await prisma.contract.create({
    data: {
      opportunityId: body.opportunityId,
      contractNo: body.contractNo || null,
      contractType: CONTRACT_TYPES.includes(body.contractType) ? body.contractType : "Contract",
      amount: body.amount != null ? Number(body.amount) : null,
      currency: body.currency || "CNY",
      signedDate: body.signedDate ? new Date(body.signedDate) : null,
      status: CONTRACT_STATUSES.includes(body.status) ? body.status : "Draft",
      notes: body.notes || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
