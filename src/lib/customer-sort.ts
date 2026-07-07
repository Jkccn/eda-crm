import type { Prisma } from "@/generated/prisma/client";

export const CUSTOMER_SORT_KEYS = ["importance", "name", "updated", "opportunities"] as const;
export type CustomerSortKey = (typeof CUSTOMER_SORT_KEYS)[number];

export const CUSTOMER_SORT_LABELS: Record<CustomerSortKey, string> = {
  importance: "重要性",
  name: "名称",
  updated: "最近更新",
  opportunities: "商机数量",
};

export function parseCustomerSort(value: string | undefined | null): CustomerSortKey {
  if (value && (CUSTOMER_SORT_KEYS as readonly string[]).includes(value)) {
    return value as CustomerSortKey;
  }
  return "importance";
}

export function customerOrderBy(
  sort: CustomerSortKey,
): Prisma.CustomerOrderByWithRelationInput[] {
  switch (sort) {
    case "name":
      return [{ accountName: "asc" }];
    case "updated":
      return [{ updatedAt: "desc" }];
    case "opportunities":
      return [{ opportunities: { _count: "desc" } }, { updatedAt: "desc" }];
    case "importance":
    default:
      return [
        { isImportant: "desc" },
        { importanceUpdatedAt: "desc" },
        { updatedAt: "desc" },
      ];
  }
}
