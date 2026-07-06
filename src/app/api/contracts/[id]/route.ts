import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CONTRACT_STATUSES, CONTRACT_TYPES } from "@/lib/constants";
import { parseAmount } from "@/lib/utils";
import { requireOpportunityApiAccess } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const existing = await prisma.contract.findUnique({
    where: { id },
    select: { opportunityId: true },
  });
  if (!existing) {
    return { error: NextResponse.json({ error: "合同不存在" }, { status: 404 }) };
  }
  return requireOpportunityApiAccess(existing.opportunityId);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await authorize(id);
  if (error) return error;

  const body = await request.json();
  const item = await prisma.contract.update({
    where: { id },
    data: {
      contractNo: body.contractNo,
      contractType: body.contractType && CONTRACT_TYPES.includes(body.contractType) ? body.contractType : undefined,
      amount: body.amount !== undefined ? parseAmount(body.amount) : undefined,
      currency: body.currency,
      signedDate: body.signedDate ? new Date(body.signedDate) : body.signedDate === null ? null : undefined,
      status: body.status && CONTRACT_STATUSES.includes(body.status) ? body.status : undefined,
      notes: body.notes,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await authorize(id);
  if (error) return error;

  await prisma.contract.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
