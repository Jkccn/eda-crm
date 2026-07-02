import type { DocumentCategoryKey } from "@/lib/constants";
import { STAGE_DEFAULT_DOCUMENT } from "@/lib/constants";

type ExecutionState = {
  hasContract: boolean;
  hasVendorBooking: boolean;
  hasDelivery: boolean;
  hasAcceptance: boolean;
  hasInvoice: boolean;
  hasLicense: boolean;
  documentCategories: string[];
};

export function suggestDocumentCategory(
  stage: string,
  execution: ExecutionState,
): { category: DocumentCategoryKey; reason: string } {
  const hasDoc = (cat: DocumentCategoryKey) =>
    execution.documentCategories.includes(cat);

  if (stage === "Won" || stage === "Negotiation") {
    if (execution.hasContract && !hasDoc("po") && !execution.hasVendorBooking) {
      return { category: "po", reason: "已有合同，建议上传客户 PO" };
    }
    if (execution.hasVendorBooking && !hasDoc("vendor_booking")) {
      return { category: "vendor_booking", reason: "已登记原厂下单，建议上传下单文件" };
    }
    if (execution.hasVendorBooking && !hasDoc("delivery") && !execution.hasDelivery) {
      return { category: "delivery", reason: "已下单，建议上传发货/交付文件" };
    }
    if (execution.hasDelivery && !hasDoc("acceptance") && !execution.hasAcceptance) {
      return { category: "acceptance", reason: "已交付，建议上传验收单" };
    }
    if (execution.hasAcceptance && !hasDoc("invoice") && !execution.hasInvoice) {
      return { category: "invoice", reason: "已验收，建议上传发票" };
    }
    if (stage === "Won" && !hasDoc("license") && !execution.hasLicense) {
      return { category: "license", reason: "成交后建议上传 License 文件" };
    }
  }

  if (stage === "Proposal" || stage === "Qualified") {
    if (!hasDoc("quote")) {
      return { category: "quote", reason: "报价阶段，建议上传报价单" };
    }
  }

  if (stage === "Negotiation" && !hasDoc("contract") && !execution.hasContract) {
    return { category: "contract", reason: "谈判阶段，建议上传合同" };
  }

  const fallback = STAGE_DEFAULT_DOCUMENT[stage] || "other";
  return { category: fallback, reason: "根据当前阶段推荐" };
}
