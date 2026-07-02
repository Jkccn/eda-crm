import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADDRESS_TYPES } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

const VALID_TYPES = new Set(ADDRESS_TYPES.map((t) => t.key));

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const item = await prisma.customerAddress.update({
    where: { id },
    data: {
      addressType:
        body.addressType && VALID_TYPES.has(body.addressType) ? body.addressType : undefined,
      label: body.label,
      addressLine: body.addressLine?.trim(),
      city: body.city,
      province: body.province,
      postalCode: body.postalCode,
      country: body.country,
      notes: body.notes,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.customerAddress.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
