import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADDRESS_TYPES } from "@/lib/constants";

const VALID_TYPES = new Set(ADDRESS_TYPES.map((t) => t.key));

export async function GET(request: Request) {
  const customerId = new URL(request.url).searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json({ error: "缺少 customerId" }, { status: 400 });
  }
  const items = await prisma.customerAddress.findMany({
    where: { customerId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.customerId || !body.addressType || !body.addressLine?.trim()) {
    return NextResponse.json({ error: "客户、地址类型与地址必填" }, { status: 400 });
  }
  if (!VALID_TYPES.has(body.addressType)) {
    return NextResponse.json({ error: "无效地址类型" }, { status: 400 });
  }
  const item = await prisma.customerAddress.create({
    data: {
      customerId: body.customerId,
      addressType: body.addressType,
      label: body.label || null,
      addressLine: body.addressLine.trim(),
      city: body.city || null,
      province: body.province || null,
      postalCode: body.postalCode || null,
      country: body.country || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
