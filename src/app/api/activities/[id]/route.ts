import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACTIVITY_STATUSES } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const item = await prisma.salesActivity.update({
    where: { id },
    data: {
      title: body.title,
      dueDate: body.dueDate ? new Date(body.dueDate) : body.dueDate === null ? null : undefined,
      status: body.status && ACTIVITY_STATUSES.includes(body.status) ? body.status : undefined,
      notes: body.notes,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.salesActivity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
