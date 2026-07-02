import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EXECUTION_STATUSES } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const item = await prisma.vendorBooking.update({
    where: { id },
    data: {
      vendorId: body.vendorId,
      bookingNo: body.bookingNo,
      amount: body.amount != null ? Number(body.amount) : body.amount === null ? null : undefined,
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
  await prisma.vendorBooking.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
