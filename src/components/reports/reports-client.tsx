"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileBarChart, Download } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getOemExpiryStatus, oemExpiryLabel } from "@/lib/oem-registration";

type ReportData = {
  salesPerformance: {
    totalWon: number;
    totalAmountFormatted: string;
    byQuarter: { quarter: string; count: number; totalFormatted: string }[];
    recentWon: {
      id: string;
      name: string;
      dealSize: number | null;
      currency: string;
      closeDate: string | null;
      customer: { accountName: string; region: string | null; ownerName: string | null };
    }[];
  };
  registrationSummary: {
    id: string;
    accountName: string;
    region: string | null;
    oemOpportunityNo: string | null;
    oemOpportunityName: string | null;
    oemRegisterStartAt: string | null;
    oemRegisterExpiresAt: string | null;
    hasVendorOrderDone: boolean;
    vendorOrderDate: string | null;
    ownerName: string | null;
  }[];
  quarterlyStats: { quarter: string; registered: number; ordered: number }[];
  summary: {
    totalCustomers: number;
    registeredCount: number;
    orderedCount: number;
    expiringCount: number;
    expiredCount: number;
  };
};

const TABS = [
  { key: "sales", label: "销售业绩" },
  { key: "registration", label: "客户报备汇总" },
  { key: "quarterly", label: "季度统计" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ReportsClient() {
  const [tab, setTab] = useState<TabKey>("sales");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  function exportCsv() {
    if (!data) return;
    let rows: string[][] = [];
    if (tab === "registration") {
      rows = [
        ["客户名称", "区域", "商机号码", "商机名称", "开始时间", "过期时间", "原厂已下单", "下单日期", "销售负责人"],
        ...data.registrationSummary.map((r) => [
          r.accountName,
          r.region || "",
          r.oemOpportunityNo || "",
          r.oemOpportunityName || "",
          formatDate(r.oemRegisterStartAt),
          formatDate(r.oemRegisterExpiresAt),
          r.hasVendorOrderDone ? "是" : "否",
          formatDate(r.vendorOrderDate),
          r.ownerName || "",
        ]),
      ];
    } else if (tab === "quarterly") {
      rows = [
        ["季度", "报备客户数", "原厂下单客户数"],
        ...data.quarterlyStats.map((q) => [q.quarter, String(q.registered), String(q.ordered)]),
      ];
    } else {
      rows = [
        ["季度", "成交商机数", "成交金额"],
        ...data.salesPerformance.byQuarter.map((q) => [q.quarter, String(q.count), q.totalFormatted]),
      ];
    }
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eda-crm-${tab}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <p className="text-sm text-slate-400">加载报表…</p>;
  }
  if (!data) {
    return <p className="text-sm text-red-400">无法加载报表数据</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">信息汇报</h1>
          <p className="page-subtitle">销售业绩 · 客户报备 · 季度汇总</p>
        </div>
        <Button variant="secondary" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          导出 CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MiniStat label="客户总数" value={String(data.summary.totalCustomers)} />
        <MiniStat label="已报备" value={String(data.summary.registeredCount)} />
        <MiniStat label="报备已下单" value={String(data.summary.orderedCount)} />
        <MiniStat label="报备即将过期" value={String(data.summary.expiringCount)} />
        <MiniStat label="报备已过期" value={String(data.summary.expiredCount)} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/30"
                : "text-slate-400 hover:bg-cyan-500/10 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sales" && (
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <FileBarChart className="h-4 w-4 text-cyan-400" />
              公司销售业绩（Won 商机）
            </h2>
            <p className="text-xs text-slate-500">
              累计 {data.salesPerformance.totalWon} 笔 · {data.salesPerformance.totalAmountFormatted}
            </p>
          </CardHeader>
          <CardBody>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.salesPerformance.byQuarter.map((q) => (
                <div key={q.quarter} className="rounded-xl border border-white/5 bg-white/5 p-4">
                  <p className="text-xs text-slate-500">{q.quarter}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">{q.totalFormatted}</p>
                  <p className="text-xs text-slate-400">{q.count} 笔成交</p>
                </div>
              ))}
            </div>
            <ul className="divide-y divide-white/5">
              {data.salesPerformance.recentWon.map((opp) => (
                <li key={opp.id} className="hover-row py-2 text-sm">
                  <Link href={`/opportunities/${opp.id}`} className="link-hover font-medium text-cyan-400">
                    {opp.name}
                  </Link>
                  <p className="text-slate-500">
                    {opp.customer.accountName} · {formatCurrency(opp.dealSize, opp.currency)} · 成交{" "}
                    {formatDate(opp.closeDate)}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {tab === "registration" && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-200">客户报备汇总表</h2>
          </CardHeader>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs text-slate-500">
                  <th className="px-4 py-3">客户</th>
                  <th className="px-4 py-3">商机号码</th>
                  <th className="px-4 py-3">商机名称</th>
                  <th className="px-4 py-3">开始</th>
                  <th className="px-4 py-3">过期</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">原厂已下单</th>
                  <th className="px-4 py-3">下单日期</th>
                </tr>
              </thead>
              <tbody>
                {data.registrationSummary.map((r) => {
                  const status = getOemExpiryStatus(r.oemRegisterExpiresAt);
                  return (
                    <tr key={r.id} className="hover-row border-b border-white/5">
                      <td className="px-4 py-3">
                        <Link href={`/customers/${r.id}`} className="link-hover text-cyan-400">
                          {r.accountName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{r.oemOpportunityNo || "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{r.oemOpportunityName || "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(r.oemRegisterStartAt)}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(r.oemRegisterExpiresAt)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            status === "expired"
                              ? "bg-rose-500/20 text-rose-300"
                              : status === "warning"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-slate-500/20 text-slate-400"
                          }
                        >
                          {oemExpiryLabel(status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{r.hasVendorOrderDone ? "是" : "否"}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {r.hasVendorOrderDone ? formatDate(r.vendorOrderDate) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {tab === "quarterly" && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-200">按季度报备与原厂下单统计</h2>
          </CardHeader>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs text-slate-500">
                  <th className="px-4 py-3">季度</th>
                  <th className="px-4 py-3">报备客户数量</th>
                  <th className="px-4 py-3">原厂下单客户数量</th>
                </tr>
              </thead>
              <tbody>
                {data.quarterlyStats.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      暂无季度数据
                    </td>
                  </tr>
                ) : (
                  data.quarterlyStats.map((q) => (
                    <tr key={q.quarter} className="hover-row border-b border-white/5">
                      <td className="px-4 py-3 font-medium text-slate-100">{q.quarter}</td>
                      <td className="px-4 py-3 text-slate-300">{q.registered}</td>
                      <td className="px-4 py-3 text-slate-300">{q.ordered}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="stat-value">{value}</p>
      </CardBody>
    </Card>
  );
}
