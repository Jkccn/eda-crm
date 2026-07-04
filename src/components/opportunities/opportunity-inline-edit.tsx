"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CURRENCIES,
  OPPORTUNITY_STAGES,
  STAGE_COLORS,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

type Props = {
  opportunityId: string;
  initial: {
    stage: string;
    dealSize: number | null;
    currency: string;
    nextStep: string | null;
  };
};

export function OpportunityInlineEdit({ opportunityId, initial }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    stage: initial.stage,
    dealSize: initial.dealSize?.toString() ?? "",
    currency: initial.currency,
    nextStep: initial.nextStep ?? "",
  });
  const [display, setDisplay] = useState(initial);

  async function handleSave() {
    setLoading(true);
    const res = await fetch(`/api/opportunities/${opportunityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: form.stage,
        dealSize: form.dealSize ? Number(form.dealSize) : null,
        currency: form.currency,
        nextStep: form.nextStep || null,
      }),
    });
    setLoading(false);

    if (res.ok) {
      const updated = await res.json();
      const next = {
        stage: updated.stage,
        dealSize: updated.dealSize,
        currency: updated.currency,
        nextStep: updated.nextStep,
      };
      setDisplay(next);
      setEditing(false);
      router.refresh();
    }
  }

  function handleCancel() {
    setForm({
      stage: display.stage,
      dealSize: display.dealSize?.toString() ?? "",
      currency: display.currency,
      nextStep: display.nextStep ?? "",
    });
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Badge className={STAGE_COLORS[display.stage] || ""}>{display.stage}</Badge>
          {display.nextStep && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              下一步：{display.nextStep}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-2xl font-bold text-slate-100">
            {formatCurrency(display.dealSize, display.currency)}
          </p>
          <Button variant="ghost" className="!px-2" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-panel space-y-4 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-600">快速编辑</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">阶段</label>
          <Select
            value={form.stage}
            onChange={(e) => setForm({ ...form, stage: e.target.value })}
          >
            {OPPORTUNITY_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">金额</label>
          <Input
            type="number"
            value={form.dealSize}
            onChange={(e) => setForm({ ...form, dealSize: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">货币</label>
          <Select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="mb-1 block text-xs font-medium text-slate-600">下一步行动</label>
          <Input
            value={form.nextStep}
            onChange={(e) => setForm({ ...form, nextStep: e.target.value })}
            placeholder="例如：发送 V3 报价并约评审会议"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" disabled={loading} onClick={handleSave}>
          <Check className="h-4 w-4" />
          {loading ? "保存中…" : "保存"}
        </Button>
        <Button type="button" variant="ghost" onClick={handleCancel}>
          <X className="h-4 w-4" />
          取消
        </Button>
      </div>
    </div>
  );
}
