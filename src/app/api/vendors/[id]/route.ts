import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { isGlobalViewer } from "@/lib/rbac";
import { parseOptionalDate } from "@/lib/oem-registration";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (!isGlobalViewer(user!.role)) return apiForbidden();

  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { name: "asc" } },
      relations: { orderBy: { eventDate: "desc" } },
      _count: { select: { vendorBookings: true } },
    },
  });
  if (!vendor) {
    return NextResponse.json({ error: "供应商不存在" }, { status: 404 });
  }
  return NextResponse.json(vendor);
}

export async function PATCH(request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (!isGlobalViewer(user!.role)) return apiForbidden();

  const { id } = await params;
  const body = await request.json();
  const item = await prisma.vendor.update({
    where: { id },
    data: {
      name: body.name,
      productLines: body.productLines,
      contactInfo: body.contactInfo,
      notes: body.notes,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (!isGlobalViewer(user!.role)) return apiForbidden();

  const { id } = await params;
  await prisma.vendor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
