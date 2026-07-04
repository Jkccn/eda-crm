import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import {
  canAccessModule,
  customerScopeWhere,
  isGlobalViewer,
  opportunityScopeWhere,
} from "@/lib/rbac";
import { OEM_EXPIRY_WARNING_DAYS } from "@/lib/constants";
import { getOemExpiryStatus, quarterKey } from "@/lib/oem-registration";
import {
  VENDOR_BOOKING_DONE_STATUS,
  buildCustomerVendorOrderMap,
  countOrderedCustomersByQuarter,
  countRegisteredCustomersWithVendorOrder,
} from "@/lib/vendor-order-report";
import { formatCurrency } from "@/lib/utils";

export async function GET() {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (!canAccessModule(user!.role, "reports")) return apiForbidden();

  const oppWhere = opportunityScopeWhere(user!);
  const customerWhere = customerScopeWhere(user!);
  const now = new Date();
  const warnDate = new Date(now.getTime() + OEM_EXPIRY_WARNING_DAYS * 86400000);

  const [wonOpps, customers, doneVendorBookings] = await Promise.all([
    prisma.opportunity.findMany({
      where: { ...oppWhere, stage: "Won" },
      select: {
        id: true,
        name: true,
        dealSize: true,
        currency: true,
        closeDate: true,
        customer: { select: { accountName: true, region: true, ownerName: true } },
      },
      orderBy: { closeDate: "desc" },
    }),
    prisma.customer.findMany({
      where: customerWhere,
      select: {
        id: true,
        accountName: true,
        region: true,
        industry: true,
        ownerName: true,
        oemOpportunityNo: true,
        oemOpportunityName: true,
        oemRegisterStartAt: true,
        oemRegisterExpiresAt: true,
      },
      orderBy: { accountName: "asc" },
    }),
    prisma.vendorBooking.findMany({
      where: {
        status: VENDOR_BOOKING_DONE_STATUS,
        opportunity: oppWhere,
      },
      select: {
        orderDate: true,
        opportunity: { select: { customerId: true } },
      },
    }),
  ]);

  const vendorOrderByCustomer = buildCustomerVendorOrderMap(doneVendorBookings);

  const salesByQuarter: Record<string, { count: number; total: number; items: typeof wonOpps }> = {};
  for (const opp of wonOpps) {
    const key = opp.closeDate ? quarterKey(opp.closeDate) : "未设定";
    if (!salesByQuarter[key]) salesByQuarter[key] = { count: 0, total: 0, items: [] };
    salesByQuarter[key].count += 1;
    salesByQuarter[key].total += opp.dealSize || 0;
    salesByQuarter[key].items.push(opp);
  }

  const registeredCustomers = customers.filter((c) => c.oemRegisterStartAt || c.oemOpportunityNo);
  const registeredCustomerIds = new Set(registeredCustomers.map((c) => c.id));
  const orderedByQuarter = countOrderedCustomersByQuarter(doneVendorBookings, registeredCustomerIds);
  const orderedCount = countRegisteredCustomersWithVendorOrder(
    vendorOrderByCustomer,
    registeredCustomerIds,
  );

  const quarterlyMap = new Map<string, { registered: number; ordered: number }>();

  for (const c of registeredCustomers) {
    if (!c.oemRegisterStartAt) continue;
    const key = quarterKey(c.oemRegisterStartAt);
    const row = quarterlyMap.get(key) || { registered: 0, ordered: 0 };
    row.registered += 1;
    quarterlyMap.set(key, row);
  }

  for (const [quarter, count] of orderedByQuarter) {
    const row = quarterlyMap.get(quarter) || { registered: 0, ordered: 0 };
    row.ordered = count;
    quarterlyMap.set(quarter, row);
  }

  const quarterlyStats = [...quarterlyMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([quarter, stats]) => ({ quarter, ...stats }));

  const registrationSummary = registeredCustomers.map((c) => {
    const orderInfo = vendorOrderByCustomer.get(c.id);
    return {
      ...c,
      hasVendorOrderDone: orderInfo?.hasVendorOrderDone ?? false,
      vendorOrderDate: orderInfo?.vendorOrderDate?.toISOString() ?? null,
    };
  });

  const oemWarnings = customers
    .filter((c) => {
      const status = getOemExpiryStatus(c.oemRegisterExpiresAt);
      return status === "warning" || status === "expired";
    })
    .map((c) => ({
      id: c.id,
      accountName: c.accountName,
      oemOpportunityNo: c.oemOpportunityNo,
      oemOpportunityName: c.oemOpportunityName,
      oemRegisterExpiresAt: c.oemRegisterExpiresAt,
      status: getOemExpiryStatus(c.oemRegisterExpiresAt),
    }))
    .sort((a, b) => {
      const ta = a.oemRegisterExpiresAt ? new Date(a.oemRegisterExpiresAt).getTime() : 0;
      const tb = b.oemRegisterExpiresAt ? new Date(b.oemRegisterExpiresAt).getTime() : 0;
      return ta - tb;
    });

  const salesTotal = wonOpps.reduce((s, o) => s + (o.dealSize || 0), 0);

  return NextResponse.json({
    salesPerformance: {
      totalWon: wonOpps.length,
      totalAmount: salesTotal,
      totalAmountFormatted: formatCurrency(salesTotal),
      byQuarter: Object.entries(salesByQuarter)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([quarter, data]) => ({
          quarter,
          count: data.count,
          total: data.total,
          totalFormatted: formatCurrency(data.total),
        })),
      recentWon: wonOpps.slice(0, 20),
    },
    registrationSummary,
    quarterlyStats,
    summary: {
      totalCustomers: customers.length,
      registeredCount: registeredCustomers.length,
      orderedCount,
      expiringCount: oemWarnings.filter((w) => w.status === "warning").length,
      expiredCount: oemWarnings.filter((w) => w.status === "expired").length,
    },
    isGlobalViewer: isGlobalViewer(user!.role),
    warnBefore: warnDate.toISOString(),
  });
}
