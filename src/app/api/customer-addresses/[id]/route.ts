import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { canAccessCustomer, canViewCustomerContacts } from "@/lib/rbac";
import { ADDRESS_TYPES } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

const VALID_TYPES = new Set(ADDRESS_TYPES.map((t) => t.key));

async function assertAddressRecordAccess(
  addressId: string,
  user: NonNullable<Awaited<ReturnType<typeof requireApiAuth>>["user"]>,
) {
  if (!canViewCustomerContacts(user)) {
    return { error: apiForbidden("助理无权查看客户地址") };
  }
  const record = await prisma.customerAddress.findUnique({
    where: { id: addressId },
    include: { customer: { select: { id: true, ownerUserId: true, ownerName: true } } },
  });
  if (!record) {
    return { error: NextResponse.json({ error: "地址不存在" }, { status: 404 }) };
  }
  if (!canAccessCustomer(user, record.customer)) {
    return { error: apiForbidden() };
  }
  return { record };
}

export async function PATCH(request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await params;
  const access = await assertAddressRecordAccess(id, user!);
  if (access.error) return access.error;

  const body = await request.json();
  const item = await prisma.customerAddress.update({
    where: { id },
    data: {
      addressType:
        body.addressType && VALID_TYPES.has(body.addressType) ? body.addressType : undefined,
      label: body.label,
      addressLine: body.addressLine?.trim(),
      notes: body.notes,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await params;
  const access = await assertAddressRecordAccess(id, user!);
  if (access.error) return access.error;

  await prisma.customerAddress.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
