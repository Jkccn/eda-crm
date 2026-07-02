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

export const USER_ROLES = ["admin", "manager", "sales", "engineer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理员",
  manager: "管理者",
  sales: "销售",
  engineer: "工程师",
};

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
] as const;
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
  { key: "delivery", label: "发货/交付", icon: "Truck" },
  { key: "invoice", label: "发票", icon: "Receipt" },
  { key: "license", label: "License", icon: "Key" },
  { key: "acceptance", label: "验收单", icon: "CheckCircle" },
  { key: "other", label: "其他", icon: "Paperclip" },
] as const;

export type DocumentCategoryKey = (typeof DOCUMENT_CATEGORIES)[number]["key"];

export const STAGE_COLORS: Record<string, string> = {
  Discovery: "bg-slate-100 text-slate-700",
  Qualified: "bg-blue-100 text-blue-700",
  Proposal: "bg-amber-100 text-amber-800",
  Negotiation: "bg-orange-100 text-orange-800",
  Won: "bg-emerald-100 text-emerald-800",
  Lost: "bg-red-100 text-red-700",
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
