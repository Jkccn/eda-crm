import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RENEWAL_TASK_STATUSES } from "@/lib/constants";

export async function GET(request: Request) {
  const licenseId = new URL(request.url).searchParams.get("licenseId");
  const open = new URL(request.url).searchParams.get("open");

  if (open === "true") {
    const items = await prisma.renewalTask.findMany({
      where: { status: "Open" },
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
  const item = await prisma.renewalTask.update({
    where: { id: body.id },
    data: {
      status: body.status && RENEWAL_TASK_STATUSES.includes(body.status) ? body.status : undefined,
      notes: body.notes,
    },
  });
  return NextResponse.json(item);
}
