export const ADDRESS_TYPES = [
  { key: "official", label: "官方地址" },
  { key: "shipping", label: "快递地址" },
  { key: "end_user", label: "最终用户地址" },
] as const;

export type AddressTypeKey = (typeof ADDRESS_TYPES)[number]["key"];

export const CONFIG_KEYS = ["regions", "industries"] as const;

export const DEFAULT_REGIONS = ["CN", "SG", "EU", "US"] as const;
export const DEFAULT_INDUSTRIES = ["Automotive", "IC", "PCB", "Telecom", "Consumer"] as const;
export const REGIONS = DEFAULT_REGIONS;
export const INDUSTRIES = DEFAULT_INDUSTRIES;

export const PRODUCT_LINES = [
  "Allegro",
  "OrCAD",
  "CAM350",
  "Sigrity",
  "Clarity",
  "Creo",
] as const;
export const CURRENCIES = ["CNY", "USD", "EUR", "SGD"] as const;

export const USER_ROLES = ["admin", "manager", "sales", "engineer", "assistant"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理员",
  manager: "管理者",
  sales: "销售",
  engineer: "工程师",
  assistant: "助理",
};

export const VENDOR_OCCASIONS = [
  "春节",
  "中秋",
  "圣诞",
  "元旦",
  "生日",
  "商务拜访",
  "其他",
] as const;

/** 可作为客户销售负责人的角色 */
export const SALES_OWNER_ROLES = ["admin", "manager", "sales"] as const;
export type SalesOwnerRole = (typeof SALES_OWNER_ROLES)[number];

export const APP_MODULES = [
  "customers",
  "opportunities",
  "dashboard",
  "vendors",
  "support",
  "users",
  "settings",
  "reports",
  "ai",
] as const;

/** 商机报备即将过期天数阈值 */
export const OEM_EXPIRY_WARNING_DAYS = 30;
export type AppModule = (typeof APP_MODULES)[number];

export const OPPORTUNITY_STAGES = [
  "Discovery",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
] as const;

export const OPPORTUNITY_TYPES = [
  "New Business",
  "Renewal",
  "Expansion",
  "Training",
  "Service",
] as const;

export const QUOTE_STATUSES = [
  "Draft",
  "Sent",
  "Accepted",
  "Rejected",
  "Expired",
] as const;

export const CONTRACT_TYPES = ["Contract", "PO"] as const;
export const CONTRACT_STATUSES = ["Draft", "Signed", "Active", "Closed"] as const;
export const EXECUTION_STATUSES = ["Pending", "In Progress", "Done", "Cancelled"] as const;
export const FINANCE_TYPES = ["Invoice", "Payment"] as const;
export const VENDOR_FINANCE_TYPES = ["VendorInvoice", "VendorPayment"] as const;
export const ALL_FINANCE_RECORD_TYPES = [
  ...FINANCE_TYPES,
  ...VENDOR_FINANCE_TYPES,
] as const;
export type FinanceRecordType = (typeof ALL_FINANCE_RECORD_TYPES)[number];

export const FINANCE_TYPE_LABELS: Record<FinanceRecordType, string> = {
  Invoice: "客户发票",
  Payment: "客户回款",
  VendorInvoice: "原厂发票",
  VendorPayment: "向原厂付款",
};

export const FINANCE_STATUSES = ["Pending", "Paid", "Overdue", "Cancelled"] as const;
export const LICENSE_STATUSES = ["Active", "Expiring", "Expired", "Cancelled"] as const;
export const RENEWAL_TASK_STATUSES = ["Open", "Done", "Dismissed"] as const;
export const SUPPORT_STATUSES = ["Open", "In Progress", "Resolved", "Closed"] as const;
export const SUPPORT_PRIORITIES = ["Low", "Normal", "High", "Critical"] as const;
export const ACTIVITY_STATUSES = ["Open", "Done", "Cancelled"] as const;

/** 销售机会附属文件分类 */
export const DOCUMENT_CATEGORIES = [
  { key: "quote", label: "报价单", icon: "FileText" },
  { key: "contract", label: "合同", icon: "FileSignature" },
  { key: "po", label: "采购单", icon: "ShoppingCart" },
  { key: "vendor_booking", label: "原厂下单", icon: "Factory" },
  { key: "vendor_goods", label: "原厂内部货物", icon: "Package" },
  { key: "vendor_invoice", label: "原厂发票", icon: "Receipt" },
  { key: "vendor_payment", label: "原厂付款凭证", icon: "Banknote" },
  { key: "delivery", label: "发货/交付", icon: "Truck" },
  { key: "invoice", label: "发票", icon: "Receipt" },
  { key: "license", label: "License", icon: "Key" },
  { key: "acceptance", label: "验收单", icon: "CheckCircle" },
  { key: "other", label: "其他", icon: "Paperclip" },
] as const;

export type DocumentCategoryKey = (typeof DOCUMENT_CATEGORIES)[number]["key"];

export const STAGE_COLORS: Record<string, string> = {
  Discovery: "bg-slate-500/20 text-slate-300 ring-1 ring-slate-400/30",
  Qualified: "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/30",
  Proposal: "bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/30",
  Negotiation: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30",
  Won: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30",
  Lost: "bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30",
};

/** 商机阶段默认建议上传的文件分类 */
export const STAGE_DEFAULT_DOCUMENT: Record<string, DocumentCategoryKey> = {
  Discovery: "other",
  Qualified: "quote",
  Proposal: "quote",
  Negotiation: "contract",
  Won: "invoice",
  Lost: "other",
};
