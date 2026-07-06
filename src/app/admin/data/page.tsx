"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Database, Download, Upload, RefreshCw, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatFileSize } from "@/lib/utils";

type OrphanFile = {
  storagePath: string;
  opportunityId: string;
  fileName: string;
  fileSize: number;
};

type OpportunityOption = { id: string; name: string; customer: { accountName: string } };

export default function AdminDataPage() {
  const restoreRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState("");
  const [scan, setScan] = useState<{ diskFiles: number; missingRecords: number; orphanedFiles: OrphanFile[] } | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityOption[]>([]);
  const [assignTarget, setAssignTarget] = useState<Record<string, string>>({});

  const loadScan = useCallback(async () => {
    const res = await fetch("/api/admin/documents/reindex");
    if (res.ok) setScan(await res.json());
  }, []);

  useEffect(() => {
    loadScan();
    fetch("/api/opportunities")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setOpportunities(Array.isArray(rows) ? rows : []));
  }, [loadScan]);

  async function handleReindex() {
    setLoading("reindex");
    setMessage("");
    const res = await fetch("/api/admin/documents/reindex", { method: "POST" });
    const data = await res.json();
    setLoading("");
    if (res.ok) {
      setMessage(`已扫描 ${data.scanned} 个磁盘文件，补建 ${data.created} 条记录。`);
      setScan((s) => ({
        diskFiles: data.scanned,
        missingRecords: 0,
        orphanedFiles: data.orphaned || [],
      }));
    } else {
      setMessage(data.error || "扫描失败");
    }
  }

  async function handleAssign(file: OrphanFile) {
    const targetOpportunityId = assignTarget[file.storagePath];
    if (!targetOpportunityId) {
      setMessage("请先选择要关联的商机");
      return;
    }
    setLoading(file.storagePath);
    const res = await fetch("/api/admin/documents/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath: file.storagePath, targetOpportunityId }),
    });
    const data = await res.json();
    setLoading("");
    if (res.ok) {
      setMessage(`已恢复文件：${file.fileName}`);
      await loadScan();
    } else {
      setMessage(data.error || "关联失败");
    }
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("导入将覆盖当前数据库与 uploads 文件，是否继续？")) {
      e.target.value = "";
      return;
    }
    setLoading("restore");
    setMessage("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/restore", { method: "POST", body: formData });
    const data = await res.json();
    setLoading("");
    setMessage(data.message || data.error || "导入完成");
    e.target.value = "";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">数据备份与恢复</h1>
          <p className="mt-1 text-sm text-slate-500">ZIP 完整备份含数据库与上传文件；JSON 仅导出业务数据</p>
        </div>
        <Link href="/admin/users" className="link-hover text-sm text-cyan-400">
          ← 用户管理
        </Link>
      </div>

      {message && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-200">
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Download className="h-4 w-4" />
              导出备份
            </h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-slate-400">
              ZIP 备份包含 SQLite 数据库与 uploads 目录下全部上传文件，适合完整迁移或灾难恢复。
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/api/admin/backup" download>
                <Button type="button">
                  <Database className="h-4 w-4" />
                  下载 ZIP 完整备份
                </Button>
              </a>
              <a href="/api/admin/export" download>
                <Button type="button" variant="secondary">
                  下载 JSON 数据
                </Button>
              </a>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Upload className="h-4 w-4" />
              导入恢复
            </h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-slate-400">
              上传此前导出的 ZIP 备份包。恢复后请重启开发服务器（npm run dev）。
            </p>
            <input
              ref={restoreRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              disabled={loading === "restore"}
              onChange={handleRestore}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={loading === "restore"}
              onClick={() => restoreRef.current?.click()}
            >
              {loading === "restore" ? "导入中…" : "选择 ZIP 备份并导入"}
            </Button>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <RefreshCw className="h-4 w-4" />
              文件索引修复
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              若上传文件在磁盘存在但页面不显示，通常是数据库记录丢失（例如执行过 db:reset）
            </p>
          </div>
          <Button type="button" onClick={handleReindex} disabled={loading === "reindex"}>
            {loading === "reindex" ? "扫描中…" : "扫描并补建记录"}
          </Button>
        </CardHeader>
        <CardBody className="space-y-4 text-sm text-slate-400">
          {scan && (
            <p>
              磁盘文件 {scan.diskFiles} 个 · 待补建 {scan.missingRecords} 个 · 孤立文件{" "}
              {scan.orphanedFiles.length} 个
            </p>
          )}

          {scan && scan.orphanedFiles.length > 0 && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 font-medium text-amber-800">
                <FileWarning className="h-4 w-4" />
                以下文件所属商机已不存在，请手动关联到当前商机：
              </p>
              <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
                {scan.orphanedFiles.map((file) => (
                  <li key={file.storagePath} className="hover-row flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-100">{file.fileName}</p>
                      <p className="text-xs text-slate-500">
                        原商机 ID {file.opportunityId} · {formatFileSize(file.fileSize)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={assignTarget[file.storagePath] || ""}
                        onChange={(e) =>
                          setAssignTarget((prev) => ({
                            ...prev,
                            [file.storagePath]: e.target.value,
                          }))
                        }
                      >
                        <option value="">选择商机…</option>
                        {opportunities.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}（{o.customer?.accountName || "客户"}）
                          </option>
                        ))}
                      </Select>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={loading === file.storagePath}
                        onClick={() => handleAssign(file)}
                      >
                        关联
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
