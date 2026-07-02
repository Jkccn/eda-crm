import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { OPPORTUNITY_STAGES } from "@/lib/constants";
import { isEngineer, isGlobalViewer, opportunityScopeWhere } from "@/lib/rbac";

export async function GET() {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (isEngineer(user!.role)) return apiForbidden();

  const oppWhere = opportunityScopeWhere(user!);

  const [opportunities, overdueInvoices, expiringLicenses, openRenewalTasks, overdueActivities] =
    await Promise.all([
      prisma.opportunity.findMany({
        where: { ...oppWhere, stage: { notIn: ["Lost"] } },
        select: { stage: true, dealSize: true, currency: true },
      }),
      isGlobalViewer(user!.role)
        ? prisma.financeRecord.findMany({
            where: {
              recordType: "Invoice",
              status: { in: ["Pending", "Overdue"] },
              dueDate: { lt: new Date() },
            },
            include: {
              opportunity: {
                select: { name: true, customer: { select: { accountName: true } } },
              },
            },
            take: 10,
          })
        : Promise.resolve([]),
      isGlobalViewer(user!.role)
        ? prisma.license.findMany({
            where: {
              endDate: { lte: new Date(Date.now() + 90 * 86400000), gte: new Date() },
              status: { in: ["Active", "Expiring"] },
            },
            include: { customer: { select: { accountName: true } } },
            orderBy: { endDate: "asc" },
            take: 10,
          })
        : Promise.resolve([]),
      isGlobalViewer(user!.role)
        ? prisma.renewalTask.count({ where: { status: "Open" } })
        : Promise.resolve(0),
      prisma.salesActivity.count({
        where: {
          status: "Open",
          dueDate: { lt: new Date() },
          opportunity: oppWhere,
        },
      }),
    ]);

  const pipeline = OPPORTUNITY_STAGES.filter((s) => s !== "Lost").map((stage) => {
    const opps = opportunities.filter((o) => o.stage === stage);
    const total = opps.reduce((sum, o) => sum + (o.dealSize || 0), 0);
    return { stage, count: opps.length, total };
  });

  const arTotal = overdueInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

  return NextResponse.json({
    pipeline,
    ar: { total: arTotal, count: overdueInvoices.length, items: overdueInvoices },
    renewals: { expiringLicenses, openTasks: openRenewalTasks },
    overdueActivities,
  });
}
