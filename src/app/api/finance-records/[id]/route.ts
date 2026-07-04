import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FINANCE_STATUSES } from "@/lib/constants";
import { isFinanceRecordType } from "@/lib/finance-records";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const item = await prisma.financeRecord.update({
    where: { id },
    data: {
      recordType: body.recordType && isFinanceRecordType(body.recordType) ? body.recordType : undefined,
      recordNo: body.recordNo !== undefined ? body.recordNo?.trim() || null : undefined,
      amount: body.amount != null ? Number(body.amount) : body.amount === null ? null : undefined,
      currency: body.currency,
      recordDate: body.recordDate ? new Date(body.recordDate) : body.recordDate === null ? null : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : body.dueDate === null ? null : undefined,
      status: body.status && FINANCE_STATUSES.includes(body.status) ? body.status : undefined,
      notes: body.notes,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.financeRecord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
