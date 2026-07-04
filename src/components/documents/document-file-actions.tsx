"use client";

import { useRef, useState } from "react";
import { Download, Eye, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  documentDownloadUrl,
  documentPreviewUrl,
  isPreviewable,
} from "@/lib/document-preview";
import { formatDate, formatFileSize } from "@/lib/utils";

export type StageFileItem = {
  id: string;
  fileName: string;
  category: string;
  version: number | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string;
};

export function DocumentFileActions({
  doc,
  onDelete,
}: {
  doc: StageFileItem;
  onDelete: () => void;
}) {
  const previewable = isPreviewable(doc.mimeType, doc.fileName);

  return (
    <div className="flex shrink-0 gap-1">
      {previewable && (
        <a href={documentPreviewUrl(doc.id)} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="ghost" className="!px-2" title="预览">
            <Eye className="h-4 w-4" />
          </Button>
        </a>
      )}
      <a href={documentDownloadUrl(doc.id)} download>
        <Button type="button" variant="ghost" className="!px-2" title="下载">
          <Download className="h-4 w-4" />
        </Button>
      </a>
      <Button
        type="button"
        variant="ghost"
        className="!px-2 text-red-400 hover:bg-rose-500/20 hover:text-red-300"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function CategoryFileUpload({
  opportunityId,
  category,
  onUploaded,
}: {
  opportunityId: string;
  category: string;
  onUploaded: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("opportunityId", opportunityId);
    formData.append("category", category);
    formData.append("file", file);
    if (version) formData.append("version", version);
    const res = await fetch("/api/documents", { method: "POST", body: formData });
    setUploading(false);
    setVersion("");
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "上传失败，请重新登录后重试");
      return;
    }
    onUploaded();
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
      <div className="w-20">
        <label className="mb-1 block text-xs text-slate-500">版本</label>
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
        variant="secondary"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        {uploading ? "上传中…" : "上传文件"}
      </Button>
    </div>
  );
}

export function StageFileList({
  files,
  onDelete,
}: {
  files: StageFileItem[];
  onDelete: (id: string) => void;
}) {
  if (files.length === 0) {
    return <p className="text-xs text-slate-400">暂无文件</p>;
  }

  return (
    <ul className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10 bg-slate-900/50">
      {files.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center justify-between gap-4 px-3 py-2.5 hover-row"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-100">{doc.fileName}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {doc.version ? `v${doc.version} · ` : ""}
              {formatFileSize(doc.fileSize)} · {formatDate(doc.uploadedAt)}
            </p>
          </div>
          <DocumentFileActions
            doc={doc}
            onDelete={() => {
              if (confirm("确定删除此文件？")) onDelete(doc.id);
            }}
          />
        </li>
      ))}
    </ul>
  );
}
