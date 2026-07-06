import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ActivitiesPanel } from "@/components/opportunities/activities-panel";
import { ExecutionPanel } from "@/components/opportunities/execution-panel";
import { FinancePanel } from "@/components/opportunities/finance-panel";
import { OpportunityHeaderActions } from "@/components/opportunities/opportunity-header-actions";
import { OpportunityInlineEdit } from "@/components/opportunities/opportunity-inline-edit";
import { OpportunitySectionNav } from "@/components/opportunities/opportunity-section-nav";
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
      financeRecords: { select: { recordType: true } },
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
    hasInvoice: opportunity.financeRecords.some((r) => r.recordType === "Invoice"),
    hasVendorInvoice: opportunity.financeRecords.some((r) => r.recordType === "VendorInvoice"),
    hasVendorPayment: opportunity.financeRecords.some((r) => r.recordType === "VendorPayment"),
    hasLicense: opportunity.licenses.length > 0,
    documentCategories: opportunity.documents.map((d) => d.category),
  });

  const suggestLabel = DOCUMENT_CATEGORIES.find((c) => c.key === suggestion.category)?.label;

  return (
    <div className="space-y-6">
      <Link
        href={`/customers/${opportunity.customerId}`}
        className="link-hover inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" />
        返回 {opportunity.customer.accountName}
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="sticky top-0 z-10 w-full min-w-0 shrink-0 self-start border-b border-white/5 bg-[#060a14]/95 py-2 backdrop-blur-md lg:top-4 lg:w-44 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:border-0 lg:bg-transparent lg:py-0 lg:backdrop-blur-none">
          <OpportunitySectionNav />
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
        <section id="opp-overview" className="scroll-mt-24 glass-card rounded-2xl p-4 sm:p-6 lg:scroll-mt-6">
            <div className="space-y-4">
              <div>
                <OpportunityHeaderActions
                  opportunityId={opportunity.id}
                  customerId={opportunity.customerId}
                  initialName={opportunity.name}
                />
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
          </section>

          <section id="opp-activities" className="scroll-mt-24 lg:scroll-mt-6">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-slate-200">销售活动</h2></CardHeader>
              <CardBody><ActivitiesPanel opportunityId={opportunity.id} /></CardBody>
            </Card>
          </section>

          <section id="opp-quotes" className="scroll-mt-24 lg:scroll-mt-6">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-slate-200">报价记录</h2></CardHeader>
              <CardBody>
                <QuotePanel
                  opportunityId={opportunity.id}
                  currency={opportunity.currency}
                  initialQuotes={opportunity.quotes}
                  quoteDocuments={quoteDocuments}
                />
              </CardBody>
            </Card>
          </section>

          <section id="opp-execution" className="scroll-mt-24 lg:scroll-mt-6">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-200">合同与执行</h2>
                <p className="text-xs text-slate-500">合同、原厂下单、交付、验收</p>
              </CardHeader>
              <CardBody><ExecutionPanel opportunityId={opportunity.id} /></CardBody>
            </Card>
          </section>

          <section id="opp-finance" className="scroll-mt-24 lg:scroll-mt-6">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-slate-200">财务与 License</h2></CardHeader>
              <CardBody>
                <FinancePanel
                  opportunityId={opportunity.id}
                  customerId={opportunity.customerId}
                  currency={opportunity.currency}
                />
              </CardBody>
            </Card>
          </section>

          <section id="opp-files" className="scroll-mt-24 lg:scroll-mt-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">阶段文件</h2>
            <p className="mb-4 text-sm text-slate-500">
              按分类管理文件，支持上传与在线预览
              {suggestLabel && (
                <span className="ml-2 text-cyan-400">· 建议上传：{suggestLabel}</span>
              )}
            </p>
            <OpportunityStageFiles
              opportunityId={opportunity.id}
              initialDocuments={serializedDocs}
              highlightCategory={suggestion.category}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
