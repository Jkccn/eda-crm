import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { isGlobalViewer } from "@/lib/rbac";
import { parseOptionalDate } from "@/lib/oem-registration";
import { parseAmount } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (!isGlobalViewer(user!.role)) return apiForbidden();

  const { id } = await params;
  const body = await request.json();
  const eventDate = body.eventDate ? parseOptionalDate(body.eventDate) : undefined;
  const item = await prisma.vendorRelation.update({
    where: { id },
    data: {
      occasionType: body.occasionType,
      ...(eventDate ? { eventDate } : {}),
      giftDescription: body.giftDescription,
      amount: body.amount !== undefined ? parseAmount(body.amount) : undefined,
      currency: body.currency,
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
  await prisma.vendorRelation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
