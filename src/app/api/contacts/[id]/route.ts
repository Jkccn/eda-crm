import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { canAccessCustomer, canViewCustomerContacts } from "@/lib/rbac";

type Params = { params: Promise<{ id: string }> };

async function assertContactAccess(contactId: string, user: NonNullable<Awaited<ReturnType<typeof requireApiAuth>>["user"]>) {
  if (!canViewCustomerContacts(user)) {
    return { error: apiForbidden("助理无权查看客户联系人") };
  }
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { customer: { select: { id: true, ownerUserId: true, ownerName: true } } },
  });
  if (!contact) {
    return { error: NextResponse.json({ error: "联系人不存在" }, { status: 404 }) };
  }
  if (!canAccessCustomer(user, contact.customer)) {
    return { error: apiForbidden() };
  }
  return { contact };
}

export async function PATCH(request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await params;
  const access = await assertContactAccess(id, user!);
  if (access.error) return access.error;

  const body = await request.json();
  const item = await prisma.contact.update({
    where: { id },
    data: {
      name: body.name,
      title: body.title,
      email: body.email,
      phone: body.phone,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await params;
  const access = await assertContactAccess(id, user!);
  if (access.error) return access.error;

  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
