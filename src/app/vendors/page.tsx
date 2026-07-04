"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
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
    await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    setShowCreate(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">供应商</h1>
          <p className="mt-1 text-sm text-slate-500">管理原厂供应商、联系人与关系维护</p>
        </div>
        {!showCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />添加供应商
          </Button>
        )}
      </div>

      {showCreate && (
        <Card>
          <CardBody>
            <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={handleSubmit}>
              <Input required placeholder="供应商名称 *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="产品线" value={form.productLines} onChange={(e) => setForm({ ...form, productLines: e.target.value })} />
              <Input placeholder="联系方式" value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} />
              <Input placeholder="备注" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="flex gap-2">
                <Button type="submit">添加</Button>
                <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); setForm(emptyForm); }}>
                  取消
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {vendors.map((v) => (
          <Link key={v.id} href={`/vendors/${v.id}`}>
            <Card className="hover-lift transition-all duration-200">
              <CardBody className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-slate-100">{v.name}</h2>
                  {v.productLines && <p className="mt-1 text-sm text-slate-500">{v.productLines}</p>}
                  {v.contactInfo && <p className="truncate text-sm text-slate-500">{v.contactInfo}</p>}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
