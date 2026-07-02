"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useConfigOptions } from "@/components/customers/use-config-options";
import { useUserPicklist } from "@/components/customers/use-user-picklist";
import { userDisplayName } from "@/lib/user-display";

export function CustomerForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const { regions, industries, loading: configLoading } = useConfigOptions();
  const { salesOwners, techOwners, loading: usersLoading } = useUserPicklist();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSalesUser, setIsSalesUser] = useState(false);
  const [form, setForm] = useState({
    accountName: "",
    englishName: "",
    region: "",
    industry: "",
    description: "",
    ownerUserId: "",
    aeUserId: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const role = data?.user?.role;
        const userId = data?.user?.id;
        if (role === "sales" && userId) {
          setIsSalesUser(true);
          setForm((f) => ({ ...f, ownerUserId: userId }));
        } else {
          setIsSalesUser(false);
        }
      });
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const customer = await res.json();
      setOpen(false);
      onCreated?.();
      router.push(`/customers/${customer.id}`);
    }
  }

  const picklistLoading = configLoading || usersLoading;

  if (!open) {
    return <Button onClick={() => setOpen(true)}>新建客户</Button>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">新建客户</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">客户名称 *</label>
          <Input required value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">英文名</label>
          <Input value={form.englishName} onChange={(e) => setForm({ ...form, englishName: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">区域</label>
          <Select disabled={picklistLoading} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
            <option value="">—</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">行业</label>
          <Select disabled={picklistLoading} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
            <option value="">—</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">客户描述</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">销售负责人</label>
          <Select
            disabled={picklistLoading || isSalesUser}
            value={form.ownerUserId}
            onChange={(e) => setForm({ ...form, ownerUserId: e.target.value })}
          >
            <option value="">—</option>
            {salesOwners.map((u) => (
              <option key={u.id} value={u.id}>{userDisplayName(u)}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">技术负责人</label>
          <Select
            disabled={picklistLoading}
            value={form.aeUserId}
            onChange={(e) => setForm({ ...form, aeUserId: e.target.value })}
          >
            <option value="">—</option>
            {techOwners.map((u) => (
              <option key={u.id} value={u.id}>{userDisplayName(u)}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>取消</Button>
      </div>
    </form>
  );
}
