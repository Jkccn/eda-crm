"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  CURRENCIES,
  FINANCE_STATUSES,
  FINANCE_TYPES,
  LICENSE_STATUSES,
  PRODUCT_LINES,
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  EditableRecordList,
  EditActions,
  EntityItem,
  patchJson,
} from "@/components/opportunities/editable-record-list";

export function FinancePanel({
  opportunityId,
  customerId,
  currency,
}: {
  opportunityId: string;
  customerId: string;
  currency: string;
}) {
  const [records, setRecords] = useState<EntityItem[]>([]);
  const [licenses, setLicenses] = useState<EntityItem[]>([]);

  async function load() {
    const [r, l] = await Promise.all([
      fetch(`/api/finance-records?opportunityId=${opportunityId}`).then((res) => res.json()),
      fetch(`/api/licenses?opportunityId=${opportunityId}`).then((res) => res.json()),
    ]);
    setRecords(Array.isArray(r) ? r : []);
    setLicenses(Array.isArray(l) ? l : []);
  }

  useEffect(() => {
    load();
  }, [opportunityId]);

  async function del(url: string) {
    if (!confirm("确定删除？")) return;
    await fetch(url, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">开票 / 回款</h3>
        <form
          className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-200 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await fetch("/api/finance-records", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                opportunityId,
                recordType: fd.get("recordType"),
                amount: fd.get("amount") || null,
                currency: fd.get("currency") || currency,
                dueDate: fd.get("dueDate") || null,
                status: fd.get("status"),
              }),
            });
            e.currentTarget.reset();
            load();
          }}
        >
          <FieldSelect name="recordType" label="类型" options={FINANCE_TYPES} />
          <FieldInput name="amount" label="金额" type="number" />
          <FieldSelect name="currency" label="货币" options={CURRENCIES} defaultValue={currency} />
          <FieldInput name="dueDate" label="到期日" type="date" />
          <FieldSelect name="status" label="状态" options={FINANCE_STATUSES} />
          <Button type="submit" variant="secondary"><Plus className="h-4 w-4" />添加</Button>
        </form>
        <EditableRecordList
          items={records}
          renderSummary={(item) => (
            <span>
              {item.recordType as string} · {formatCurrency(item.amount as number, item.currency as string)} · 到期{" "}
              {formatDate(item.dueDate as string)} · {item.status as string}
            </span>
          )}
          renderEditForm={(item, { onSave, onCancel }) => (
            <FinanceEditForm
              item={item}
              defaultCurrency={currency}
              onSave={async (body) => {
                if (await patchJson(`/api/finance-records/${item.id}`, body)) {
                  await load();
                  onSave();
                }
              }}
              onCancel={onCancel}
            />
          )}
          onDelete={(id) => del(`/api/finance-records/${id}`)}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">License 生命周期</h3>
        <form
          className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-200 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await fetch("/api/licenses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerId,
                opportunityId,
                productLine: fd.get("productLine"),
                seats: fd.get("seats") || null,
                startDate: fd.get("startDate") || null,
                endDate: fd.get("endDate") || null,
                status: fd.get("status"),
              }),
            });
            e.currentTarget.reset();
            load();
          }}
        >
          <FieldSelect name="productLine" label="产品线" options={PRODUCT_LINES} />
          <FieldInput name="seats" label="席位数" type="number" />
          <FieldInput name="startDate" label="开始日" type="date" />
          <FieldInput name="endDate" label="到期日" type="date" />
          <FieldSelect name="status" label="状态" options={LICENSE_STATUSES} />
          <Button type="submit" variant="secondary"><Plus className="h-4 w-4" />添加</Button>
        </form>
        <EditableRecordList
          items={licenses}
          renderSummary={(item) => (
            <span>
              {(item.productLine as string) || "License"} · {(item.seats as number | null) ?? "—"} 席位 ·{" "}
              {formatDate(item.startDate as string)} → {formatDate(item.endDate as string)} · {item.status as string}
            </span>
          )}
          renderEditForm={(item, { onSave, onCancel }) => (
            <LicenseEditForm
              item={item}
              onSave={async (body) => {
                if (await patchJson(`/api/licenses/${item.id}`, body)) {
                  await load();
                  onSave();
                }
              }}
              onCancel={onCancel}
            />
          )}
          onDelete={(id) => del(`/api/licenses/${id}`)}
        />
      </div>
    </div>
  );
}

function dateInputValue(v: unknown) {
  if (!v) return "";
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function FinanceEditForm({
  item,
  defaultCurrency,
  onSave,
  onCancel,
}: {
  item: EntityItem;
  defaultCurrency: string;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    recordType: (item.recordType as string) || FINANCE_TYPES[0],
    amount: item.amount != null ? String(item.amount) : "",
    currency: (item.currency as string) || defaultCurrency,
    dueDate: dateInputValue(item.dueDate),
    status: (item.status as string) || FINANCE_STATUSES[0],
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[120px]">
        <label className="mb-1 block text-xs text-slate-500">类型</label>
        <Select value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value })}>
          {FINANCE_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      </div>
      <div className="min-w-[120px]">
        <label className="mb-1 block text-xs text-slate-500">金额</label>
        <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
      </div>
      <div className="min-w-[120px]">
        <label className="mb-1 block text-xs text-slate-500">货币</label>
        <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
          {CURRENCIES.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      </div>
      <div className="min-w-[120px]">
        <label className="mb-1 block text-xs text-slate-500">到期日</label>
        <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
      </div>
      <div className="min-w-[120px]">
        <label className="mb-1 block text-xs text-slate-500">状态</label>
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {FINANCE_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      </div>
      <EditActions
        saving={saving}
        onSave={async () => {
          setSaving(true);
          await onSave({
            recordType: form.recordType,
            amount: form.amount ? Number(form.amount) : null,
            currency: form.currency,
            dueDate: form.dueDate || null,
            status: form.status,
          });
          setSaving(false);
        }}
        onCancel={onCancel}
      />
    </div>
  );
}

function LicenseEditForm({
  item,
  onSave,
  onCancel,
}: {
  item: EntityItem;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    productLine: (item.productLine as string) || PRODUCT_LINES[0],
    seats: item.seats != null ? String(item.seats) : "",
    startDate: dateInputValue(item.startDate),
    endDate: dateInputValue(item.endDate),
    status: (item.status as string) || LICENSE_STATUSES[0],
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[120px]">
        <label className="mb-1 block text-xs text-slate-500">产品线</label>
        <Select value={form.productLine} onChange={(e) => setForm({ ...form, productLine: e.target.value })}>
          {PRODUCT_LINES.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      </div>
      <div className="min-w-[120px]">
        <label className="mb-1 block text-xs text-slate-500">席位数</label>
        <Input type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
      </div>
      <div className="min-w-[120px]">
        <label className="mb-1 block text-xs text-slate-500">开始日</label>
        <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
      </div>
      <div className="min-w-[120px]">
        <label className="mb-1 block text-xs text-slate-500">到期日</label>
        <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
      </div>
      <div className="min-w-[120px]">
        <label className="mb-1 block text-xs text-slate-500">状态</label>
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {LICENSE_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      </div>
      <EditActions
        saving={saving}
        onSave={async () => {
          setSaving(true);
          await onSave({
            productLine: form.productLine,
            seats: form.seats ? Number(form.seats) : null,
            startDate: form.startDate || null,
            endDate: form.endDate || null,
            status: form.status,
          });
          setSaving(false);
        }}
        onCancel={onCancel}
      />
    </div>
  );
}

function FieldInput({ name, label, type = "text", defaultValue }: {
  name: string; label: string; type?: string; defaultValue?: string;
}) {
  return (
    <div className="min-w-[120px]">
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <Input name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}

function FieldSelect({ name, label, options, defaultValue }: {
  name: string; label: string; options: readonly string[]; defaultValue?: string;
}) {
  return (
    <div className="min-w-[120px]">
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <Select name={name} defaultValue={defaultValue || options[0]}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </Select>
    </div>
  );
}
