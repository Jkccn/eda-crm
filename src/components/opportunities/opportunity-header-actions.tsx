"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OpportunityHeaderActions({
  opportunityId,
  customerId,
  initialName,
}: {
  opportunityId: string;
  customerId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveName() {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setLoading(true);
    const res = await fetch(`/api/opportunities/${opportunityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setLoading(false);
    if (res.ok) {
      const updated = await res.json();
      setName(updated.name);
      setEditing(false);
      router.refresh();
    }
  }

  function cancelEdit() {
    setEditName(name);
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("确定删除此商机？相关报价、文件与执行记录将一并删除。")) return;
    setDeleting(true);
    const res = await fetch(`/api/opportunities/${opportunityId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      router.push(`/customers/${customerId}`);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      {editing ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="min-w-0 flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") cancelEdit();
            }}
          />
          <Button type="button" disabled={loading || !editName.trim()} onClick={saveName}>
            <Check className="h-4 w-4" />
            {loading ? "保存中…" : "保存"}
          </Button>
          <Button type="button" variant="ghost" onClick={cancelEdit}>
            <X className="h-4 w-4" />
            取消
          </Button>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="page-title">{name}</h1>
          <Button
            type="button"
            variant="ghost"
            className="!px-2 shrink-0"
            onClick={() => {
              setEditName(name);
              setEditing(true);
            }}
            title="修改名称"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        className="shrink-0 text-red-400 hover:bg-rose-500/20 hover:text-red-300"
        disabled={deleting}
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4" />
        {deleting ? "删除中…" : "删除商机"}
      </Button>
    </div>
  );
}
