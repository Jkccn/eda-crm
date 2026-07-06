import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RENEWAL_TASK_STATUSES } from "@/lib/constants";
import { requireApiAuth, requireCustomerApiAccess } from "@/lib/api-auth";
import { customerScopeWhere } from "@/lib/rbac";

export async function GET(request: Request) {
  const licenseId = new URL(request.url).searchParams.get("licenseId");
  const open = new URL(request.url).searchParams.get("open");

  if (open === "true") {
    const { user, error } = await requireApiAuth();
    if (error) return error;

    const items = await prisma.renewalTask.findMany({
      where: {
        status: "Open",
        license: { customer: customerScopeWhere(user!) },
      },
      include: {
        license: {
          include: { customer: { select: { id: true, accountName: true } } },
        },
      },
      orderBy: { dueDate: "asc" },
    });
    return NextResponse.json(items);
  }

  if (!licenseId) {
    return NextResponse.json({ error: "缺少 licenseId" }, { status: 400 });
  }
  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    select: { customerId: true },
  });
  if (!license) {
    return NextResponse.json({ error: "License 不存在" }, { status: 404 });
  }
  const { error } = await requireCustomerApiAccess(license.customerId);
  if (error) return error;

  const items = await prisma.renewalTask.findMany({
    where: { licenseId },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json(items);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  }
  const task = await prisma.renewalTask.findUnique({
    where: { id: body.id },
    select: { license: { select: { customerId: true } } },
  });
  if (!task) {
    return NextResponse.json({ error: "续费任务不存在" }, { status: 404 });
  }
  const { error } = await requireCustomerApiAccess(task.license.customerId);
  if (error) return error;

  const item = await prisma.renewalTask.update({
    where: { id: body.id },
    data: {
      status: body.status && RENEWAL_TASK_STATUSES.includes(body.status) ? body.status : undefined,
      notes: body.notes,
    },
  });
  return NextResponse.json(item);
}
