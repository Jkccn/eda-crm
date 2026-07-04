"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export type EntityItem = { id: string; updatedAt?: string | null } & Record<string, unknown>;

export function UpdatedAtText({ at }: { at?: string | Date | null }) {
  if (!at) return null;
  return <span className="block text-xs text-slate-400">修改于 {formatDateTime(at)}</span>;
}

export function EditableRecordList({
  items,
  renderSummary,
  renderEditForm,
  onDelete,
}: {
  items: EntityItem[];
  renderSummary: (item: EntityItem) => React.ReactNode;
  renderEditForm: (
    item: EntityItem,
    actions: { onSave: () => void; onCancel: () => void },
  ) => React.ReactNode;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (items.length === 0) {
    return <p className="text-xs text-slate-400">暂无记录</p>;
  }

  return (
    <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
      {items.map((item) => (
        <li key={item.id} className="hover-row px-3 py-2 text-sm">
          {editingId === item.id ? (
            renderEditForm(item, {
              onSave: () => setEditingId(null),
              onCancel: () => setEditingId(null),
            })
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 text-slate-300">
                {renderSummary(item)}
                <UpdatedAtText at={item.updatedAt as string | undefined} />
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" className="!px-2" onClick={() => setEditingId(item.id)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="!px-2 text-red-600"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function EditActions({
  saving,
  onSave,
  onCancel,
}: {
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-2 flex gap-2">
      <Button type="button" className="!px-2 text-xs" disabled={saving} onClick={onSave}>
        <Check className="h-4 w-4" />
        {saving ? "保存中…" : "保存"}
      </Button>
      <Button type="button" variant="ghost" className="!px-2 text-xs" onClick={onCancel}>
        <X className="h-4 w-4" />
        取消
      </Button>
    </div>
  );
}

async function patchJson(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export { patchJson };
