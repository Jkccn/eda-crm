"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Contact = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
};

const emptyForm = { name: "", title: "", email: "", phone: "", isPrimary: false };

export function VendorContactsPanel({ vendorId }: { vendorId: string }) {
  const [items, setItems] = useState<Contact[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/vendor-contacts?vendorId=${vendorId}`);
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, [vendorId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const url = editId ? `/api/vendor-contacts/${editId}` : "/api/vendor-contacts";
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

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input required placeholder="姓名 *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="职位" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="邮箱" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="电话" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Button type="submit">
          <Plus className="h-4 w-4" />
          {editId ? "保存" : "添加"}
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">暂无联系人</p>
      ) : (
        <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
          {items.map((c) => (
            <li key={c.id} className="hover-row flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-100">
                  {c.name}
                  {c.isPrimary && <span className="ml-2 text-xs text-cyan-400">主联系人</span>}
                </p>
                <p className="text-slate-500">
                  {[c.title, c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  className="!px-2"
                  onClick={() => {
                    setEditId(c.id);
                    setForm({
                      name: c.name,
                      title: c.title || "",
                      email: c.email || "",
                      phone: c.phone || "",
                      isPrimary: c.isPrimary,
                    });
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="!px-2 text-red-400 hover:bg-rose-500/25"
                  onClick={async () => {
                    if (!confirm("确定删除？")) return;
                    await fetch(`/api/vendor-contacts/${c.id}`, { method: "DELETE" });
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
