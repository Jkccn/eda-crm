"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getOemExpiryStatus, oemExpiryLabel } from "@/lib/oem-registration";
import { formatDate } from "@/lib/utils";

type OemData = {
  id: string;
  oemOpportunityNo: string | null;
  oemOpportunityName: string | null;
  oemRegisterStartAt: string | Date | null;
  oemRegisterExpiresAt: string | Date | null;
};

function toDateInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const STATUS_BADGE: Record<string, string> = {
  expired: "bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30",
  warning: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30",
  active: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30",
  none: "bg-slate-500/20 text-slate-400 ring-1 ring-slate-400/30",
};

export function OemRegistrationPanel({ initial }: { initial: OemData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(initial);
  const [form, setForm] = useState({
    oemOpportunityNo: initial.oemOpportunityNo || "",
    oemOpportunityName: initial.oemOpportunityName || "",
    oemRegisterStartAt: toDateInput(initial.oemRegisterStartAt),
    oemRegisterExpiresAt: toDateInput(initial.oemRegisterExpiresAt),
  });

  const status = getOemExpiryStatus(data.oemRegisterExpiresAt);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/customers/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setData(updated);
      setEditing(false);
      router.refresh();
    }
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-200">原厂客户报备</h3>
            <Badge className={STATUS_BADGE[status]}>{oemExpiryLabel(status)}</Badge>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p className="text-slate-400">
              商机号码 <span className="text-slate-200">{data.oemOpportunityNo || "—"}</span>
            </p>
            <p className="text-slate-400">
              商机名称 <span className="text-slate-200">{data.oemOpportunityName || "—"}</span>
            </p>
            <p className="text-slate-400">
              开始时间 <span className="text-slate-200">{formatDate(data.oemRegisterStartAt)}</span>
            </p>
            <p className="text-slate-400">
              过期时间 <span className="text-slate-200">{formatDate(data.oemRegisterExpiresAt)}</span>
            </p>
          </div>
          <p className="text-xs text-slate-500">
            原厂下单状态请在关联商机的「合同与执行」中维护；状态为 Done 时将计入信息汇报。
          </p>
        </div>
        <Button variant="ghost" className="!px-2" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-slate-500">编辑原厂报备信息</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">商机号码</label>
          <Input
            value={form.oemOpportunityNo}
            onChange={(e) => setForm({ ...form, oemOpportunityNo: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">商机名称</label>
          <Input
            value={form.oemOpportunityName}
            onChange={(e) => setForm({ ...form, oemOpportunityName: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">开始时间</label>
          <Input
            type="date"
            value={form.oemRegisterStartAt}
            onChange={(e) => setForm({ ...form, oemRegisterStartAt: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">过期时间</label>
          <Input
            type="date"
            value={form.oemRegisterExpiresAt}
            onChange={(e) => setForm({ ...form, oemRegisterExpiresAt: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" disabled={saving} onClick={handleSave}>
          <Check className="h-4 w-4" />
          {saving ? "保存中…" : "保存"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          <X className="h-4 w-4" />
          取消
        </Button>
      </div>
    </div>
  );
}
