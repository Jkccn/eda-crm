import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EXECUTION_STATUSES } from "@/lib/constants";
import { requireOpportunityApiAccess } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const existing = await prisma.acceptance.findUnique({
    where: { id },
    select: { opportunityId: true },
  });
  if (!existing) {
    return { error: NextResponse.json({ error: "验收记录不存在" }, { status: 404 }) };
  }
  return requireOpportunityApiAccess(existing.opportunityId);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await authorize(id);
  if (error) return error;

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
  const { error } = await authorize(id);
  if (error) return error;

  await prisma.acceptance.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
