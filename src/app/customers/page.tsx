import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { CustomerForm } from "@/components/customers/customer-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_COLORS } from "@/lib/constants";
import { customerScopeWhere, isEngineer } from "@/lib/rbac";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isEngineer(user.role)) redirect("/support");

  const customers = await prisma.customer.findMany({
    where: customerScopeWhere(user),
    orderBy: { updatedAt: "desc" },
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

      {customers.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center text-slate-500">
            <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            暂无客户
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {customers.map((customer) => (
            <Link key={customer.id} href={`/customers/${customer.id}`}>
              <Card className="hover-lift transition-all duration-200">
                <CardBody className="flex items-center justify-between gap-4">
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
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
