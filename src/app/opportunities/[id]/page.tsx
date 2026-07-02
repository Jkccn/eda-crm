import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ActivitiesPanel } from "@/components/opportunities/activities-panel";
import { ExecutionPanel } from "@/components/opportunities/execution-panel";
import { FinancePanel } from "@/components/opportunities/finance-panel";
import { OpportunityInlineEdit } from "@/components/opportunities/opportunity-inline-edit";
import { OpportunityStageFiles } from "@/components/opportunities/opportunity-stage-files";
import { QuotePanel } from "@/components/opportunities/quote-panel";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { suggestDocumentCategory } from "@/lib/document-suggest";
import { DOCUMENT_CATEGORIES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function OpportunityDetailPage({ params }: Props) {
  const { id } = await params;
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      customer: true,
      quotes: { orderBy: { version: "desc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      contracts: { take: 1 },
      vendorBookings: { take: 1 },
      deliveries: { take: 1 },
      acceptances: { take: 1 },
      financeRecords: { where: { recordType: "Invoice" }, take: 1 },
      licenses: { take: 1 },
    },
  });

  if (!opportunity) notFound();

  const serializedDocs = opportunity.documents.map((d) => ({
    id: d.id,
    fileName: d.fileName,
    category: d.category,
    version: d.version,
    fileSize: d.fileSize,
    mimeType: d.mimeType,
    uploadedAt: d.uploadedAt.toISOString(),
  }));

  const quoteDocuments = opportunity.documents
    .filter((d) => d.category === "quote")
    .map((d) => ({
      id: d.id,
      fileName: d.fileName,
      version: d.version,
      mimeType: d.mimeType,
    }));

  const suggestion = suggestDocumentCategory(opportunity.stage, {
    hasContract: opportunity.contracts.length > 0,
    hasVendorBooking: opportunity.vendorBookings.length > 0,
    hasDelivery: opportunity.deliveries.length > 0,
    hasAcceptance: opportunity.acceptances.length > 0,
    hasInvoice: opportunity.financeRecords.length > 0,
    hasLicense: opportunity.licenses.length > 0,
    documentCategories: opportunity.documents.map((d) => d.category),
  });

  const suggestLabel = DOCUMENT_CATEGORIES.find((c) => c.key === suggestion.category)?.label;

  return (
    <div className="space-y-6">
      <Link
        href={`/customers/${opportunity.customerId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" />
        返回 {opportunity.customer.accountName}
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{opportunity.name}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {opportunity.type}
              {opportunity.productLine && ` · ${opportunity.productLine}`}
              {" · 预计 "}
              {formatDate(opportunity.closeDate)}
              {opportunity.ownerName && ` · 销售 ${opportunity.ownerName}`}
              {opportunity.aeName && ` · 技术 ${opportunity.aeName}`}
            </p>
          </div>
          <OpportunityInlineEdit
            opportunityId={opportunity.id}
            initial={{
              stage: opportunity.stage,
              dealSize: opportunity.dealSize,
              currency: opportunity.currency,
              nextStep: opportunity.nextStep,
            }}
          />
        </div>
      </div>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-800">销售活动</h2></CardHeader>
        <CardBody><ActivitiesPanel opportunityId={opportunity.id} /></CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-800">报价记录</h2></CardHeader>
        <CardBody>
          <QuotePanel
            opportunityId={opportunity.id}
            currency={opportunity.currency}
            initialQuotes={opportunity.quotes}
            quoteDocuments={quoteDocuments}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-800">合同与执行</h2>
          <p className="text-xs text-slate-500">合同、原厂下单、交付、验收</p>
        </CardHeader>
        <CardBody><ExecutionPanel opportunityId={opportunity.id} /></CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-800">财务与 License</h2></CardHeader>
        <CardBody>
          <FinancePanel
            opportunityId={opportunity.id}
            customerId={opportunity.customerId}
            currency={opportunity.currency}
          />
        </CardBody>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">阶段文件</h2>
        <p className="mb-4 text-sm text-slate-500">
          按分类管理文件，支持上传与在线预览
          {suggestLabel && (
            <span className="ml-2 text-indigo-600">· 建议上传：{suggestLabel}</span>
          )}
        </p>
        <OpportunityStageFiles
          opportunityId={opportunity.id}
          initialDocuments={serializedDocs}
          highlightCategory={suggestion.category}
        />
      </div>
    </div>
  );
}
