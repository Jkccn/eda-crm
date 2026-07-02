import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { isGlobalViewer } from "@/lib/rbac";

export async function GET() {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (!isGlobalViewer(user!.role)) return apiForbidden();

  const items = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (!isGlobalViewer(user!.role)) return apiForbidden();

  const body = await request.json();
  if (!body.name) {
    return NextResponse.json({ error: "供应商名称必填" }, { status: 400 });
  }
  const item = await prisma.vendor.create({
    data: {
      name: body.name,
      productLines: body.productLines || null,
      contactInfo: body.contactInfo || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
