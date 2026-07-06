import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CONTRACT_STATUSES, CONTRACT_TYPES } from "@/lib/constants";
import { parseAmount } from "@/lib/utils";
import { requireOpportunityApiAccess } from "@/lib/api-auth";

export async function GET(request: Request) {
  const opportunityId = new URL(request.url).searchParams.get("opportunityId");
  const { error } = await requireOpportunityApiAccess(opportunityId);
  if (error) return error;

  const items = await prisma.contract.findMany({
    where: { opportunityId: opportunityId! },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { error } = await requireOpportunityApiAccess(body.opportunityId);
  if (error) return error;

  const item = await prisma.contract.create({
    data: {
      opportunityId: body.opportunityId,
      contractNo: body.contractNo || null,
      contractType: CONTRACT_TYPES.includes(body.contractType) ? body.contractType : "Contract",
      amount: parseAmount(body.amount),
      currency: body.currency || "CNY",
      signedDate: body.signedDate ? new Date(body.signedDate) : null,
      status: CONTRACT_STATUSES.includes(body.status) ? body.status : "Draft",
      notes: body.notes || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
