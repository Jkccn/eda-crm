import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import { SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "@/lib/constants";
import {
  canEditSupportCase,
  isEngineer,
  isGlobalViewer,
  supportCaseScopeWhere,
} from "@/lib/rbac";

export async function GET(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  const status = url.searchParams.get("status");

  const items = await prisma.supportCase.findMany({
    where: {
      ...supportCaseScopeWhere(user!),
      ...(customerId ? { customerId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      customer: { select: { id: true, accountName: true } },
      opportunity: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, displayName: true, username: true } },
    },
    orderBy: { openedAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const body = await request.json();
  if (!body.customerId || !body.title || !body.customerIssue?.trim()) {
    return NextResponse.json({ error: "客户、标题与客户问题必填" }, { status: 400 });
  }

  const assignedUserId = isEngineer(user!.role)
    ? user!.id
    : isGlobalViewer(user!.role) && body.assignedUserId
      ? body.assignedUserId
      : user!.id;

  const item = await prisma.supportCase.create({
    data: {
      customerId: body.customerId,
      opportunityId: body.opportunityId || null,
      title: body.title,
      customerIssue: body.customerIssue.trim(),
      solution: body.solution?.trim() || null,
      status:
        body.status && (SUPPORT_STATUSES as readonly string[]).includes(body.status)
          ? body.status
          : "Open",
      priority:
        body.priority && (SUPPORT_PRIORITIES as readonly string[]).includes(body.priority)
          ? body.priority
          : "Normal",
      notes: body.notes || null,
      assignedUserId,
    },
    include: {
      customer: { select: { id: true, accountName: true } },
      opportunity: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, displayName: true, username: true } },
    },
  });
  return NextResponse.json(item, { status: 201 });
}
