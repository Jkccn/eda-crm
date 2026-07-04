import type { Prisma } from "@/generated/prisma/client";
import type { AppModule, UserRole } from "@/lib/constants";
import type { SessionUser } from "@/lib/session";
import { normalizeRole } from "@/lib/session";

const IMPOSSIBLE_ID = "__rbac_denied__";

export function isUserRole(role: string): role is UserRole {
  return ["admin", "manager", "sales", "engineer", "assistant"].includes(role);
}

/** 各角色可见的导航模块 */
const ROLE_MODULES: Record<UserRole, AppModule[]> = {
  admin: ["customers", "opportunities", "dashboard", "vendors", "support", "users", "settings", "reports"],
  manager: ["customers", "opportunities", "dashboard", "vendors", "support", "reports"],
  sales: ["customers", "opportunities", "dashboard", "reports"],
  engineer: ["support"],
  assistant: ["customers", "dashboard"],
};

export function modulesForRole(role: string): AppModule[] {
  const normalized = normalizeRole(role);
  if (!normalized) return [];
  return ROLE_MODULES[normalized];
}

export function canAccessModule(role: string, module: AppModule): boolean {
  return modulesForRole(role).includes(module);
}

export function canManageUsers(role: string): boolean {
  return normalizeRole(role) === "admin";
}

export function canManageSettings(role: string): boolean {
  return normalizeRole(role) === "admin";
}

export function isGlobalViewer(role: string): boolean {
  const r = normalizeRole(role);
  return r === "admin" || r === "manager";
}

export function isSalesScoped(role: string): boolean {
  return normalizeRole(role) === "sales";
}

export function isEngineer(role: string): boolean {
  return normalizeRole(role) === "engineer";
}

export function isAssistant(role: string): boolean {
  return normalizeRole(role) === "assistant";
}

/** 助理不可查看客户联系人 */
export function canViewCustomerContacts(user: SessionUser): boolean {
  return !isAssistant(user.role);
}

/** 助理仅可编辑客户基础信息（不可删客户、不可管商机） */
export function canDeleteCustomer(user: SessionUser): boolean {
  return !isAssistant(user.role);
}

export function canManageOpportunities(user: SessionUser): boolean {
  return !isAssistant(user.role);
}

/** 销售只能看自己负责的客户（userId 优先，兼容旧 ownerName）；助理可看全部 */
export function customerScopeWhere(user: SessionUser): Prisma.CustomerWhereInput {
  if (isGlobalViewer(user.role) || isAssistant(user.role)) return {};
  if (isSalesScoped(user.role)) {
    const name = user.displayName || user.username;
    return {
      OR: [{ ownerUserId: user.id }, { ownerUserId: null, ownerName: name }],
    };
  }
  return { id: IMPOSSIBLE_ID };
}

/** 工单下拉选客户：工程师创建工单时可选择全部客户 */
export function customerPicklistWhere(user: SessionUser): Prisma.CustomerWhereInput {
  if (isEngineer(user.role)) return {};
  return customerScopeWhere(user);
}

export function opportunityScopeWhere(user: SessionUser): Prisma.OpportunityWhereInput {
  if (isGlobalViewer(user.role)) return {};
  if (isAssistant(user.role)) return { id: IMPOSSIBLE_ID };
  if (isSalesScoped(user.role)) {
    return { customer: customerScopeWhere(user) };
  }
  return { id: IMPOSSIBLE_ID };
}

export function supportCaseScopeWhere(user: SessionUser): Prisma.SupportCaseWhereInput {
  if (isGlobalViewer(user.role)) return {};
  if (isEngineer(user.role)) return { assignedUserId: user.id };
  return { id: IMPOSSIBLE_ID };
}

export function canEditSupportCase(
  user: SessionUser,
  ticket: { assignedUserId: string | null },
): boolean {
  if (isGlobalViewer(user.role)) return true;
  if (isEngineer(user.role)) return ticket.assignedUserId === user.id;
  return false;
}

export function canAccessCustomer(
  user: SessionUser,
  customer: { id: string; ownerUserId: string | null; ownerName: string | null },
): boolean {
  if (isGlobalViewer(user.role) || isAssistant(user.role)) return true;
  if (isEngineer(user.role)) return false;
  if (isSalesScoped(user.role)) {
    const name = user.displayName || user.username;
    return customer.ownerUserId === user.id || (!customer.ownerUserId && customer.ownerName === name);
  }
  return false;
}

export function canAccessOpportunity(user: SessionUser, customerId: string, customer?: {
  ownerUserId: string | null;
  ownerName: string | null;
}): boolean {
  if (isAssistant(user.role)) return false;
  if (isGlobalViewer(user.role)) return true;
  if (isEngineer(user.role)) return false;
  if (isSalesScoped(user.role) && customer) {
    return canAccessCustomer(user, { id: customerId, ...customer });
  }
  return false;
}

/** 路径前缀 → 模块，用于中间件页面访问控制 */
export function moduleForPath(pathname: string): AppModule | null {
  if (pathname.startsWith("/customers")) return "customers";
  if (pathname.startsWith("/opportunities")) return "opportunities";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/vendors")) return "vendors";
  if (pathname.startsWith("/support")) return "support";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/admin/settings")) return "settings";
  if (pathname.startsWith("/admin/users") || pathname.startsWith("/admin/data")) return "users";
  return null;
}

export function canAccessPath(role: string, pathname: string): boolean {
  const module = moduleForPath(pathname);
  if (!module) return true;
  return canAccessModule(role, module);
}
