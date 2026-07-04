import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { isGlobalViewer } from "@/lib/rbac";

export async function GET(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (!isGlobalViewer(user!.role)) return apiForbidden();

  const vendorId = new URL(request.url).searchParams.get("vendorId");
  if (!vendorId) {
    return NextResponse.json({ error: "缺少 vendorId" }, { status: 400 });
  }
  const items = await prisma.vendorContact.findMany({
    where: { vendorId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (!isGlobalViewer(user!.role)) return apiForbidden();

  const body = await request.json();
  if (!body.vendorId || !body.name) {
    return NextResponse.json({ error: "供应商与姓名必填" }, { status: 400 });
  }
  const item = await prisma.vendorContact.create({
    data: {
      vendorId: body.vendorId,
      name: body.name,
      title: body.title || null,
      email: body.email || null,
      phone: body.phone || null,
      isPrimary: Boolean(body.isPrimary),
    },
  });
  return NextResponse.json(item, { status: 201 });
}
