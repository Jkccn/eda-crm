import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseAmount } from "@/lib/utils";
import { requireOpportunityApiAccess } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireOpportunityApiAccess(id);
  if (error) return error;

  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      customer: true,
      quotes: { orderBy: { version: "desc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!opportunity) {
    return NextResponse.json({ error: "商机不存在" }, { status: 404 });
  }
  return NextResponse.json(opportunity);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireOpportunityApiAccess(id);
  if (error) return error;

  const body = await request.json();
  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: {
      name: body.name,
      stage: body.stage,
      type: body.type,
      productLine: body.productLine,
      dealSize: body.dealSize !== undefined ? parseAmount(body.dealSize) : undefined,
      currency: body.currency,
      closeDate: body.closeDate ? new Date(body.closeDate) : body.closeDate === null ? null : undefined,
      nextStep: body.nextStep,
      ownerName: body.ownerName,
      aeName: body.aeName,
    },
  });
  return NextResponse.json(opportunity);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireOpportunityApiAccess(id);
  if (error) return error;

  await prisma.opportunity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
