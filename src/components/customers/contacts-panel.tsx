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
};

export function ContactsPanel({ customerId }: { customerId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState({ name: "", title: "", email: "", phone: "" });
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/contacts?customerId=${customerId}`);
    if (res.ok) setContacts(await res.json());
  }

  useEffect(() => {
    load();
  }, [customerId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const url = editId ? `/api/contacts/${editId}` : "/api/contacts";
    const method = editId ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, ...form }),
    });
    setForm({ name: "", title: "", email: "", phone: "" });
    setEditId(null);
    load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          required
          placeholder="姓名 *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          placeholder="职位"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Input
          placeholder="邮箱"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          placeholder="电话"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Button type="submit" variant="secondary">
          <Plus className="h-4 w-4" />
          {editId ? "更新" : "添加联系人"}
        </Button>
      </form>

      {contacts.length === 0 ? (
        <p className="text-sm text-slate-400">暂无联系人</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{c.name}</p>
                <p className="text-slate-500">
                  {c.title} · {c.email || c.phone || "—"}
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
                    });
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="!px-2 text-red-600"
                  onClick={async () => {
                    if (!confirm("确定删除？")) return;
                    await fetch(`/api/contacts/${c.id}`, { method: "DELETE" });
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
