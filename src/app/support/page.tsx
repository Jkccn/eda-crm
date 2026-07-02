"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type Case = {
  id: string;
  title: string;
  customerIssue: string | null;
  solution: string | null;
  status: string;
  priority: string;
  openedAt: string;
  assignedUserId: string | null;
  assignedUser: { id: string; displayName: string | null; username: string } | null;
  customer: { id: string; accountName: string };
  opportunity: { id: string; name: string } | null;
};

const emptyForm = {
  customerId: "",
  title: "",
  customerIssue: "",
  solution: "",
  priority: "Normal",
  status: "Open",
};

export default function SupportPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [customers, setCustomers] = useState<{ id: string; accountName: string }[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [isEngineerOnly, setIsEngineerOnly] = useState(false);

  const load = useCallback(async () => {
    const [casesRes, custRes, meRes] = await Promise.all([
      fetch("/api/support-cases"),
      fetch("/api/customers?picklist=1"),
      fetch("/api/auth/me"),
    ]);
    const casesData = casesRes.ok ? await casesRes.json() : [];
    const custData = custRes.ok ? await custRes.json() : [];
    const meData = meRes.ok ? await meRes.json() : null;
    setCases(Array.isArray(casesData) ? casesData : []);
    setCustomers(Array.isArray(custData) ? custData : []);
    if (meData?.user) {
      setCurrentUserId(meData.user.id);
      setIsManager(meData.user.role === "admin" || meData.user.role === "manager");
      setIsEngineerOnly(meData.user.role === "engineer");
    }
    return Array.isArray(custData) ? custData : [];
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openCreateAsync() {
    setEditId(null);
    setShowCreate(true);
    setError("");
    const custList = customers.length ? customers : await load();
    setForm({
      ...emptyForm,
      customerId: custList[0]?.id || "",
    });
  }

  function startEdit(c: Case) {
    setEditId(c.id);
    setShowCreate(false);
    setError("");
    setForm({
      customerId: c.customer.id,
      title: c.title,
      customerIssue: c.customerIssue || "",
      solution: c.solution || "",
      priority: c.priority,
      status: c.status,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.customerIssue.trim()) {
      setError("标题与客户问题必填");
      return;
    }
    if (!editId && !form.customerId) {
      setError("请选择客户");
      return;
    }

    setSaving(true);
    const res = editId
      ? await fetch(`/api/support-cases/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            customerIssue: form.customerIssue,
            solution: form.solution || null,
            priority: form.priority,
            status: form.status,
          }),
        })
      : await fetch("/api/support-cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: form.customerId,
            title: form.title,
            customerIssue: form.customerIssue,
            solution: form.solution || null,
            priority: form.priority,
          }),
        });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error || "保存失败");
      return;
    }

    setEditId(null);
    setShowCreate(false);
    setForm(emptyForm);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">技术支持</h1>
          <p className="mt-1 text-sm text-slate-500">工单管理 · 客户问题 · 解决方案</p>
        </div>
        {!showCreate && !editId && (
          <Button onClick={openCreateAsync}>
            <Plus className="h-4 w-4" />新建工单
          </Button>
        )}
      </div>

      {(showCreate || editId) && (
        <Card>
          <CardBody>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <p className="text-sm font-medium text-slate-800">
                {editId ? "编辑工单" : "新建工单"}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {!editId && (
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">客户 *</label>
                    <Select
                      required
                      value={form.customerId}
                      onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    >
                      <option value="">请选择客户</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.accountName}</option>
                      ))}
                    </Select>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs text-slate-500">优先级</label>
                  <Select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    {SUPPORT_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>
                {editId && (
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">状态</label>
                    <Select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      {SUPPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">标题 *</label>
                  <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">客户问题 *</label>
                  <textarea
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={3}
                    value={form.customerIssue}
                    onChange={(e) => setForm({ ...form, customerIssue: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">解决方案</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={3}
                    value={form.solution}
                    onChange={(e) => setForm({ ...form, solution: e.target.value })}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  <Check className="h-4 w-4" />
                  {saving ? "保存中…" : editId ? "保存" : "创建"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setEditId(null); setShowCreate(false); setError(""); }}
                >
                  <X className="h-4 w-4" />取消
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {cases.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-sm text-slate-400">暂无工单</CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => {
            const canEdit = isManager || c.assignedUserId === currentUserId;
            return (
            <Card key={c.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{c.title}</h2>
                      <Badge>{c.status}</Badge>
                      <span className="text-xs text-slate-400">{c.priority}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {isEngineerOnly ? (
                        <span>{c.customer.accountName}</span>
                      ) : (
                        <Link href={`/customers/${c.customer.id}`} className="hover:text-indigo-600">
                          {c.customer.accountName}
                        </Link>
                      )}
                      {c.opportunity && (
                        <> · <Link href={`/opportunities/${c.opportunity.id}`} className="hover:text-indigo-600">{c.opportunity.name}</Link></>
                      )}
                      {" · "}{formatDate(c.openedAt)}
                      {c.assignedUser && (
                        <> · 负责人：{c.assignedUser.displayName || c.assignedUser.username}</>
                      )}
                    </p>
                    {c.customerIssue && (
                      <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        <p className="text-xs font-medium text-amber-700">客户问题</p>
                        <p className="mt-1 whitespace-pre-wrap">{c.customerIssue}</p>
                      </div>
                    )}
                    {c.solution && (
                      <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                        <p className="text-xs font-medium text-emerald-700">解决方案</p>
                        <p className="mt-1 whitespace-pre-wrap">{c.solution}</p>
                      </div>
                    )}
                  </div>
                  {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" className="!px-2" onClick={() => startEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="!px-2 text-red-600"
                      onClick={async () => {
                        if (!confirm("确定删除？")) return;
                        await fetch(`/api/support-cases/${c.id}`, { method: "DELETE" });
                        load();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  )}
                </div>
              </CardBody>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
