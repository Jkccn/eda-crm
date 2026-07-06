"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  CURRENCIES,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_TYPES,
  PRODUCT_LINES,
} from "@/lib/constants";

export function OpportunityForm({
  customerId,
  ownerName,
  aeName,
  onCreated,
}: {
  customerId: string;
  ownerName?: string | null;
  aeName?: string | null;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    stage: "Discovery",
    type: "New Business",
    productLine: "Allegro",
    dealSize: "",
    currency: "CNY",
    closeDate: "",
    nextStep: "",
    ownerName: ownerName || "",
    aeName: aeName || "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, customerId }),
    });
    setLoading(false);
    if (res.ok) {
      const opp = await res.json();
      setOpen(false);
      onCreated?.();
      router.push(`/opportunities/${opp.id}`);
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error || "创建失败，请稍后重试");
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>新建销售机会</Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form-panel rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-100">新建销售机会</h3>
      <p className="text-xs text-slate-500">命名建议：YYYYMM-客户简称-产品-类型</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-400">商机名称 *</label>
          <Input
            required
            placeholder="202606-太极-CAM350-维保"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">阶段</label>
          <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
            {OPPORTUNITY_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">类型</label>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {OPPORTUNITY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">产品线</label>
          <Select
            value={form.productLine}
            onChange={(e) => setForm({ ...form, productLine: e.target.value })}
          >
            {PRODUCT_LINES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">预计金额</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={form.dealSize}
            onChange={(e) => setForm({ ...form, dealSize: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">预计成交日</label>
          <Input
            type="date"
            value={form.closeDate}
            onChange={(e) => setForm({ ...form, closeDate: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-400">下一步行动</label>
          <Input
            value={form.nextStep}
            onChange={(e) => setForm({ ...form, nextStep: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "保存中…" : "创建"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>取消</Button>
      </div>
    </form>
  );
}
