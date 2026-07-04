import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { isGlobalViewer } from "@/lib/rbac";
import { parseOptionalDate } from "@/lib/oem-registration";

export async function GET(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (!isGlobalViewer(user!.role)) return apiForbidden();

  const vendorId = new URL(request.url).searchParams.get("vendorId");
  if (!vendorId) {
    return NextResponse.json({ error: "缺少 vendorId" }, { status: 400 });
  }
  const items = await prisma.vendorRelation.findMany({
    where: { vendorId },
    orderBy: { eventDate: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (!isGlobalViewer(user!.role)) return apiForbidden();

  const body = await request.json();
  if (!body.vendorId || !body.occasionType || !body.eventDate) {
    return NextResponse.json({ error: "供应商、场合与日期必填" }, { status: 400 });
  }
  const eventDate = parseOptionalDate(body.eventDate);
  if (!eventDate) {
    return NextResponse.json({ error: "日期无效" }, { status: 400 });
  }
  const item = await prisma.vendorRelation.create({
    data: {
      vendorId: body.vendorId,
      occasionType: body.occasionType,
      eventDate,
      giftDescription: body.giftDescription || null,
      amount: body.amount ? Number(body.amount) : null,
      currency: body.currency || "CNY",
      notes: body.notes || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
