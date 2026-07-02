"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";

type Vendor = {
  id: string;
  name: string;
  productLines: string | null;
  contactInfo: string | null;
  notes: string | null;
};

const emptyForm = { name: "", productLines: "", contactInfo: "", notes: "" };

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    const res = await fetch("/api/vendors");
    if (res.ok) setVendors(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const url = editId ? `/api/vendors/${editId}` : "/api/vendors";
    const method = editId ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    setEditId(null);
    setShowCreate(false);
    load();
  }

  function startEdit(v: Vendor) {
    setEditId(v.id);
    setShowCreate(false);
    setForm({
      name: v.name,
      productLines: v.productLines || "",
      contactInfo: v.contactInfo || "",
      notes: v.notes || "",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">供应商</h1>
          <p className="mt-1 text-sm text-slate-500">管理原厂与供应商信息</p>
        </div>
        {!showCreate && !editId && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />添加供应商
          </Button>
        )}
      </div>

      {(showCreate || editId) && (
        <Card>
          <CardBody>
            <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={handleSubmit}>
              <Input required placeholder="供应商名称 *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="产品线" value={form.productLines} onChange={(e) => setForm({ ...form, productLines: e.target.value })} />
              <Input placeholder="联系方式" value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} />
              <Input placeholder="备注" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="flex gap-2">
                <Button type="submit">
                  <Check className="h-4 w-4" />
                  {editId ? "保存" : "添加"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setEditId(null); setShowCreate(false); setForm(emptyForm); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {vendors.map((v) => (
          <Card key={v.id}>
            <CardBody className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">{v.name}</h2>
                {v.productLines && <p className="mt-1 text-sm text-slate-500">{v.productLines}</p>}
                {v.contactInfo && <p className="text-sm text-slate-500">{v.contactInfo}</p>}
                {v.notes && <p className="mt-1 text-xs text-slate-400">{v.notes}</p>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" className="!px-2" onClick={() => startEdit(v)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="!px-2 text-red-600"
                  onClick={async () => {
                    if (!confirm("确定删除？")) return;
                    await fetch(`/api/vendors/${v.id}`, { method: "DELETE" });
                    load();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
