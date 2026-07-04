import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { canAccessCustomer, canViewCustomerContacts } from "@/lib/rbac";
import { ADDRESS_TYPES } from "@/lib/constants";

const VALID_TYPES = new Set(ADDRESS_TYPES.map((t) => t.key));

async function assertAddressAccess(
  user: NonNullable<Awaited<ReturnType<typeof requireApiAuth>>["user"]>,
  customerId: string,
) {
  if (!canViewCustomerContacts(user)) {
    return apiForbidden("助理无权查看客户地址");
  }
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, ownerUserId: true, ownerName: true },
  });
  if (!customer) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }
  if (!canAccessCustomer(user, customer)) {
    return apiForbidden();
  }
  return null;
}

export async function GET(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const customerId = new URL(request.url).searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json({ error: "缺少 customerId" }, { status: 400 });
  }
  const denied = await assertAddressAccess(user!, customerId);
  if (denied) return denied;

  const items = await prisma.customerAddress.findMany({
    where: { customerId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const body = await request.json();
  if (!body.customerId || !body.addressType || !body.addressLine?.trim()) {
    return NextResponse.json({ error: "客户、地址类型与地址必填" }, { status: 400 });
  }
  const denied = await assertAddressAccess(user!, body.customerId);
  if (denied) return denied;

  if (!VALID_TYPES.has(body.addressType)) {
    return NextResponse.json({ error: "无效地址类型" }, { status: 400 });
  }
  const item = await prisma.customerAddress.create({
    data: {
      customerId: body.customerId,
      addressType: body.addressType,
      label: body.label || null,
      addressLine: body.addressLine.trim(),
      notes: body.notes || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
