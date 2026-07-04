import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { isGlobalViewer } from "@/lib/rbac";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (!isGlobalViewer(user!.role)) return apiForbidden();

  const { id } = await params;
  const body = await request.json();
  const item = await prisma.vendorContact.update({
    where: { id },
    data: {
      name: body.name,
      title: body.title,
      email: body.email,
      phone: body.phone,
      isPrimary: body.isPrimary,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (!isGlobalViewer(user!.role)) return apiForbidden();

  const { id } = await params;
  await prisma.vendorContact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
