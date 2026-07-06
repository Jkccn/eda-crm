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
  FINANCE_TYPE_LABELS,
  LICENSE_STATUSES,
  PRODUCT_LINES,
  VENDOR_FINANCE_TYPES,
  type FinanceRecordType,
} from "@/lib/constants";
import { formatCurrency, formatDate, parseAmount } from "@/lib/utils";
import {
  EditableRecordList,
  EditActions,
  EntityItem,
  patchJson,
} from "@/components/opportunities/editable-record-list";

function financeTypeLabel(type: string) {
  return FINANCE_TYPE_LABELS[type as FinanceRecordType] || type;
}

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

  const customerRecords = records.filter((r) =>
    (FINANCE_TYPES as readonly string[]).includes(r.recordType as string),
  );
  const vendorRecords = records.filter((r) =>
    (VENDOR_FINANCE_TYPES as readonly string[]).includes(r.recordType as string),
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-1 text-sm font-semibold text-slate-200">客户开票 / 回款</h3>
        <p className="mb-3 text-xs text-slate-500">代理商向客户开具的发票及客户回款</p>
        <FinanceRecordForm
          opportunityId={opportunityId}
          currency={currency}
          recordTypes={FINANCE_TYPES}
          defaultType="Invoice"
          onCreated={load}
        />
        <EditableRecordList
          items={customerRecords}
          renderSummary={(item) => <FinanceRecordSummary item={item} />}
          renderEditForm={(item, { onSave, onCancel }) => (
            <FinanceEditForm
              item={item}
              defaultCurrency={currency}
              recordTypes={FINANCE_TYPES}
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
        <h3 className="mb-1 text-sm font-semibold text-slate-200">原厂开票 / 向原厂付款</h3>
        <p className="mb-3 text-xs text-slate-500">
          原厂发给代理商的 Invoice、内部货物相关发票，以及代理商向原厂的付款记录。对应文件请在下方「阶段文件」中上传至
          「原厂内部货物」「原厂发票」「原厂付款凭证」分类。
        </p>
        <FinanceRecordForm
          opportunityId={opportunityId}
          currency={currency}
          recordTypes={VENDOR_FINANCE_TYPES}
          defaultType="VendorInvoice"
          showRecordNo
          showRecordDate
          onCreated={load}
        />
        <EditableRecordList
          items={vendorRecords}
          renderSummary={(item) => <FinanceRecordSummary item={item} />}
          renderEditForm={(item, { onSave, onCancel }) => (
            <FinanceEditForm
              item={item}
              defaultCurrency={currency}
              recordTypes={VENDOR_FINANCE_TYPES}
              showRecordNo
              showRecordDate
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
        <h3 className="mb-3 text-sm font-semibold text-slate-200">License 生命周期</h3>
        <form
          className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-white/10 p-3"
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

function FinanceRecordSummary({ item }: { item: EntityItem }) {
  const type = item.recordType as string;
  const isVendor = (VENDOR_FINANCE_TYPES as readonly string[]).includes(type);
  return (
    <span>
      {financeTypeLabel(type)}
      {item.recordNo ? ` · ${item.recordNo as string}` : ""}
      {" · "}
      {formatCurrency(item.amount as number, item.currency as string)}
      {isVendor && item.recordDate ? ` · 日期 ${formatDate(item.recordDate as string)}` : ""}
      {!isVendor && item.dueDate ? ` · 到期 ${formatDate(item.dueDate as string)}` : ""}
      {" · "}
      {item.status as string}
      {item.notes ? ` · ${item.notes as string}` : ""}
    </span>
  );
}

function FinanceRecordForm({
  opportunityId,
  currency,
  recordTypes,
  defaultType,
  showRecordNo,
  showRecordDate,
  onCreated,
}: {
  opportunityId: string;
  currency: string;
  recordTypes: readonly string[];
  defaultType: string;
  showRecordNo?: boolean;
  showRecordDate?: boolean;
  onCreated: () => void;
}) {
  return (
    <form
      className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-white/10 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        await fetch("/api/finance-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            opportunityId,
            recordType: fd.get("recordType"),
            recordNo: fd.get("recordNo") || null,
            amount: fd.get("amount") || null,
            currency: fd.get("currency") || currency,
            recordDate: fd.get("recordDate") || null,
            dueDate: fd.get("dueDate") || null,
            status: fd.get("status"),
            notes: fd.get("notes") || null,
          }),
        });
        e.currentTarget.reset();
        onCreated();
      }}
    >
      <FieldSelect name="recordType" label="类型" options={recordTypes} defaultValue={defaultType} labelMap={FINANCE_TYPE_LABELS} />
      {showRecordNo && <FieldInput name="recordNo" label="单号/发票号" />}
      <FieldInput name="amount" label="金额" type="number" step="0.01" />
      <FieldSelect name="currency" label="货币" options={CURRENCIES} defaultValue={currency} />
      {showRecordDate && <FieldInput name="recordDate" label="开票/付款日" type="date" />}
      {!showRecordDate && <FieldInput name="dueDate" label="到期日" type="date" />}
      <FieldSelect name="status" label="状态" options={FINANCE_STATUSES} />
      <FieldInput name="notes" label="备注" />
      <Button type="submit" variant="secondary"><Plus className="h-4 w-4" />添加</Button>
    </form>
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
  recordTypes,
  showRecordNo,
  showRecordDate,
  onSave,
  onCancel,
}: {
  item: EntityItem;
  defaultCurrency: string;
  recordTypes: readonly string[];
  showRecordNo?: boolean;
  showRecordDate?: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const isVendor = (VENDOR_FINANCE_TYPES as readonly string[]).includes(item.recordType as string);
  const [form, setForm] = useState({
    recordType: (item.recordType as string) || recordTypes[0],
    recordNo: (item.recordNo as string) || "",
    amount: item.amount != null ? String(item.amount) : "",
    currency: (item.currency as string) || defaultCurrency,
    recordDate: dateInputValue(item.recordDate),
    dueDate: dateInputValue(item.dueDate),
    status: (item.status as string) || FINANCE_STATUSES[0],
    notes: (item.notes as string) || "",
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="form-field">
        <label className="mb-1 block text-xs text-slate-500">类型</label>
        <Select value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value })}>
          {recordTypes.map((o) => (
            <option key={o} value={o}>{financeTypeLabel(o)}</option>
          ))}
        </Select>
      </div>
      {(showRecordNo || isVendor) && (
        <div className="form-field">
          <label className="mb-1 block text-xs text-slate-500">单号/发票号</label>
          <Input value={form.recordNo} onChange={(e) => setForm({ ...form, recordNo: e.target.value })} />
        </div>
      )}
      <div className="form-field">
        <label className="mb-1 block text-xs text-slate-500">金额</label>
        <Input type="number" step="0.01" min="0" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
      </div>
      <div className="form-field">
        <label className="mb-1 block text-xs text-slate-500">货币</label>
        <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
          {CURRENCIES.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      </div>
      {(showRecordDate || isVendor) ? (
        <div className="form-field">
          <label className="mb-1 block text-xs text-slate-500">开票/付款日</label>
          <Input type="date" value={form.recordDate} onChange={(e) => setForm({ ...form, recordDate: e.target.value })} />
        </div>
      ) : (
        <div className="form-field">
          <label className="mb-1 block text-xs text-slate-500">到期日</label>
          <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>
      )}
      <div className="form-field">
        <label className="mb-1 block text-xs text-slate-500">状态</label>
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {FINANCE_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      </div>
      <div className="form-field form-field-wide">
        <label className="mb-1 block text-xs text-slate-500">备注</label>
        <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <EditActions
        saving={saving}
        onSave={async () => {
          setSaving(true);
          await onSave({
            recordType: form.recordType,
            recordNo: form.recordNo || null,
            amount: parseAmount(form.amount),
            currency: form.currency,
            recordDate: form.recordDate || null,
            dueDate: form.dueDate || null,
            status: form.status,
            notes: form.notes || null,
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
      <div className="form-field">
        <label className="mb-1 block text-xs text-slate-500">产品线</label>
        <Select value={form.productLine} onChange={(e) => setForm({ ...form, productLine: e.target.value })}>
          {PRODUCT_LINES.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      </div>
      <div className="form-field">
        <label className="mb-1 block text-xs text-slate-500">席位数</label>
        <Input type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
      </div>
      <div className="form-field">
        <label className="mb-1 block text-xs text-slate-500">开始日</label>
        <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
      </div>
      <div className="form-field">
        <label className="mb-1 block text-xs text-slate-500">到期日</label>
        <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
      </div>
      <div className="form-field">
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

function FieldInput({ name, label, type = "text", step, defaultValue }: {
  name: string; label: string; type?: string; step?: string; defaultValue?: string;
}) {
  return (
    <div className="form-field">
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <Input name={name} type={type} step={step} defaultValue={defaultValue} />
    </div>
  );
}

function FieldSelect({
  name,
  label,
  options,
  defaultValue,
  labelMap,
}: {
  name: string;
  label: string;
  options: readonly string[];
  defaultValue?: string;
  labelMap?: Record<string, string>;
}) {
  return (
    <div className="form-field">
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <Select name={name} defaultValue={defaultValue || options[0]}>
        {options.map((o) => (
          <option key={o} value={o}>{labelMap?.[o] || o}</option>
        ))}
      </Select>
    </div>
  );
}
