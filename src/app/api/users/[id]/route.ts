import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireApiAdmin } from "@/lib/api-auth";
import { USER_ROLES } from "@/lib/constants";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { user, error } = await requireApiAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  if (id === user!.id && body.role && body.role !== user!.role) {
    return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 });
  }

  const data: {
    displayName?: string | null;
    role?: string;
    passwordHash?: string;
  } = {};

  if (body.displayName !== undefined) {
    data.displayName = body.displayName?.trim() || null;
  }
  if (body.role !== undefined) {
    if (!(USER_ROLES as readonly string[]).includes(body.role)) {
      return NextResponse.json({ error: "无效角色" }, { status: 400 });
    }
    data.role = body.role;
  }
  if (body.password) {
    data.passwordHash = hashPassword(body.password);
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, error } = await requireApiAdmin();
  if (error) return error;

  const { id } = await params;
  if (id === user!.id) {
    return NextResponse.json({ error: "不能删除自己的账号" }, { status: 400 });
  }

  await prisma.customer.updateMany({
    where: { ownerUserId: id },
    data: { ownerUserId: null },
  });
  await prisma.supportCase.updateMany({
    where: { assignedUserId: id },
    data: { assignedUserId: null },
  });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
