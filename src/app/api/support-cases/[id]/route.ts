import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "@/lib/constants";
import { canEditSupportCase } from "@/lib/rbac";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.supportCase.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "工单不存在" }, { status: 404 });
  if (!canEditSupportCase(user!, existing)) return apiForbidden("只能编辑自己负责的工单");

  const body = await request.json();
  const item = await prisma.supportCase.update({
    where: { id },
    data: {
      title: body.title,
      customerIssue: body.customerIssue,
      solution: body.solution,
      status:
        body.status && (SUPPORT_STATUSES as readonly string[]).includes(body.status)
          ? body.status
          : undefined,
      priority:
        body.priority && (SUPPORT_PRIORITIES as readonly string[]).includes(body.priority)
          ? body.priority
          : undefined,
      notes: body.notes,
      closedAt:
        body.status === "Closed" || body.status === "Resolved"
          ? new Date()
          : body.status
            ? null
            : undefined,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.supportCase.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "工单不存在" }, { status: 404 });
  if (!canEditSupportCase(user!, existing)) return apiForbidden("只能删除自己负责的工单");

  await prisma.supportCase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
