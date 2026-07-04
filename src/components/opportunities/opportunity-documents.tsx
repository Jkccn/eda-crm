"use client";

import { useState } from "react";
import { DocumentPanel, type DocumentItem } from "@/components/documents/document-panel";
import { DOCUMENT_CATEGORIES, type DocumentCategoryKey } from "@/lib/constants";

export function OpportunityDocuments({
  opportunityId,
  initialDocuments,
  suggestedCategory,
  suggestReason,
}: {
  opportunityId: string;
  initialDocuments: DocumentItem[];
  suggestedCategory?: DocumentCategoryKey;
  suggestReason?: string;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [activeCategory, setActiveCategory] = useState<DocumentCategoryKey | "all">("all");

  async function refresh() {
    const res = await fetch(`/api/documents?opportunityId=${opportunityId}`);
    if (res.ok) setDocuments(await res.json());
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterTab
          label="全部文件"
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
        />
        {DOCUMENT_CATEGORIES.map((cat) => (
          <FilterTab
            key={cat.key}
            label={cat.label}
            active={activeCategory === cat.key}
            onClick={() => setActiveCategory(cat.key)}
          />
        ))}
      </div>
      <DocumentPanel
        opportunityId={opportunityId}
        documents={documents}
        activeCategory={activeCategory}
        onChange={refresh}
        suggestedCategory={suggestedCategory}
        suggestReason={suggestReason}
      />
    </div>
  );
}

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
          : "rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-cyan-500/22 hover:text-cyan-100 hover:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]"
      }
    >
      {label}
    </button>
  );
}
