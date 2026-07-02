import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/rbac";
import type { SessionUser } from "@/lib/session";

export async function requireApiAuth() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "未登录" }, { status: 401 }) };
  }
  return { user, error: null };
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
