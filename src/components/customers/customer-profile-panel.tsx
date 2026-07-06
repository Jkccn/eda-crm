"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useConfigOptions } from "@/components/customers/use-config-options";
import { useUserPicklist } from "@/components/customers/use-user-picklist";
import { userDisplayName } from "@/lib/user-display";

type CustomerData = {
  id: string;
  accountName: string;
  englishName: string | null;
  region: string | null;
  industry: string | null;
  description: string | null;
  ownerName: string | null;
  aeName: string | null;
  ownerUserId: string | null;
  notes: string | null;
};

function matchUserIdByName(
  name: string | null,
  users: { id: string; displayName: string | null; username: string }[],
) {
  if (!name) return "";
  const match = users.find((u) => userDisplayName(u) === name || u.username === name);
  return match?.id || "";
}

export function CustomerProfilePanel({ initial }: { initial: CustomerData }) {
  const router = useRouter();
  const { regions, industries, loading: configLoading } = useConfigOptions();
  const { salesOwners, techOwners, loading: usersLoading } = useUserPicklist();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSalesUser, setIsSalesUser] = useState(false);
  const [data, setData] = useState(initial);
  const [form, setForm] = useState({
    accountName: initial.accountName,
    englishName: initial.englishName || "",
    region: initial.region || "",
    industry: initial.industry || "",
    description: initial.description || "",
    ownerUserId: initial.ownerUserId || "",
    aeUserId: "",
    notes: initial.notes || "",
  });

  useEffect(() => {
    if (!techOwners.length && !salesOwners.length) return;
    setForm((f) => ({
      ...f,
      ownerUserId: initial.ownerUserId || matchUserIdByName(initial.ownerName, salesOwners),
      aeUserId: matchUserIdByName(initial.aeName, techOwners),
    }));
  }, [initial.ownerUserId, initial.ownerName, initial.aeName, salesOwners, techOwners]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => setIsSalesUser(me?.user?.role === "sales"));
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/customers/${data.id}`, {
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

  const picklistLoading = configLoading || usersLoading;

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-100">{data.accountName}</h1>
          {data.englishName && (
            <p className="text-sm text-slate-500">{data.englishName}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
            {data.region && <span>区域 {data.region}</span>}
            {data.industry && <span>行业 {data.industry}</span>}
            {data.ownerName && <span>销售 {data.ownerName}</span>}
            {data.aeName && <span>技术 {data.aeName}</span>}
          </div>
          {data.description && (
            <p className="mt-3 max-w-2xl text-sm text-slate-300 whitespace-pre-wrap">{data.description}</p>
          )}
          {data.notes && (
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{data.notes}</p>
          )}
        </div>
        <Button variant="ghost" className="!px-2" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="form-panel space-y-4 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-400">编辑客户信息</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">客户名称</label>
          <Input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">英文名</label>
          <Input value={form.englishName} onChange={(e) => setForm({ ...form, englishName: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">区域</label>
          <Select
            value={form.region}
            disabled={picklistLoading}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          >
            <option value="">—</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">行业</label>
          <Select
            value={form.industry}
            disabled={picklistLoading}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
          >
            <option value="">—</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">销售负责人</label>
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
          <label className="mb-1 block text-xs text-slate-500">技术负责人</label>
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
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-slate-500">客户描述</label>
          <textarea
            className="input-dark w-full rounded-lg px-3 py-2 text-sm"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-slate-500">备注</label>
          <textarea
            className="input-dark w-full rounded-lg px-3 py-2 text-sm"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" disabled={saving} onClick={handleSave}>
          <Check className="h-4 w-4" />
          {saving ? "保存中…" : "保存"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          <X className="h-4 w-4" />
          取消
        </Button>
      </div>
    </div>
  );
}
