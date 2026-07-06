import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCustomer, canAccessOpportunity, canManageUsers } from "@/lib/rbac";
import type { SessionUser } from "@/lib/session";

export async function requireApiAuth() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "未登录" }, { status: 401 }) };
  }
  return { user, error: null };
}

/**
 * 校验当前用户是否有权访问指定商机（含其附属实体：报价、合同、财务记录等）。
 * 返回商机的基础信息，供路由复用，避免重复查询。
 */
export async function requireOpportunityApiAccess(opportunityId: string | null | undefined) {
  const { user, error } = await requireApiAuth();
  if (error) return { user: null, opportunity: null, error };

  if (!opportunityId) {
    return {
      user: null,
      opportunity: null,
      error: NextResponse.json({ error: "缺少 opportunityId" }, { status: 400 }),
    };
  }

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      customerId: true,
      currency: true,
      customer: { select: { ownerUserId: true, ownerName: true } },
    },
  });
  if (!opportunity) {
    return {
      user: null,
      opportunity: null,
      error: NextResponse.json({ error: "商机不存在" }, { status: 404 }),
    };
  }
  if (!canAccessOpportunity(user!, opportunity.customerId, opportunity.customer)) {
    return { user: null, opportunity: null, error: apiForbidden() };
  }
  return { user, opportunity, error: null };
}

/** 校验当前用户是否有权访问指定客户 */
export async function requireCustomerApiAccess(customerId: string | null | undefined) {
  const { user, error } = await requireApiAuth();
  if (error) return { user: null, customer: null, error };

  if (!customerId) {
    return {
      user: null,
      customer: null,
      error: NextResponse.json({ error: "缺少 customerId" }, { status: 400 }),
    };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, ownerUserId: true, ownerName: true },
  });
  if (!customer) {
    return {
      user: null,
      customer: null,
      error: NextResponse.json({ error: "客户不存在" }, { status: 404 }),
    };
  }
  if (!canAccessCustomer(user!, customer)) {
    return { user: null, customer: null, error: apiForbidden() };
  }
  return { user, customer, error: null };
}

export async function requireApiAdmin() {
  const { user, error } = await requireApiAuth();
  if (error) return { user: null, error };
  if (!canManageUsers(user!.role)) {
    return { user: null, error: NextResponse.json({ error: "需要管理员权限" }, { status: 403 }) };
  }
  return { user, error: null };
}

export function apiForbidden(message = "无权限") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export type AuthedUser = SessionUser;
