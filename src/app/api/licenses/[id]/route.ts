import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LICENSE_STATUSES } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const item = await prisma.license.update({
    where: { id },
    data: {
      productLine: body.productLine,
      licenseKey: body.licenseKey,
      seats: body.seats != null ? Number(body.seats) : body.seats === null ? null : undefined,
      startDate: body.startDate ? new Date(body.startDate) : body.startDate === null ? null : undefined,
      endDate: body.endDate ? new Date(body.endDate) : body.endDate === null ? null : undefined,
      status: body.status && LICENSE_STATUSES.includes(body.status) ? body.status : undefined,
      notes: body.notes,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.license.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
