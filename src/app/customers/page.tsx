import { Suspense } from "react";
import { Users } from "lucide-react";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerList } from "@/components/customers/customer-list";
import { CustomerSortSelect } from "@/components/customers/customer-sort-select";
import { Card, CardBody } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { customerOrderBy, parseCustomerSort } from "@/lib/customer-sort";
import { prisma } from "@/lib/prisma";
import { customerScopeWhere, isEngineer } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ sort?: string }> };

export default async function CustomersPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isEngineer(user.role)) redirect("/support");

  const { sort: sortParam } = await searchParams;
  const sort = parseCustomerSort(sortParam);

  const customers = await prisma.customer.findMany({
    where: customerScopeWhere(user),
    orderBy: customerOrderBy(sort),
    include: {
      _count: { select: { opportunities: true } },
      opportunities: {
        take: 1,
        orderBy: { updatedAt: "desc" },
        select: { stage: true, name: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">客户</h1>
          <p className="page-subtitle">
            以客户为主线，进入客户查看销售机会与阶段文件
          </p>
        </div>
        <CustomerForm />
      </div>

      {customers.length > 0 && (
        <div className="flex justify-end">
          <Suspense fallback={<div className="h-10 w-36 animate-pulse rounded-xl bg-white/5" />}>
            <CustomerSortSelect />
          </Suspense>
        </div>
      )}

      {customers.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center text-slate-500">
            <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            暂无客户
          </CardBody>
        </Card>
      ) : (
        <CustomerList customers={customers} />
      )}
    </div>
  );
}
