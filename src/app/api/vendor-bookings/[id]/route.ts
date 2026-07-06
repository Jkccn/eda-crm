import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EXECUTION_STATUSES } from "@/lib/constants";
import { parseAmount } from "@/lib/utils";
import { requireOpportunityApiAccess } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const existing = await prisma.vendorBooking.findUnique({
    where: { id },
    select: { opportunityId: true },
  });
  if (!existing) {
    return { error: NextResponse.json({ error: "下单记录不存在" }, { status: 404 }) };
  }
  return requireOpportunityApiAccess(existing.opportunityId);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await authorize(id);
  if (error) return error;

  const body = await request.json();
  const item = await prisma.vendorBooking.update({
    where: { id },
    data: {
      vendorId: body.vendorId,
      bookingNo: body.bookingNo,
      amount: body.amount !== undefined ? parseAmount(body.amount) : undefined,
      currency: body.currency,
      orderDate: body.orderDate ? new Date(body.orderDate) : body.orderDate === null ? null : undefined,
      status: body.status && EXECUTION_STATUSES.includes(body.status) ? body.status : undefined,
      notes: body.notes,
    },
    include: { vendor: { select: { id: true, name: true } } },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await authorize(id);
  if (error) return error;

  await prisma.vendorBooking.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
