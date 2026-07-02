"use client";

import { useState } from "react";
import { FileText, Plus, Trash2, Eye, Download, Pencil } from "lucide-react";
import { documentDownloadUrl, documentPreviewUrl, isPreviewable } from "@/lib/document-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CURRENCIES, QUOTE_STATUSES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { UpdatedAtText } from "@/components/opportunities/editable-record-list";

export type QuoteItem = {
  id: string;
  name: string;
  version: number;
  amount: number | null;
  currency: string;
  status: string;
  isFinal: boolean;
  updatedAt?: string | Date;
};

export type QuoteDocumentLink = {
  id: string;
  fileName: string;
  version: number | null;
  mimeType?: string | null;
};

export function QuotePanel({
  opportunityId,
  currency,
  initialQuotes,
  quoteDocuments,
}: {
  opportunityId: string;
  currency: string;
  initialQuotes: QuoteItem[];
  quoteDocuments: QuoteDocumentLink[];
}) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    version: "1",
    amount: "",
    currency,
    status: "Draft",
    isFinal: false,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    version: "1",
    amount: "",
    currency,
    status: "Draft",
    isFinal: false,
  });

  async function refresh() {
    const res = await fetch(`/api/quotes?opportunityId=${opportunityId}`);
    if (res.ok) setQuotes(await res.json());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opportunityId,
        name: form.name,
        version: form.version,
        amount: form.amount || null,
        currency: form.currency,
        status: form.status,
        isFinal: form.isFinal,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setAdding(false);
      setForm({ name: "", version: "1", amount: "", currency, status: "Draft", isFinal: false });
      await refresh();
    }
  }

  function startEdit(q: QuoteItem) {
    setEditId(q.id);
    setAdding(false);
    setEditForm({
      name: q.name,
      version: String(q.version),
      amount: q.amount != null ? String(q.amount) : "",
      currency: q.currency,
      status: q.status,
      isFinal: q.isFinal,
    });
  }

  async function handleEditSave() {
    if (!editId) return;
    setLoading(true);
    const res = await fetch(`/api/quotes/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        version: editForm.version,
        amount: editForm.amount || null,
        currency: editForm.currency,
        status: editForm.status,
        isFinal: editForm.isFinal,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setEditId(null);
      await refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除此报价记录？")) return;
    await fetch(`/api/quotes/${id}`, { method: "DELETE" });
    await refresh();
  }

  async function toggleFinal(quote: QuoteItem) {
    await fetch(`/api/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFinal: !quote.isFinal }),
    });
    await refresh();
  }

  function docsForQuote(version: number) {
    return quoteDocuments.filter((d) => d.version === version);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          报价文件请上传至阶段文件「报价单」分类，版本号可关联
        </p>
        {!adding && (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            新建报价
          </Button>
        )}
      </div>

      {adding && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">报价名称 *</label>
              <Input
                required
                placeholder="CAM350 维保报价 V3"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">版本</label>
              <Input
                type="number"
                min={1}
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">金额</label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">货币</label>
              <Select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">状态</label>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {QUOTE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isFinal}
                  onChange={(e) => setForm({ ...form, isFinal: e.target.checked })}
                />
                标记为最终版
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "保存中…" : "创建"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>取消</Button>
          </div>
        </form>
      )}

      {quotes.length === 0 ? (
        <div className="rounded-xl border border-slate-100 py-8 text-center text-sm text-slate-400">
          暂无报价记录
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {quotes.map((q) => {
            const linkedDocs = docsForQuote(q.version);
            const isEditing = editId === q.id;
            return (
              <li key={q.id} className="px-4 py-3 hover:bg-slate-50/80">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-600">报价名称</label>
                        <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">版本</label>
                        <Input type="number" min={1} value={editForm.version} onChange={(e) => setEditForm({ ...editForm, version: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">金额</label>
                        <Input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">货币</label>
                        <Select value={editForm.currency} onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}>
                          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">状态</label>
                        <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                          {QUOTE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input type="checkbox" checked={editForm.isFinal} onChange={(e) => setEditForm({ ...editForm, isFinal: e.target.checked })} />
                          标记为最终版
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" disabled={loading} onClick={handleEditSave}>
                        {loading ? "保存中…" : "保存"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setEditId(null)}>取消</Button>
                    </div>
                  </div>
                ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{q.name}</span>
                      <span className="text-xs text-slate-400">v{q.version}</span>
                      {q.isFinal && (
                        <Badge className="bg-emerald-100 text-emerald-800">最终版</Badge>
                      )}
                      <span className="text-xs text-slate-500">{q.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatCurrency(q.amount, q.currency)}
                    </p>
                    <UpdatedAtText at={q.updatedAt} />
                    {linkedDocs.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {linkedDocs.map((doc) => (
                          <li key={doc.id} className="flex items-center gap-2">
                            <FileText className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-700">{doc.fileName}</span>
                            {isPreviewable(doc.mimeType, doc.fileName) && (
                              <a
                                href={documentPreviewUrl(doc.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 hover:underline"
                              >
                                <Eye className="inline h-3 w-3" /> 预览
                              </a>
                            )}
                            <a
                              href={documentDownloadUrl(doc.id)}
                              download
                              className="text-xs text-slate-500 hover:underline"
                            >
                              <Download className="inline h-3 w-3" /> 下载
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <a
                        href={`#files-quote`}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600"
                      >
                        <FileText className="h-3 w-3" />
                        上传报价文件（版本 v{q.version}）
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-2"
                      onClick={() => startEdit(q)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-2 text-xs"
                      onClick={() => toggleFinal(q)}
                    >
                      {q.isFinal ? "取消最终" : "设最终"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-2 text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(q.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
