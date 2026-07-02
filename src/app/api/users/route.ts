import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireApiAdmin } from "@/lib/api-auth";
import { USER_ROLES } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET() {
  const { user, error } = await requireApiAdmin();
  if (error) return error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ users, currentUserId: user!.id });
}

export async function POST(request: Request) {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const body = await request.json();
  const username = body.username?.trim();
  const password = body.password;
  const displayName = body.displayName?.trim() || null;
  const role = body.role;

  if (!username || !password) {
    return NextResponse.json({ error: "用户名与密码必填" }, { status: 400 });
  }
  if (!role || !(USER_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "无效角色" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
  }

  const created = await prisma.user.create({
    data: {
      username,
      passwordHash: hashPassword(password),
      displayName,
      role,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
