import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FINANCE_STATUSES, FINANCE_TYPES } from "@/lib/constants";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const opportunityId = url.searchParams.get("opportunityId");
  const overdue = url.searchParams.get("overdue");

  if (overdue === "true") {
    const items = await prisma.financeRecord.findMany({
      where: {
        recordType: "Invoice",
        status: { in: ["Pending", "Overdue"] },
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
  const items = await prisma.financeRecord.findMany({
    where: { opportunityId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.opportunityId || !body.recordType) {
    return NextResponse.json({ error: "商机与记录类型必填" }, { status: 400 });
  }
  const item = await prisma.financeRecord.create({
    data: {
      opportunityId: body.opportunityId,
      recordType: FINANCE_TYPES.includes(body.recordType) ? body.recordType : "Invoice",
      amount: body.amount != null ? Number(body.amount) : null,
      currency: body.currency || "CNY",
      recordDate: body.recordDate ? new Date(body.recordDate) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: FINANCE_STATUSES.includes(body.status) ? body.status : "Pending",
      notes: body.notes || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
