import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CONTRACT_STATUSES, CONTRACT_TYPES } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const item = await prisma.contract.update({
    where: { id },
    data: {
      contractNo: body.contractNo,
      contractType: body.contractType && CONTRACT_TYPES.includes(body.contractType) ? body.contractType : undefined,
      amount: body.amount != null ? Number(body.amount) : body.amount === null ? null : undefined,
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
  await prisma.contract.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
