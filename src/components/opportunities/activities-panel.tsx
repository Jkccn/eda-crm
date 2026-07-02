"use client";

import { useEffect, useState } from "react";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ACTIVITY_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  EditableRecordList,
  EditActions,
  EntityItem,
  patchJson,
} from "@/components/opportunities/editable-record-list";

export function ActivitiesPanel({ opportunityId }: { opportunityId: string }) {
  const [items, setItems] = useState<EntityItem[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function load() {
    const res = await fetch(`/api/activities?opportunityId=${opportunityId}`);
    if (res.ok) {
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    }
  }

  useEffect(() => {
    load();
  }, [opportunityId]);

  const isOverdue = (item: EntityItem): boolean =>
    item.status === "Open" && !!item.dueDate && new Date(item.dueDate as string) < new Date();

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-200 p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return;
          await fetch("/api/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ opportunityId, title, dueDate: dueDate || null }),
          });
          setTitle("");
          setDueDate("");
          load();
        }}
      >
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-slate-500">活动标题</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="下一步行动" required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">截止日期</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary"><Plus className="h-4 w-4" />添加</Button>
      </form>

      {items.length === 0 ? (
        <p className="text-xs text-slate-400">暂无销售活动</p>
      ) : (
        <EditableRecordList
          items={items}
          renderSummary={(item) => (
            <div className={isOverdue(item) ? "text-red-800" : ""}>
              <p className="font-medium">
                {String(item.title)}
                {isOverdue(item) && (
                  <span className="ml-2 text-xs font-normal text-red-600">已逾期</span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                截止 {formatDate(item.dueDate as string)} · {item.status as string}
              </p>
            </div>
          )}
          renderEditForm={(item, { onSave, onCancel }) => (
            <ActivityEditForm
              item={item}
              onSave={async (body) => {
                if (await patchJson(`/api/activities/${item.id}`, body)) {
                  await load();
                  onSave();
                }
              }}
              onCancel={onCancel}
            />
          )}
          onDelete={async (id) => {
            if (!confirm("确定删除？")) return;
            await fetch(`/api/activities/${id}`, { method: "DELETE" });
            load();
          }}
        />
      )}
    </div>
  );
}

function ActivityEditForm({
  item,
  onSave,
  onCancel,
}: {
  item: EntityItem;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const due = item.dueDate
    ? new Date(item.dueDate as string).toISOString().slice(0, 10)
    : "";
  const [form, setForm] = useState({
    title: (item.title as string) || "",
    dueDate: due,
    status: (item.status as string) || "Open",
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-slate-500">标题</label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">截止日期</label>
          <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">状态</label>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {form.status === "Open" && (
          <Button
            type="button"
            variant="ghost"
            className="!px-2 text-xs"
            onClick={() => setForm({ ...form, status: "Done" })}
          >
            <Check className="h-4 w-4" /> 标为完成
          </Button>
        )}
        <EditActions
          saving={saving}
          onSave={async () => {
            setSaving(true);
            await onSave({
              title: form.title,
              dueDate: form.dueDate || null,
              status: form.status,
            });
            setSaving(false);
          }}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}
