"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardBody } from "@/components/ui/card";
import { ROLE_LABELS, USER_ROLES } from "@/lib/constants";

type UserRow = {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
  createdAt: string;
};

const emptyForm = {
  username: "",
  password: "",
  displayName: "",
  role: "sales",
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ displayName: "", role: "sales", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  async function load() {
    const res = await fetch("/api/users");
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
      setCurrentUserId(data.currentUserId || "");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error || "创建失败");
      return;
    }
    setShowCreate(false);
    setForm(emptyForm);
    load();
  }

  async function handleEditSave(id: string) {
    setError("");
    setSaving(true);
    const body: Record<string, string> = {
      displayName: editForm.displayName,
      role: editForm.role,
    };
    if (editForm.password) body.password = editForm.password;
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error || "保存失败");
      return;
    }
    setEditId(null);
    load();
  }

  if (forbidden) {
    return (
      <Card>
        <CardBody className="py-12 text-center text-sm text-slate-500">
          需要管理员权限才能访问用户管理
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">用户管理</h1>
          <p className="mt-1 text-sm text-slate-500">创建账号并分配角色与权限</p>
          <Link href="/admin/data" className="mt-1 inline-block text-sm text-indigo-600 hover:underline">
            数据备份与恢复 →
          </Link>
        </div>
        {!showCreate && (
          <Button onClick={() => { setShowCreate(true); setError(""); }}>
            <Plus className="h-4 w-4" />新建用户
          </Button>
        )}
      </div>

      {showCreate && (
        <Card>
          <CardBody>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleCreate}>
              <div>
                <label className="mb-1 block text-xs text-slate-500">用户名 *</label>
                <Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">密码 *</label>
                <Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">显示名称</label>
                <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">角色 *</label>
                <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </Select>
              </div>
              {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={saving}>{saving ? "创建中…" : "创建"}</Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>取消</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-4 py-3">用户名</th>
                <th className="px-4 py-3">显示名称</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3 w-28">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50">
                  {editId === u.id ? (
                    <>
                      <td className="px-4 py-3 font-medium">{u.username}</td>
                      <td className="px-4 py-3">
                        <Input value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} />
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={editForm.role}
                          disabled={u.id === currentUserId}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        >
                          {USER_ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button className="!px-2" disabled={saving} onClick={() => handleEditSave(u.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" className="!px-2" onClick={() => setEditId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-slate-900">{u.username}</td>
                      <td className="px-4 py-3 text-slate-600">{u.displayName || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            className="!px-2"
                            onClick={() => {
                              setEditId(u.id);
                              setEditForm({
                                displayName: u.displayName || "",
                                role: u.role,
                                password: "",
                              });
                              setError("");
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {u.id !== currentUserId && (
                            <Button
                              variant="ghost"
                              className="!px-2 text-red-600"
                              onClick={async () => {
                                if (!confirm(`确定删除用户 ${u.username}？`)) return;
                                await fetch(`/api/users/${u.id}`, { method: "DELETE" });
                                load();
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-700">角色权限说明</p>
          <p>管理员：全部模块 + 用户管理</p>
          <p>管理者：全部客户与商机、仪表盘、供应商、技术支持（可管理所有工单）</p>
          <p>销售：仅自己负责的客户与相关商机、仪表盘</p>
          <p>工程师：仅技术支持模块，且只能编辑/删除自己负责的工单</p>
        </CardBody>
      </Card>
    </div>
  );
}
