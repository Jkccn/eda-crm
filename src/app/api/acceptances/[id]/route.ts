import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EXECUTION_STATUSES } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const item = await prisma.acceptance.update({
    where: { id },
    data: {
      acceptedAt: body.acceptedAt ? new Date(body.acceptedAt) : body.acceptedAt === null ? null : undefined,
      status: body.status && EXECUTION_STATUSES.includes(body.status) ? body.status : undefined,
      notes: body.notes,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.acceptance.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
