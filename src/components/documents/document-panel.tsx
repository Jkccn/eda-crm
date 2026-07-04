"use client";

import { useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DOCUMENT_CATEGORIES, type DocumentCategoryKey } from "@/lib/constants";
import { formatDate, formatFileSize } from "@/lib/utils";

export type DocumentItem = {
  id: string;
  fileName: string;
  category: string;
  version: number | null;
  fileSize: number | null;
  uploadedAt: string;
  notes: string | null;
};

export function DocumentPanel({
  opportunityId,
  documents,
  activeCategory,
  onChange,
  suggestedCategory,
  suggestReason,
}: {
  opportunityId: string;
  documents: DocumentItem[];
  activeCategory: DocumentCategoryKey | "all";
  onChange: () => void;
  suggestedCategory?: DocumentCategoryKey;
  suggestReason?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategoryKey>(
    suggestedCategory || "quote",
  );
  const [version, setVersion] = useState("");
  const [uploading, setUploading] = useState(false);

  const filtered =
    activeCategory === "all"
      ? documents
      : documents.filter((d) => d.category === activeCategory);

  async function handleUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("opportunityId", opportunityId);
    formData.append("category", uploadCategory);
    formData.append("file", file);
    if (version) formData.append("version", version);

    await fetch("/api/documents", { method: "POST", body: formData });
    setUploading(false);
    setVersion("");
    if (fileRef.current) fileRef.current.value = "";
    onChange();
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除此文件？")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="space-y-4">
      {suggestedCategory && suggestReason && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-200">
          建议上传「{DOCUMENT_CATEGORIES.find((c) => c.key === suggestedCategory)?.label}」— {suggestReason}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-white/10 bg-white/5 p-4">
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-slate-600">上传分类</label>
          <Select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value as DocumentCategoryKey)}
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </Select>
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs font-medium text-slate-600">版本</label>
          <Input
            type="number"
            placeholder="可选"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <Button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {uploading ? "上传中…" : "选择文件"}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-slate-900/50 py-12 text-center text-sm text-slate-500">
          暂无文件，请上传或切换分类
        </div>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-slate-900/50">
          {filtered.map((doc) => {
            const catLabel =
              DOCUMENT_CATEGORIES.find((c) => c.key === doc.category)?.label || doc.category;
            return (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-4 px-4 py-3 hover-row"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">{doc.fileName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {catLabel}
                    {doc.version ? ` · v${doc.version}` : ""}
                    {" · "}
                    {formatFileSize(doc.fileSize)}
                    {" · "}
                    {formatDate(doc.uploadedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <a href={`/api/documents/${doc.id}`} download>
                    <Button type="button" variant="ghost" className="!px-2">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    className="!px-2 text-red-400 hover:bg-rose-500/20 hover:text-red-300"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
