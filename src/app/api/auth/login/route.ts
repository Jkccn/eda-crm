import { NextResponse } from "next/server";
import { authenticateUser, clearSessionCookie, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = body.username?.trim();
    const password = body.password;

    if (!username || !password) {
      return NextResponse.json({ error: "用户名与密码必填" }, { status: 400 });
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const response = NextResponse.json({ user });
    await setSessionCookie(response, user);
    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "登录服务异常，请确认已执行 npm run db:migrate 与 npm run db:seed" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
