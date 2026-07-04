"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  CONTRACT_STATUSES,
  CONTRACT_TYPES,
  CURRENCIES,
  EXECUTION_STATUSES,
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  EditableRecordList,
  EditActions,
  EntityItem,
  patchJson,
} from "@/components/opportunities/editable-record-list";

type Vendor = { id: string; name: string };

export function ExecutionPanel({ opportunityId }: { opportunityId: string }) {
  const [contracts, setContracts] = useState<EntityItem[]>([]);
  const [bookings, setBookings] = useState<EntityItem[]>([]);
  const [deliveries, setDeliveries] = useState<EntityItem[]>([]);
  const [acceptances, setAcceptances] = useState<EntityItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  async function load() {
    const [c, b, d, a, v] = await Promise.all([
      fetch(`/api/contracts?opportunityId=${opportunityId}`).then((r) => r.json()),
      fetch(`/api/vendor-bookings?opportunityId=${opportunityId}`).then((r) => r.json()),
      fetch(`/api/deliveries?opportunityId=${opportunityId}`).then((r) => r.json()),
      fetch(`/api/acceptances?opportunityId=${opportunityId}`).then((r) => r.json()),
      fetch("/api/vendors").then((r) => r.json()),
    ]);
    setContracts(Array.isArray(c) ? c : []);
    setBookings(Array.isArray(b) ? b : []);
    setDeliveries(Array.isArray(d) ? d : []);
    setAcceptances(Array.isArray(a) ? a : []);
    setVendors(Array.isArray(v) ? v : []);
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
      <Section title="合同 / PO">
        <MiniForm
          onSubmit={async (f) => {
            await fetch("/api/contracts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ opportunityId, ...f }),
            });
            load();
          }}
          fields={[
            { key: "contractNo", label: "编号", placeholder: "HT-2026-001" },
            { key: "amount", label: "金额", type: "number" },
          ]}
          selects={[
            { key: "contractType", label: "类型", options: CONTRACT_TYPES },
            { key: "status", label: "状态", options: CONTRACT_STATUSES },
            { key: "currency", label: "货币", options: CURRENCIES },
          ]}
        />
        <EditableRecordList
          items={contracts}
          renderSummary={(item) => (
            <span>
              {(item.contractNo as string) || "—"} · {item.contractType as string} ·{" "}
              {formatCurrency(item.amount as number, item.currency as string)} · {item.status as string}
            </span>
          )}
          renderEditForm={(item, { onSave, onCancel }) => (
            <ContractEditForm
              item={item}
              onSave={async (body) => {
                if (await patchJson(`/api/contracts/${item.id}`, body)) {
                  await load();
                  onSave();
                }
              }}
              onCancel={onCancel}
            />
          )}
          onDelete={(id) => del(`/api/contracts/${id}`)}
        />
      </Section>

      <Section title="原厂下单">
        <MiniForm
          onSubmit={async (f) => {
            await fetch("/api/vendor-bookings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ opportunityId, ...f }),
            });
            load();
          }}
          fields={[
            { key: "bookingNo", label: "下单号" },
            { key: "amount", label: "金额", type: "number" },
            { key: "orderDate", label: "下单日", type: "date" },
          ]}
          selects={[
            {
              key: "vendorId",
              label: "供应商",
              options: vendors.map((v) => v.id),
              labels: Object.fromEntries(vendors.map((v) => [v.id, v.name])),
            },
            { key: "status", label: "状态", options: EXECUTION_STATUSES },
            { key: "currency", label: "货币", options: CURRENCIES },
          ]}
        />
        <EditableRecordList
          items={bookings}
          renderSummary={(item) => (
            <span>
              {(item.bookingNo as string) || "—"} ·{" "}
              {(item.vendor as { name?: string })?.name || "未指定供应商"} ·{" "}
              {formatCurrency(item.amount as number, item.currency as string)} · {item.status as string}
            </span>
          )}
          renderEditForm={(item, { onSave, onCancel }) => (
            <BookingEditForm
              item={item}
              vendors={vendors}
              onSave={async (body) => {
                if (await patchJson(`/api/vendor-bookings/${item.id}`, body)) {
                  await load();
                  onSave();
                }
              }}
              onCancel={onCancel}
            />
          )}
          onDelete={(id) => del(`/api/vendor-bookings/${id}`)}
        />
      </Section>

      <Section title="交付记录">
        <MiniForm
          onSubmit={async (f) => {
            await fetch("/api/deliveries", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ opportunityId, ...f }),
            });
            load();
          }}
          fields={[
            { key: "deliveryNo", label: "交付单号" },
            { key: "deliveredAt", label: "交付日", type: "date" },
          ]}
          selects={[{ key: "status", label: "状态", options: EXECUTION_STATUSES }]}
        />
        <EditableRecordList
          items={deliveries}
          renderSummary={(item) => (
            <span>
              {(item.deliveryNo as string) || "—"} · {formatDate(item.deliveredAt as string)} ·{" "}
              {item.status as string}
            </span>
          )}
          renderEditForm={(item, { onSave, onCancel }) => (
            <DeliveryEditForm
              item={item}
              onSave={async (body) => {
                if (await patchJson(`/api/deliveries/${item.id}`, body)) {
                  await load();
                  onSave();
                }
              }}
              onCancel={onCancel}
            />
          )}
          onDelete={(id) => del(`/api/deliveries/${id}`)}
        />
      </Section>

      <Section title="验收记录">
        <MiniForm
          onSubmit={async (f) => {
            await fetch("/api/acceptances", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ opportunityId, ...f }),
            });
            load();
          }}
          fields={[{ key: "acceptedAt", label: "验收日", type: "date" }]}
          selects={[{ key: "status", label: "状态", options: EXECUTION_STATUSES }]}
        />
        <EditableRecordList
          items={acceptances}
          renderSummary={(item) => (
            <span>
              {formatDate(item.acceptedAt as string)} · {item.status as string}
            </span>
          )}
          renderEditForm={(item, { onSave, onCancel }) => (
            <AcceptanceEditForm
              item={item}
              onSave={async (body) => {
                if (await patchJson(`/api/acceptances/${item.id}`, body)) {
                  await load();
                  onSave();
                }
              }}
              onCancel={onCancel}
            />
          )}
          onDelete={(id) => del(`/api/acceptances/${id}`)}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-200">{title}</h3>
      {children}
    </div>
  );
}

function MiniForm({
  onSubmit,
  fields,
  selects = [],
}: {
  onSubmit: (data: Record<string, string>) => Promise<void>;
  fields: { key: string; label: string; type?: string; placeholder?: string }[];
  selects?: {
    key: string;
    label: string;
    options: readonly string[];
    labels?: Record<string, string>;
  }[];
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-white/10 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        await onSubmit(form);
        setForm({});
        setLoading(false);
      }}
    >
      {fields.map((f) => (
        <div key={f.key} className="min-w-[120px]">
          <label className="mb-1 block text-xs text-slate-500">{f.label}</label>
          <Input
            type={f.type || "text"}
            placeholder={f.placeholder}
            value={form[f.key] || ""}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
          />
        </div>
      ))}
      {selects.map((s) => (
        <div key={s.key} className="min-w-[120px]">
          <label className="mb-1 block text-xs text-slate-500">{s.label}</label>
          <Select
            value={form[s.key] || s.options[0] || ""}
            onChange={(e) => setForm({ ...form, [s.key]: e.target.value })}
          >
            {s.options.map((o) => (
              <option key={o} value={o}>{s.labels?.[o] || o}</option>
            ))}
          </Select>
        </div>
      ))}
      <Button type="submit" variant="secondary" disabled={loading}>
        <Plus className="h-4 w-4" />
        添加
      </Button>
    </form>
  );
}

function dateInputValue(v: unknown) {
  if (!v) return "";
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function ContractEditForm({
  item,
  onSave,
  onCancel,
}: {
  item: EntityItem;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    contractNo: (item.contractNo as string) || "",
    contractType: (item.contractType as string) || CONTRACT_TYPES[0],
    amount: item.amount != null ? String(item.amount) : "",
    currency: (item.currency as string) || "CNY",
    status: (item.status as string) || CONTRACT_STATUSES[0],
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="编号" value={form.contractNo} onChange={(v) => setForm({ ...form, contractNo: v })} />
      <SelectField label="类型" value={form.contractType} options={CONTRACT_TYPES} onChange={(v) => setForm({ ...form, contractType: v })} />
      <Field label="金额" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
      <SelectField label="货币" value={form.currency} options={CURRENCIES} onChange={(v) => setForm({ ...form, currency: v })} />
      <SelectField label="状态" value={form.status} options={CONTRACT_STATUSES} onChange={(v) => setForm({ ...form, status: v })} />
      <EditActions
        saving={saving}
        onSave={async () => {
          setSaving(true);
          await onSave({
            contractNo: form.contractNo || null,
            contractType: form.contractType,
            amount: form.amount ? Number(form.amount) : null,
            currency: form.currency,
            status: form.status,
          });
          setSaving(false);
        }}
        onCancel={onCancel}
      />
    </div>
  );
}

function BookingEditForm({
  item,
  vendors,
  onSave,
  onCancel,
}: {
  item: EntityItem;
  vendors: Vendor[];
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const vendorId = (item.vendor as { id?: string })?.id || (item.vendorId as string) || "";
  const [form, setForm] = useState({
    bookingNo: (item.bookingNo as string) || "",
    vendorId,
    amount: item.amount != null ? String(item.amount) : "",
    currency: (item.currency as string) || "CNY",
    orderDate: dateInputValue(item.orderDate),
    status: (item.status as string) || EXECUTION_STATUSES[0],
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="下单号" value={form.bookingNo} onChange={(v) => setForm({ ...form, bookingNo: v })} />
      <div className="min-w-[120px]">
        <label className="mb-1 block text-xs text-slate-500">供应商</label>
        <Select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
          <option value="">未指定</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
      </div>
      <Field label="金额" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
      <SelectField label="货币" value={form.currency} options={CURRENCIES} onChange={(v) => setForm({ ...form, currency: v })} />
      <Field label="下单日" type="date" value={form.orderDate} onChange={(v) => setForm({ ...form, orderDate: v })} />
      <SelectField label="状态" value={form.status} options={EXECUTION_STATUSES} onChange={(v) => setForm({ ...form, status: v })} />
      <EditActions
        saving={saving}
        onSave={async () => {
          setSaving(true);
          await onSave({
            bookingNo: form.bookingNo || null,
            vendorId: form.vendorId || null,
            amount: form.amount ? Number(form.amount) : null,
            currency: form.currency,
            orderDate: form.orderDate || null,
            status: form.status,
          });
          setSaving(false);
        }}
        onCancel={onCancel}
      />
    </div>
  );
}

function DeliveryEditForm({
  item,
  onSave,
  onCancel,
}: {
  item: EntityItem;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    deliveryNo: (item.deliveryNo as string) || "",
    deliveredAt: dateInputValue(item.deliveredAt),
    status: (item.status as string) || EXECUTION_STATUSES[0],
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="交付单号" value={form.deliveryNo} onChange={(v) => setForm({ ...form, deliveryNo: v })} />
      <Field label="交付日" type="date" value={form.deliveredAt} onChange={(v) => setForm({ ...form, deliveredAt: v })} />
      <SelectField label="状态" value={form.status} options={EXECUTION_STATUSES} onChange={(v) => setForm({ ...form, status: v })} />
      <EditActions
        saving={saving}
        onSave={async () => {
          setSaving(true);
          await onSave({
            deliveryNo: form.deliveryNo || null,
            deliveredAt: form.deliveredAt || null,
            status: form.status,
          });
          setSaving(false);
        }}
        onCancel={onCancel}
      />
    </div>
  );
}

function AcceptanceEditForm({
  item,
  onSave,
  onCancel,
}: {
  item: EntityItem;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    acceptedAt: dateInputValue(item.acceptedAt),
    status: (item.status as string) || EXECUTION_STATUSES[0],
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="验收日" type="date" value={form.acceptedAt} onChange={(v) => setForm({ ...form, acceptedAt: v })} />
      <SelectField label="状态" value={form.status} options={EXECUTION_STATUSES} onChange={(v) => setForm({ ...form, status: v })} />
      <EditActions
        saving={saving}
        onSave={async () => {
          setSaving(true);
          await onSave({
            acceptedAt: form.acceptedAt || null,
            status: form.status,
          });
          setSaving(false);
        }}
        onCancel={onCancel}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="min-w-[120px]">
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="min-w-[120px]">
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </Select>
    </div>
  );
}
