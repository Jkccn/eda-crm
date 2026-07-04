"use client";

import { useCallback, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DOCUMENT_CATEGORIES, type DocumentCategoryKey } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  CategoryFileUpload,
  StageFileList,
  type StageFileItem,
} from "@/components/documents/document-file-actions";

export function OpportunityStageFiles({
  opportunityId,
  initialDocuments,
  highlightCategory,
}: {
  opportunityId: string;
  initialDocuments: StageFileItem[];
  highlightCategory?: DocumentCategoryKey;
}) {
  const [documents, setDocuments] = useState(initialDocuments);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/documents?opportunityId=${opportunityId}`);
    if (res.ok) {
      const data = await res.json();
      setDocuments(
        data.map((d: StageFileItem & { uploadedAt: string }) => ({
          ...d,
          uploadedAt:
            typeof d.uploadedAt === "string" ? d.uploadedAt : new Date(d.uploadedAt).toISOString(),
        })),
      );
    }
  }, [opportunityId]);

  async function handleDelete(id: string) {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    refresh();
  }

  const knownKeys = new Set<string>(DOCUMENT_CATEGORIES.map((c) => c.key));

  return (
    <div className="space-y-4">
      {DOCUMENT_CATEGORIES.map((cat) => {
        const files = documents.filter((d) =>
          cat.key === "other"
            ? d.category === "other" || !knownKeys.has(d.category)
            : d.category === cat.key,
        );
        const highlighted = highlightCategory === cat.key;
        return (
          <Card
            key={cat.key}
            id={`files-${cat.key}`}
            className={cn(
              "scroll-mt-6",
              highlighted ? "border-cyan-500/30 ring-1 ring-cyan-400/20" : "",
            )}
          >
            <CardHeader className="!py-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-200">{cat.label}</h3>
                <span className="text-xs text-slate-400">{files.length} 个文件</span>
              </div>
            </CardHeader>
            <CardBody className="space-y-3 !pt-0">
              <StageFileList files={files} onDelete={handleDelete} />
              <CategoryFileUpload
                opportunityId={opportunityId}
                category={cat.key}
                onUploaded={refresh}
              />
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
