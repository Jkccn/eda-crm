import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EXECUTION_STATUSES } from "@/lib/constants";

export async function GET(request: Request) {
  const opportunityId = new URL(request.url).searchParams.get("opportunityId");
  if (!opportunityId) {
    return NextResponse.json({ error: "缺少 opportunityId" }, { status: 400 });
  }
  const items = await prisma.vendorBooking.findMany({
    where: { opportunityId },
    include: { vendor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.opportunityId) {
    return NextResponse.json({ error: "缺少 opportunityId" }, { status: 400 });
  }
  const item = await prisma.vendorBooking.create({
    data: {
      opportunityId: body.opportunityId,
      vendorId: body.vendorId || null,
      bookingNo: body.bookingNo || null,
      amount: body.amount != null ? Number(body.amount) : null,
      currency: body.currency || "CNY",
      orderDate: body.orderDate ? new Date(body.orderDate) : null,
      status: EXECUTION_STATUSES.includes(body.status) ? body.status : "Pending",
      notes: body.notes || null,
    },
    include: { vendor: { select: { id: true, name: true } } },
  });
  return NextResponse.json(item, { status: 201 });
}
