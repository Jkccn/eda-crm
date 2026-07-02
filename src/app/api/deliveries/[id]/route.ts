import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EXECUTION_STATUSES } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const item = await prisma.delivery.update({
    where: { id },
    data: {
      deliveryNo: body.deliveryNo,
      deliveredAt: body.deliveredAt ? new Date(body.deliveredAt) : body.deliveredAt === null ? null : undefined,
      status: body.status && EXECUTION_STATUSES.includes(body.status) ? body.status : undefined,
      notes: body.notes,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.delivery.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
