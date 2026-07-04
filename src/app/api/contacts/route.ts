import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { canAccessCustomer, canViewCustomerContacts } from "@/lib/rbac";

async function assertContactAccess(user: NonNullable<Awaited<ReturnType<typeof requireApiAuth>>["user"]>, customerId: string) {
  if (!canViewCustomerContacts(user)) {
    return apiForbidden("助理无权查看客户联系人");
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
  const denied = await assertContactAccess(user!, customerId);
  if (denied) return denied;

  const items = await prisma.contact.findMany({
    where: { customerId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const body = await request.json();
  if (!body.customerId || !body.name) {
    return NextResponse.json({ error: "客户与姓名必填" }, { status: 400 });
  }
  const denied = await assertContactAccess(user!, body.customerId);
  if (denied) return denied;

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
