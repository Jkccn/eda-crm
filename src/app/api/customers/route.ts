import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import {
  canAccessCustomer,
  canDeleteCustomer,
  canViewCustomerContacts,
  customerPicklistWhere,
  customerScopeWhere,
  isEngineer,
} from "@/lib/rbac";
import { resolveCustomerOwners } from "@/lib/customer-owners";
import { oemFieldsFromBody, stripUndefined } from "@/lib/customer-oem-fields";
import { customerOrderBy, parseCustomerSort } from "@/lib/customer-sort";

export async function GET(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const picklist = searchParams.get("picklist") === "1";

  if (isEngineer(user!.role) && !picklist) {
    return apiForbidden("工程师无权查看客户列表");
  }

  const where = picklist ? customerPicklistWhere(user!) : customerScopeWhere(user!);

  if (picklist) {
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: { id: true, accountName: true, englishName: true },
    });
    return NextResponse.json(customers);
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: customerOrderBy(parseCustomerSort(searchParams.get("sort"))),
    include: {
      _count: { select: { opportunities: true } },
      opportunities: {
        take: 3,
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, stage: true, dealSize: true, currency: true },
      },
    },
  });
  return NextResponse.json(customers);
}

export async function POST(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  if (isEngineer(user!.role)) {
    return apiForbidden("工程师无权创建客户");
  }

  const body = await request.json();
  const { ownerUserId, ownerName, aeName } = await resolveCustomerOwners(body, user!);

  const customer = await prisma.customer.create({
    data: {
      accountName: body.accountName,
      englishName: body.englishName || null,
      region: body.region || null,
      industry: body.industry || null,
      description: body.description || null,
      ownerName,
      aeName,
      ownerUserId,
      notes: body.notes || null,
      ...stripUndefined(oemFieldsFromBody(body)),
    },
  });
  return NextResponse.json(customer, { status: 201 });
}
