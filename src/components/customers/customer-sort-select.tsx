"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { Select } from "@/components/ui/select";
import {
  CUSTOMER_SORT_KEYS,
  CUSTOMER_SORT_LABELS,
  type CustomerSortKey,
  parseCustomerSort,
} from "@/lib/customer-sort";

export function CustomerSortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sort = parseCustomerSort(searchParams.get("sort"));

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as CustomerSortKey;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "importance") {
      params.delete("sort");
    } else {
      params.set("sort", next);
    }
    const query = params.toString();
    router.push(query ? `/customers?${query}` : "/customers");
  }

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-4 w-4 shrink-0 text-slate-500" />
      <Select
        value={sort}
        onChange={onChange}
        className="w-auto min-w-[8.5rem]"
        aria-label="客户排序"
      >
        {CUSTOMER_SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {CUSTOMER_SORT_LABELS[key]}
          </option>
        ))}
      </Select>
    </div>
  );
}
