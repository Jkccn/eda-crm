import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const [
    users,
    customers,
    opportunities,
    documents,
    supportCases,
    vendors,
    contacts,
    quotes,
    appConfig,
  ] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, username: true, role: true, displayName: true, createdAt: true },
    }),
    prisma.customer.findMany(),
    prisma.opportunity.findMany(),
    prisma.document.findMany(),
    prisma.supportCase.findMany(),
    prisma.vendor.findMany(),
    prisma.contact.findMany(),
    prisma.quote.findMany(),
    prisma.appConfig.findMany(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    note: "JSON 导出不含上传文件二进制，完整备份请使用 ZIP 备份",
    users,
    customers,
    opportunities,
    documents,
    supportCases,
    vendors,
    contacts,
    quotes,
    appConfig,
  };

  const filename = `eda-crm-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
