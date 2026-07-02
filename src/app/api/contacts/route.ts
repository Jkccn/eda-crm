import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const customerId = new URL(request.url).searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json({ error: "缺少 customerId" }, { status: 400 });
  }
  const items = await prisma.contact.findMany({
    where: { customerId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.customerId || !body.name) {
    return NextResponse.json({ error: "客户与姓名必填" }, { status: 400 });
  }
  const item = await prisma.contact.create({
    data: {
      customerId: body.customerId,
      name: body.name,
      title: body.title || null,
      email: body.email || null,
      phone: body.phone || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
