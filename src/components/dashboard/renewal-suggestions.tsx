"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type Suggestion = {
  license: {
    id: string;
    productLine: string | null;
    endDate: string | null;
    customer: { id: string; accountName: string };
  };
  hasRenewalOpportunity: boolean;
  existingOpportunityId: string | null;
  suggestedName: string;
};

export function RenewalSuggestions() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/renewals/suggestions")
      .then((r) => r.json())
      .then(setItems);
  }, []);

  async function createRenewalOpp(licenseId: string, name: string) {
    setLoading(licenseId);
    const res = await fetch("/api/renewals/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseId, name }),
    });
    setLoading(null);
    if (res.ok) {
      const opp = await res.json();
      window.location.href = `/opportunities/${opp.id}`;
    }
  }

  const pending = items.filter((i) => !i.hasRenewalOpportunity);

  if (pending.length === 0) {
    return <p className="text-sm text-slate-400">暂无待创建续费商机</p>;
  }

  return (
    <ul className="divide-y divide-white/5">
      {pending.map((item) => (
        <li key={item.license.id} className="hover-row flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-medium text-slate-100">
              {item.license.customer.accountName} · {item.license.productLine || "License"}
            </p>
            <p className="text-slate-500">
              到期 {formatDate(item.license.endDate)} · 建议：{item.suggestedName}
            </p>
          </div>
          <Button
            variant="secondary"
            disabled={loading === item.license.id}
            onClick={() => createRenewalOpp(item.license.id, item.suggestedName)}
          >
            {loading === item.license.id ? "创建中…" : "创建续费商机"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
