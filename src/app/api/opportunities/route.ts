import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { canAccessCustomer, isEngineer, opportunityScopeWhere } from "@/lib/rbac";

export async function GET(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (isEngineer(user!.role)) return apiForbidden();

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");

  const opportunities = await prisma.opportunity.findMany({
    where: {
      ...opportunityScopeWhere(user!),
      ...(customerId ? { customerId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { id: true, accountName: true } },
      _count: { select: { documents: true, quotes: true } },
    },
  });
  return NextResponse.json(opportunities);
}

export async function POST(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (isEngineer(user!.role)) return apiForbidden();

  const body = await request.json();
  if (!body.customerId || !body.name) {
    return NextResponse.json({ error: "客户与商机名称必填" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: body.customerId },
    select: { id: true, ownerUserId: true, ownerName: true },
  });
  if (!customer) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }
  if (!canAccessCustomer(user!, customer)) {
    return apiForbidden();
  }

  const opportunity = await prisma.opportunity.create({
    data: {
      customerId: body.customerId,
      name: body.name,
      stage: body.stage || "Discovery",
      type: body.type || "New Business",
      productLine: body.productLine || null,
      dealSize: body.dealSize ? Number(body.dealSize) : null,
      currency: body.currency || "CNY",
      closeDate: body.closeDate ? new Date(body.closeDate) : null,
      nextStep: body.nextStep || null,
      ownerName: body.ownerName || customer.ownerName,
      aeName: body.aeName || null,
    },
  });
  return NextResponse.json(opportunity, { status: 201 });
}
