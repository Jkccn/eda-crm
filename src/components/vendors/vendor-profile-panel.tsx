"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type VendorData = {
  id: string;
  name: string;
  productLines: string | null;
  contactInfo: string | null;
  notes: string | null;
};

export function VendorProfilePanel({ initial }: { initial: VendorData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(initial);
  const [form, setForm] = useState({
    name: initial.name,
    productLines: initial.productLines || "",
    contactInfo: initial.contactInfo || "",
    notes: initial.notes || "",
  });

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/vendors/${data.id}`, {
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
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{data.name}</h1>
          {data.productLines && <p className="mt-1 text-sm text-slate-500">产品线：{data.productLines}</p>}
          {data.contactInfo && <p className="text-sm text-slate-500">{data.contactInfo}</p>}
          {data.notes && <p className="mt-2 text-sm text-slate-400">{data.notes}</p>}
        </div>
        <Button variant="ghost" className="!px-2" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="form-panel space-y-4 rounded-xl p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="供应商名称" />
        <Input value={form.productLines} onChange={(e) => setForm({ ...form, productLines: e.target.value })} placeholder="产品线" />
        <Input value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} placeholder="总机/官网等" />
        <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="备注" />
      </div>
      <div className="flex gap-2">
        <Button disabled={saving} onClick={handleSave}>
          <Check className="h-4 w-4" />
          {saving ? "保存中…" : "保存"}
        </Button>
        <Button variant="ghost" onClick={() => setEditing(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
