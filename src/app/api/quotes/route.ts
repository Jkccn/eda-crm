import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QUOTE_STATUSES } from "@/lib/constants";

const VALID_STATUSES = new Set<string>(QUOTE_STATUSES);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const opportunityId = searchParams.get("opportunityId");

  if (!opportunityId) {
    return NextResponse.json({ error: "缺少 opportunityId" }, { status: 400 });
  }

  const quotes = await prisma.quote.findMany({
    where: { opportunityId },
    orderBy: { version: "desc" },
  });
  return NextResponse.json(quotes);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.opportunityId || !body.name) {
    return NextResponse.json({ error: "商机与报价名称必填" }, { status: 400 });
  }

  const opp = await prisma.opportunity.findUnique({
    where: { id: body.opportunityId },
  });
  if (!opp) {
    return NextResponse.json({ error: "商机不存在" }, { status: 404 });
  }

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
      amount: body.amount != null ? Number(body.amount) : null,
      currency: body.currency || opp.currency,
      status: body.status || "Draft",
      isFinal: Boolean(body.isFinal),
    },
  });

  return NextResponse.json(quote, { status: 201 });
}
