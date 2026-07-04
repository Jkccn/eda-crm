"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ADDRESS_TYPES } from "@/lib/constants";

type Address = {
  id: string;
  addressType: string;
  label: string | null;
  addressLine: string;
  notes: string | null;
};

const emptyForm = {
  addressType: "official",
  label: "",
  addressLine: "",
  notes: "",
};

export function AddressesPanel({ customerId }: { customerId: string }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/customer-addresses?customerId=${customerId}`);
    if (res.ok) setAddresses(await res.json());
  }

  useEffect(() => {
    load();
  }, [customerId]);

  function typeLabel(key: string) {
    return ADDRESS_TYPES.find((t) => t.key === key)?.label || key;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.addressLine.trim()) return;
    const url = editId ? `/api/customer-addresses/${editId}` : "/api/customer-addresses";
    const method = editId ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, ...form }),
    });
    setForm(emptyForm);
    setEditId(null);
    load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-2">
        <Select
          value={form.addressType}
          onChange={(e) => setForm({ ...form, addressType: e.target.value })}
        >
          {ADDRESS_TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </Select>
        <Input
          placeholder="标签（可选）"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
        <Input
          required
          className="sm:col-span-2"
          placeholder="详细地址（含城市、省/州、邮编、国家等）*"
          value={form.addressLine}
          onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
        />
        <div className="sm:col-span-2 flex gap-2">
          <Button type="submit" variant="secondary">
            <Plus className="h-4 w-4" />
            {editId ? "更新地址" : "添加地址"}
          </Button>
          {editId && (
            <Button type="button" variant="ghost" onClick={() => { setEditId(null); setForm(emptyForm); }}>
              取消
            </Button>
          )}
        </div>
      </form>

      {addresses.length === 0 ? (
        <p className="text-sm text-slate-400">暂无地址</p>
      ) : (
        <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
          {addresses.map((a) => (
            <li key={a.id} className="hover-row flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-100">
                  {typeLabel(a.addressType)}
                  {a.label && <span className="ml-2 text-slate-400">({a.label})</span>}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-400">{a.addressLine}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  className="!px-2"
                  onClick={() => {
                    setEditId(a.id);
                    setForm({
                      addressType: a.addressType,
                      label: a.label || "",
                      addressLine: a.addressLine,
                      notes: a.notes || "",
                    });
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="!px-2 text-red-400 hover:bg-rose-500/25 hover:text-red-300"
                  onClick={async () => {
                    if (!confirm("确定删除？")) return;
                    await fetch(`/api/customer-addresses/${a.id}`, { method: "DELETE" });
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
