import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACTIVITY_STATUSES } from "@/lib/constants";
import { requireApiAuth, requireOpportunityApiAccess } from "@/lib/api-auth";
import { opportunityScopeWhere } from "@/lib/rbac";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const opportunityId = url.searchParams.get("opportunityId");
  const overdue = url.searchParams.get("overdue");

  if (overdue === "true") {
    const { user, error } = await requireApiAuth();
    if (error) return error;

    const items = await prisma.salesActivity.findMany({
      where: {
        status: "Open",
        dueDate: { lt: new Date() },
        opportunity: opportunityScopeWhere(user!),
      },
      include: {
        opportunity: {
          select: { id: true, name: true, customer: { select: { accountName: true } } },
        },
      },
      orderBy: { dueDate: "asc" },
    });
    return NextResponse.json(items);
  }

  const { error } = await requireOpportunityApiAccess(opportunityId);
  if (error) return error;

  const items = await prisma.salesActivity.findMany({
    where: { opportunityId: opportunityId! },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.opportunityId || !body.title) {
    return NextResponse.json({ error: "商机与标题必填" }, { status: 400 });
  }
  const { error } = await requireOpportunityApiAccess(body.opportunityId);
  if (error) return error;

  const item = await prisma.salesActivity.create({
    data: {
      opportunityId: body.opportunityId,
      title: body.title,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: ACTIVITY_STATUSES.includes(body.status) ? body.status : "Open",
      notes: body.notes || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
