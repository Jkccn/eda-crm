import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LICENSE_STATUSES } from "@/lib/constants";
import {
  requireApiAuth,
  requireCustomerApiAccess,
  requireOpportunityApiAccess,
} from "@/lib/api-auth";
import { customerScopeWhere } from "@/lib/rbac";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const opportunityId = url.searchParams.get("opportunityId");
  const customerId = url.searchParams.get("customerId");
  const expiring = url.searchParams.get("expiring");

  if (expiring === "true") {
    const { user, error } = await requireApiAuth();
    if (error) return error;

    const in90 = new Date();
    in90.setDate(in90.getDate() + 90);
    const items = await prisma.license.findMany({
      where: {
        endDate: { lte: in90, gte: new Date() },
        status: { in: ["Active", "Expiring"] },
        customer: customerScopeWhere(user!),
      },
      include: {
        customer: { select: { id: true, accountName: true } },
        opportunity: { select: { id: true, name: true } },
        renewalTasks: { where: { status: "Open" } },
      },
      orderBy: { endDate: "asc" },
    });
    return NextResponse.json(items);
  }

  if (opportunityId) {
    const { error } = await requireOpportunityApiAccess(opportunityId);
    if (error) return error;
  } else if (customerId) {
    const { error } = await requireCustomerApiAccess(customerId);
    if (error) return error;
  } else {
    return NextResponse.json({ error: "缺少 opportunityId 或 customerId" }, { status: 400 });
  }

  const items = await prisma.license.findMany({
    where: opportunityId ? { opportunityId } : { customerId: customerId! },
    orderBy: { endDate: "asc" },
    include: { renewalTasks: { where: { status: "Open" } } },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.customerId) {
    return NextResponse.json({ error: "客户必填" }, { status: 400 });
  }
  const { error } = await requireCustomerApiAccess(body.customerId);
  if (error) return error;

  const item = await prisma.license.create({
    data: {
      customerId: body.customerId,
      opportunityId: body.opportunityId || null,
      productLine: body.productLine || null,
      licenseKey: body.licenseKey || null,
      seats: body.seats != null && body.seats !== "" ? Number(body.seats) : null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      status: LICENSE_STATUSES.includes(body.status) ? body.status : "Active",
      notes: body.notes || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
