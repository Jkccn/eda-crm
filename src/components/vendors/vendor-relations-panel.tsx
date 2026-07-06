"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { VENDOR_OCCASIONS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

type Relation = {
  id: string;
  occasionType: string;
  eventDate: string;
  giftDescription: string | null;
  amount: number | null;
  currency: string;
  notes: string | null;
};

const emptyForm = {
  occasionType: VENDOR_OCCASIONS[0] as string,
  eventDate: "",
  giftDescription: "",
  amount: "",
  currency: "CNY",
  notes: "",
};

export function VendorRelationsPanel({ vendorId }: { vendorId: string }) {
  const [items, setItems] = useState<Relation[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/vendor-relations?vendorId=${vendorId}`);
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, [vendorId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.eventDate) return;
    const url = editId ? `/api/vendor-relations/${editId}` : "/api/vendor-relations";
    const method = editId ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, vendorId }),
    });
    setForm(emptyForm);
    setEditId(null);
    load();
  }

  function startEdit(item: Relation) {
    setEditId(item.id);
    setForm({
      occasionType: item.occasionType,
      eventDate: item.eventDate.slice(0, 10),
      giftDescription: item.giftDescription || "",
      amount: item.amount != null ? String(item.amount) : "",
      currency: item.currency,
      notes: item.notes || "",
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          value={form.occasionType}
          onChange={(e) => setForm({ ...form, occasionType: e.target.value })}
        >
          {VENDOR_OCCASIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Select>
        <Input
          type="date"
          required
          value={form.eventDate}
          onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
        />
        <Input
          placeholder="礼品/维护内容"
          value={form.giftDescription}
          onChange={(e) => setForm({ ...form, giftDescription: e.target.value })}
        />
        <Input
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="金额"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <Input
          placeholder="备注"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="sm:col-span-2"
        />
        <div className="flex gap-2">
          <Button type="submit">
            <Plus className="h-4 w-4" />
            {editId ? "保存" : "添加记录"}
          </Button>
          {editId && (
            <Button type="button" variant="ghost" onClick={() => { setEditId(null); setForm(emptyForm); }}>
              取消
            </Button>
          )}
        </div>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">暂无关系维护记录</p>
      ) : (
        <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
          {items.map((item) => (
            <li key={item.id} className="hover-row flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-100">
                  {item.occasionType} · {formatDate(item.eventDate)}
                </p>
                {item.giftDescription && <p className="mt-1 text-slate-400">{item.giftDescription}</p>}
                {item.amount != null && (
                  <p className="text-slate-500">{formatCurrency(item.amount, item.currency)}</p>
                )}
                {item.notes && <p className="text-xs text-slate-500">{item.notes}</p>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" className="!px-2" onClick={() => startEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="!px-2 text-red-400 hover:bg-rose-500/25"
                  onClick={async () => {
                    if (!confirm("确定删除？")) return;
                    await fetch(`/api/vendor-relations/${item.id}`, { method: "DELETE" });
                    load();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
