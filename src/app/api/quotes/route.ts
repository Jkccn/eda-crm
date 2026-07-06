import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QUOTE_STATUSES } from "@/lib/constants";
import { parseAmount } from "@/lib/utils";
import { requireOpportunityApiAccess } from "@/lib/api-auth";

const VALID_STATUSES = new Set<string>(QUOTE_STATUSES);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const opportunityId = searchParams.get("opportunityId");

  const { error } = await requireOpportunityApiAccess(opportunityId);
  if (error) return error;

  const quotes = await prisma.quote.findMany({
    where: { opportunityId: opportunityId! },
    orderBy: { version: "desc" },
  });
  return NextResponse.json(quotes);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.opportunityId || !body.name) {
    return NextResponse.json({ error: "商机与报价名称必填" }, { status: 400 });
  }

  const { opportunity, error } = await requireOpportunityApiAccess(body.opportunityId);
  if (error) return error;

  if (body.status && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "无效报价状态" }, { status: 400 });
  }

  if (body.isFinal) {
    await prisma.quote.updateMany({
      where: { opportunityId: body.opportunityId },
      data: { isFinal: false },
    });
  }

  const quote = await prisma.quote.create({
    data: {
      opportunityId: body.opportunityId,
      name: body.name,
      version: body.version ? Number(body.version) : 1,
      amount: parseAmount(body.amount),
      currency: body.currency || opportunity!.currency,
      status: body.status || "Draft",
      isFinal: Boolean(body.isFinal),
    },
  });

  return NextResponse.json(quote, { status: 201 });
}
