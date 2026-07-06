import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FINANCE_STATUSES } from "@/lib/constants";
import { isFinanceRecordType } from "@/lib/finance-records";
import { parseAmount } from "@/lib/utils";
import { requireOpportunityApiAccess } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const existing = await prisma.financeRecord.findUnique({
    where: { id },
    select: { opportunityId: true },
  });
  if (!existing) {
    return { error: NextResponse.json({ error: "财务记录不存在" }, { status: 404 }) };
  }
  return requireOpportunityApiAccess(existing.opportunityId);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await authorize(id);
  if (error) return error;

  const body = await request.json();
  const item = await prisma.financeRecord.update({
    where: { id },
    data: {
      recordType: body.recordType && isFinanceRecordType(body.recordType) ? body.recordType : undefined,
      recordNo: body.recordNo !== undefined ? body.recordNo?.trim() || null : undefined,
      amount: body.amount !== undefined ? parseAmount(body.amount) : undefined,
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
  const { error } = await authorize(id);
  if (error) return error;

  await prisma.financeRecord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
