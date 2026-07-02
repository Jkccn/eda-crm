import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser, setSessionCookie } from "@/lib/auth";
import { modulesForRole } from "@/lib/rbac";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const response = NextResponse.json({
    user,
    modules: modulesForRole(user.role),
  });

  // Cookie 中角色与数据库不一致时刷新会话，确保中间件与 API 权限一致
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const tokenUser = token ? await verifySessionToken(token) : null;
  if (tokenUser && tokenUser.role !== user.role) {
    await setSessionCookie(response, user);
  }

  return response;
}
