import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { AddressesPanel } from "@/components/customers/addresses-panel";
import { ContactsPanel } from "@/components/customers/contacts-panel";
import { CustomerProfilePanel } from "@/components/customers/customer-profile-panel";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_COLORS } from "@/lib/constants";
import { canAccessCustomer, isEngineer } from "@/lib/rbac";
import { formatCurrency, formatDate } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isEngineer(user.role)) redirect("/support");

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      contacts: true,
      addresses: true,
      opportunities: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { documents: true } } },
      },
    },
  });

  if (!customer) notFound();
  if (!canAccessCustomer(user, customer)) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" />
        返回客户列表
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <CustomerProfilePanel initial={customer} />
        <OpportunityForm
          customerId={customer.id}
          ownerName={customer.ownerName}
          aeName={customer.aeName}
        />
      </div>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-800">客户地址</h2></CardHeader>
        <CardBody><AddressesPanel customerId={customer.id} /></CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-800">联系人</h2></CardHeader>
        <CardBody><ContactsPanel customerId={customer.id} /></CardBody>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">销售机会</h2>
        {customer.opportunities.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center text-sm text-slate-500">
              暂无销售机会，点击「新建销售机会」
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {customer.opportunities.map((opp) => (
              <Link key={opp.id} href={`/opportunities/${opp.id}`}>
                <Card className="transition hover:border-indigo-200 hover:shadow-sm">
                  <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{opp.name}</h3>
                        <Badge className={STAGE_COLORS[opp.stage] || ""}>{opp.stage}</Badge>
                        <span className="text-xs text-slate-400">{opp.type}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {opp.productLine && `${opp.productLine} · `}
                        成交 {formatDate(opp.closeDate)}
                        {opp.nextStep && ` · ${opp.nextStep}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-sm">
                      <span className="font-medium text-slate-700">
                        {formatCurrency(opp.dealSize, opp.currency)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <FolderOpen className="h-4 w-4" />
                        {opp._count.documents} 个文件
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
