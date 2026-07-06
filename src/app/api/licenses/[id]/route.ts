import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LICENSE_STATUSES } from "@/lib/constants";
import { requireCustomerApiAccess } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const existing = await prisma.license.findUnique({
    where: { id },
    select: { customerId: true },
  });
  if (!existing) {
    return { error: NextResponse.json({ error: "License 不存在" }, { status: 404 }) };
  }
  return requireCustomerApiAccess(existing.customerId);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await authorize(id);
  if (error) return error;

  const body = await request.json();
  const item = await prisma.license.update({
    where: { id },
    data: {
      productLine: body.productLine,
      licenseKey: body.licenseKey,
      seats: body.seats != null && body.seats !== "" ? Number(body.seats) : body.seats === null || body.seats === "" ? null : undefined,
      startDate: body.startDate ? new Date(body.startDate) : body.startDate === null ? null : undefined,
      endDate: body.endDate ? new Date(body.endDate) : body.endDate === null ? null : undefined,
      status: body.status && LICENSE_STATUSES.includes(body.status) ? body.status : undefined,
      notes: body.notes,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await authorize(id);
  if (error) return error;

  await prisma.license.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
