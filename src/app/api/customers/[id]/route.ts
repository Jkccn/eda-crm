import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { canAccessCustomer, isEngineer } from "@/lib/rbac";
import { resolveCustomerOwners } from "@/lib/customer-owners";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      contacts: true,
      opportunities: {
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { documents: true, quotes: true } },
        },
      },
    },
  });
  if (!customer) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }
  if (!canAccessCustomer(user!, customer)) {
    return apiForbidden();
  }
  return NextResponse.json(customer);
}

export async function PATCH(request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (isEngineer(user!.role)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  if (!canAccessCustomer(user!, existing)) return apiForbidden();

  const body = await request.json();
  const { ownerUserId, ownerName, aeName } = await resolveCustomerOwners(body, user!);

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      accountName: body.accountName,
      englishName: body.englishName,
      region: body.region,
      industry: body.industry,
      description: body.description,
      ownerName,
      aeName,
      notes: body.notes,
      ownerUserId,
    },
  });
  return NextResponse.json(customer);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (isEngineer(user!.role)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  if (!canAccessCustomer(user!, existing)) return apiForbidden();

  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
