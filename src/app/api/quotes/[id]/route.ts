import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QUOTE_STATUSES } from "@/lib/constants";
import { parseAmount } from "@/lib/utils";
import { requireOpportunityApiAccess } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES = new Set<string>(QUOTE_STATUSES);

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "报价不存在" }, { status: 404 });
  }
  const { error } = await requireOpportunityApiAccess(existing.opportunityId);
  if (error) return error;

  if (body.status && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "无效报价状态" }, { status: 400 });
  }

  if (body.isFinal) {
    await prisma.quote.updateMany({
      where: { opportunityId: existing.opportunityId, id: { not: id } },
      data: { isFinal: false },
    });
  }

  const quote = await prisma.quote.update({
    where: { id },
    data: {
      name: body.name,
      version: body.version != null ? Number(body.version) : undefined,
      amount: body.amount !== undefined ? parseAmount(body.amount) : undefined,
      currency: body.currency,
      status: body.status,
      isFinal: body.isFinal != null ? Boolean(body.isFinal) : undefined,
    },
  });

  return NextResponse.json(quote);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "报价不存在" }, { status: 404 });
  }
  const { error } = await requireOpportunityApiAccess(existing.opportunityId);
  if (error) return error;

  await prisma.quote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
