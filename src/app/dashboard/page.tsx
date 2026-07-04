import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OPPORTUNITY_STAGES, STAGE_COLORS, OEM_EXPIRY_WARNING_DAYS } from "@/lib/constants";
import { isEngineer, isGlobalViewer, opportunityScopeWhere, customerScopeWhere } from "@/lib/rbac";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { RenewalSuggestions } from "@/components/dashboard/renewal-suggestions";
import { getOemExpiryStatus, oemExpiryLabel } from "@/lib/oem-registration";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isEngineer(user.role)) redirect("/support");

  const oppWhere = opportunityScopeWhere(user);
  const customerWhere = customerScopeWhere(user);
  const showGlobal = isGlobalViewer(user.role);

  const [opportunities, overdueInvoices, expiringLicenses, openRenewalTasks, overdueActivities, openSupportCases, oemExpiringCustomers] =
    await Promise.all([
      prisma.opportunity.findMany({
        where: { ...oppWhere, stage: { notIn: ["Lost"] } },
        select: { stage: true, dealSize: true },
      }),
      showGlobal
        ? prisma.financeRecord.findMany({
            where: {
              recordType: "Invoice",
              status: { in: ["Pending", "Overdue"] },
              dueDate: { lt: new Date() },
            },
            include: {
              opportunity: {
                select: { id: true, name: true, customer: { select: { accountName: true } } },
              },
            },
            orderBy: { dueDate: "asc" },
            take: 10,
          })
        : Promise.resolve([]),
      showGlobal
        ? prisma.license.findMany({
            where: {
              endDate: { lte: new Date(Date.now() + 90 * 86400000), gte: new Date() },
              status: { in: ["Active", "Expiring"] },
            },
            include: { customer: { select: { id: true, accountName: true } } },
            orderBy: { endDate: "asc" },
            take: 10,
          })
        : Promise.resolve([]),
      showGlobal
        ? prisma.renewalTask.count({ where: { status: "Open" } })
        : Promise.resolve(0),
      prisma.salesActivity.count({
        where: {
          status: "Open",
          dueDate: { lt: new Date() },
          opportunity: oppWhere,
        },
      }),
      showGlobal
        ? prisma.supportCase.findMany({
            where: { status: { in: ["Open", "In Progress"] } },
            include: {
              customer: { select: { accountName: true } },
              assignedUser: { select: { displayName: true, username: true } },
            },
            orderBy: { openedAt: "desc" },
            take: 8,
          })
        : Promise.resolve([]),
      prisma.customer.findMany({
        where: {
          ...customerWhere,
          oemRegisterExpiresAt: { not: null },
        },
        select: {
          id: true,
          accountName: true,
          oemOpportunityNo: true,
          oemOpportunityName: true,
          oemRegisterExpiresAt: true,
        },
        orderBy: { oemRegisterExpiresAt: "asc" },
      }),
    ]);

  const pipeline = OPPORTUNITY_STAGES.filter((s) => s !== "Lost").map((stage) => {
    const opps = opportunities.filter((o) => o.stage === stage);
    return {
      stage,
      count: opps.length,
      total: opps.reduce((sum, o) => sum + (o.dealSize || 0), 0),
    };
  });

  const arTotal = overdueInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const oemWarnings = oemExpiringCustomers
    .filter((c) => {
      const status = getOemExpiryStatus(c.oemRegisterExpiresAt);
      return status === "warning" || status === "expired";
    })
    .slice(0, 10);
  const oemExpiredCount = oemWarnings.filter((c) => getOemExpiryStatus(c.oemRegisterExpiresAt) === "expired").length;
  const oemExpiringCount = oemWarnings.length - oemExpiredCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">管理仪表盘</h1>
          <p className="page-subtitle">Pipeline · 报备预警 · 续费雷达</p>
        </div>
        <DashboardActions />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pipeline 商机" value={String(opportunities.length)} />
        <StatCard
          label="Pipeline 总额"
          value={formatCurrency(pipeline.reduce((s, p) => s + p.total, 0))}
        />
        <StatCard label="逾期应收" value={formatCurrency(arTotal)} sub={`${overdueInvoices.length} 笔`} />
        {showGlobal ? (
          <StatCard
            label="待处理工单"
            value={String(openSupportCases.length)}
            sub="进行中技术支持"
          />
        ) : (
          <StatCard
            label="报备过期预警"
            value={String(oemWarnings.length)}
            sub={`${oemExpiringCount} 即将过期 · ${oemExpiredCount} 已过期`}
          />
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">原厂报备过期预警（{OEM_EXPIRY_WARNING_DAYS} 天内）</h2>
          <Link href="/customers" className="link-hover text-xs text-cyan-400">
            查看客户报备 →
          </Link>
        </CardHeader>
        <CardBody>
          {oemWarnings.length === 0 ? (
            <p className="text-sm text-slate-400">暂无即将过期或已过期的原厂报备</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {oemWarnings.map((c) => {
                const status = getOemExpiryStatus(c.oemRegisterExpiresAt);
                return (
                  <li key={c.id} className="hover-row rounded-lg px-2 py-2 text-sm">
                    <Link href={`/customers/${c.id}`} className="link-hover font-medium text-cyan-400">
                      {c.accountName}
                    </Link>
                    <p className="text-slate-500">
                      {c.oemOpportunityNo && `${c.oemOpportunityNo} · `}
                      {c.oemOpportunityName || "未命名报备"}
                      {" · 过期 "}
                      {formatDate(c.oemRegisterExpiresAt)}
                      {" · "}
                      <Badge
                        className={
                          status === "expired"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-amber-500/20 text-amber-300"
                        }
                      >
                        {oemExpiryLabel(status)}
                      </Badge>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-200">Pipeline 分布</h2></CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pipeline.map((p) => (
              <div key={p.stage} className="rounded-xl border border-white/5 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <Badge className={STAGE_COLORS[p.stage] || ""}>{p.stage}</Badge>
                  <span className="text-sm text-slate-500">{p.count} 个</span>
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-100">
                  {formatCurrency(p.total)}
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-slate-200">应收账款（逾期）</h2></CardHeader>
          <CardBody>
            {overdueInvoices.length === 0 ? (
              <p className="text-sm text-slate-400">无逾期发票</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {overdueInvoices.map((inv) => (
                  <li key={inv.id} className="py-2 text-sm hover-row rounded-lg px-2">
                    <Link
                      href={`/opportunities/${inv.opportunity.id}`}
                      className="link-hover font-medium text-cyan-400"
                    >
                      {inv.opportunity.name}
                    </Link>
                    <p className="text-slate-500">
                      {inv.opportunity.customer.accountName} ·{" "}
                      {formatCurrency(inv.amount, inv.currency)} · 到期 {formatDate(inv.dueDate)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-slate-200">续费雷达（90 天内到期）</h2></CardHeader>
          <CardBody>
            {expiringLicenses.length === 0 ? (
              <p className="text-sm text-slate-400">暂无即将到期 License</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {expiringLicenses.map((lic) => (
                  <li key={lic.id} className="py-2 text-sm hover-row rounded-lg px-2">
                    <p className="font-medium text-slate-100">
                      {lic.customer.accountName} · {lic.productLine || "License"}
                    </p>
                    <p className="text-slate-500">到期 {formatDate(lic.endDate)} · {lic.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {showGlobal && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">技术支持工单（进行中）</h2>
            <Link href="/support" className="link-hover text-xs text-cyan-400">
              查看全部 →
            </Link>
          </CardHeader>
          <CardBody>
            {openSupportCases.length === 0 ? (
              <p className="text-sm text-slate-400">暂无进行中的工单</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {openSupportCases.map((c) => (
                  <li key={c.id} className="py-2 text-sm hover-row rounded-lg px-2">
                    <Link href="/support" className="font-medium text-cyan-400 hover:underline">
                      {c.title}
                    </Link>
                    <p className="text-slate-500">
                      {c.customer.accountName}
                      {" · "}
                      {c.assignedUser?.displayName || c.assignedUser?.username || "未分配"}
                      {" · "}
                      <Badge className="!text-xs">{c.status}</Badge>
                      {" · "}
                      {c.priority}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-200">续费商机建议</h2></CardHeader>
        <CardBody><RenewalSuggestions /></CardBody>
      </Card>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="stat-value">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </CardBody>
    </Card>
  );
}
