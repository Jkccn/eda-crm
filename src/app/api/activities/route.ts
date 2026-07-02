import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACTIVITY_STATUSES } from "@/lib/constants";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const opportunityId = url.searchParams.get("opportunityId");
  const overdue = url.searchParams.get("overdue");

  if (overdue === "true") {
    const items = await prisma.salesActivity.findMany({
      where: {
        status: "Open",
        dueDate: { lt: new Date() },
      },
      include: {
        opportunity: {
          select: { id: true, name: true, customer: { select: { accountName: true } } },
        },
      },
      orderBy: { dueDate: "asc" },
    });
    return NextResponse.json(items);
  }

  if (!opportunityId) {
    return NextResponse.json({ error: "缺少 opportunityId" }, { status: 400 });
  }
  const items = await prisma.salesActivity.findMany({
    where: { opportunityId },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.opportunityId || !body.title) {
    return NextResponse.json({ error: "商机与标题必填" }, { status: 400 });
  }
  const item = await prisma.salesActivity.create({
    data: {
      opportunityId: body.opportunityId,
      title: body.title,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: ACTIVITY_STATUSES.includes(body.status) ? body.status : "Open",
      notes: body.notes || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
