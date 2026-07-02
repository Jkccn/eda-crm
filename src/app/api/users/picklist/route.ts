import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { SALES_OWNER_ROLES } from "@/lib/constants";
import { isEngineer } from "@/lib/rbac";

export const runtime = "nodejs";

const SALES_OWNER_ORDER: Record<string, number> = { admin: 0, manager: 1, sales: 2 };

/** 客户表单：销售负责人 / 技术负责人下拉选项 */
export async function GET() {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (isEngineer(user!.role)) return apiForbidden();

  const users = await prisma.user.findMany({
    where: { role: { in: [...SALES_OWNER_ROLES, "engineer"] } },
    orderBy: [{ displayName: "asc" }, { username: "asc" }],
    select: { id: true, username: true, displayName: true, role: true },
  });

  const salesOwners = users
    .filter((u) => (SALES_OWNER_ROLES as readonly string[]).includes(u.role))
    .sort(
      (a, b) =>
        (SALES_OWNER_ORDER[a.role] ?? 9) - (SALES_OWNER_ORDER[b.role] ?? 9) ||
        (a.displayName || a.username).localeCompare(b.displayName || b.username, "zh"),
    );

  return NextResponse.json({
    salesOwners,
    techOwners: users.filter((u) => u.role === "engineer"),
  });
}
