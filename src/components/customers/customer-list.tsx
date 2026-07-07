"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CustomerImportanceStar } from "@/components/customers/customer-importance-star";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { STAGE_COLORS } from "@/lib/constants";

export type CustomerListItem = {
  id: string;
  accountName: string;
  englishName: string | null;
  region: string | null;
  isImportant: boolean;
  _count: { opportunities: number };
  opportunities: { stage: string; name: string }[];
};

export function CustomerList({ customers }: { customers: CustomerListItem[] }) {
  return (
    <div className="grid gap-4">
      {customers.map((customer) => (
        <Link key={customer.id} href={`/customers/${customer.id}`}>
          <Card className="hover-lift transition-all duration-200">
            <CardBody className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-start gap-2">
                <CustomerImportanceStar
                  customerId={customer.id}
                  isImportant={customer.isImportant}
                />
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-slate-100">
                    {customer.accountName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {customer.englishName && `${customer.englishName} · `}
                    {customer.region || "—"} · {customer._count.opportunities} 个商机
                  </p>
                  {customer.opportunities[0] && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge className={STAGE_COLORS[customer.opportunities[0].stage]}>
                        {customer.opportunities[0].stage}
                      </Badge>
                      <span className="truncate text-xs text-slate-500">
                        {customer.opportunities[0].name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}
