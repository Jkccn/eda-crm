import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FINANCE_STATUSES } from "@/lib/constants";
import { isFinanceRecordType } from "@/lib/finance-records";
import { parseAmount } from "@/lib/utils";
import { requireApiAuth, requireOpportunityApiAccess } from "@/lib/api-auth";
import { opportunityScopeWhere } from "@/lib/rbac";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const opportunityId = url.searchParams.get("opportunityId");
  const overdue = url.searchParams.get("overdue");

  if (overdue === "true") {
    const { user, error } = await requireApiAuth();
    if (error) return error;

    const items = await prisma.financeRecord.findMany({
      where: {
        recordType: "Invoice",
        status: { in: ["Pending", "Overdue"] },
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

  const items = await prisma.financeRecord.findMany({
    where: { opportunityId: opportunityId! },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.opportunityId || !body.recordType) {
    return NextResponse.json({ error: "商机与记录类型必填" }, { status: 400 });
  }
  const { error } = await requireOpportunityApiAccess(body.opportunityId);
  if (error) return error;

  const item = await prisma.financeRecord.create({
    data: {
      opportunityId: body.opportunityId,
      recordType: isFinanceRecordType(body.recordType) ? body.recordType : "Invoice",
      recordNo: body.recordNo?.trim() || null,
      amount: parseAmount(body.amount),
      currency: body.currency || "CNY",
      recordDate: body.recordDate ? new Date(body.recordDate) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: FINANCE_STATUSES.includes(body.status) ? body.status : "Pending",
      notes: body.notes || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
