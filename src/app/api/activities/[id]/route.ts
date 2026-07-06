import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACTIVITY_STATUSES } from "@/lib/constants";
import { requireOpportunityApiAccess } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const existing = await prisma.salesActivity.findUnique({
    where: { id },
    select: { opportunityId: true },
  });
  if (!existing) {
    return { error: NextResponse.json({ error: "活动不存在" }, { status: 404 }) };
  }
  return requireOpportunityApiAccess(existing.opportunityId);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await authorize(id);
  if (error) return error;

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
  const { error } = await authorize(id);
  if (error) return error;

  await prisma.salesActivity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
