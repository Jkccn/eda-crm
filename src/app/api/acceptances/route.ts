import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EXECUTION_STATUSES } from "@/lib/constants";

export async function GET(request: Request) {
  const opportunityId = new URL(request.url).searchParams.get("opportunityId");
  if (!opportunityId) {
    return NextResponse.json({ error: "缺少 opportunityId" }, { status: 400 });
  }
  const items = await prisma.acceptance.findMany({
    where: { opportunityId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.opportunityId) {
    return NextResponse.json({ error: "缺少 opportunityId" }, { status: 400 });
  }
  const item = await prisma.acceptance.create({
    data: {
      opportunityId: body.opportunityId,
      acceptedAt: body.acceptedAt ? new Date(body.acceptedAt) : null,
      status: EXECUTION_STATUSES.includes(body.status) ? body.status : "Pending",
      notes: body.notes || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
