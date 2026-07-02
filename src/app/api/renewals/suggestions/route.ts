import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const in90 = new Date();
  in90.setDate(in90.getDate() + 90);

  const licenses = await prisma.license.findMany({
    where: {
      endDate: { lte: in90, gte: new Date() },
      status: { in: ["Active", "Expiring"] },
    },
    include: {
      customer: { select: { id: true, accountName: true } },
      opportunity: { select: { id: true, name: true, productLine: true } },
    },
    orderBy: { endDate: "asc" },
  });

  const suggestions = await Promise.all(
    licenses.map(async (license) => {
      const existing = await prisma.opportunity.findFirst({
        where: {
          customerId: license.customerId,
          type: "Renewal",
          productLine: license.productLine ?? undefined,
          stage: { notIn: ["Won", "Lost"] },
        },
      });

      const yyyymm = license.endDate
        ? `${license.endDate.getFullYear()}${String(license.endDate.getMonth() + 1).padStart(2, "0")}`
        : "000000";

      return {
        license,
        hasRenewalOpportunity: Boolean(existing),
        existingOpportunityId: existing?.id ?? null,
        suggestedName: `${yyyymm}-${license.customer.accountName}-${license.productLine || "License"}-续费`,
      };
    }),
  );

  return NextResponse.json(suggestions);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.licenseId) {
    return NextResponse.json({ error: "缺少 licenseId" }, { status: 400 });
  }

  const license = await prisma.license.findUnique({
    where: { id: body.licenseId },
    include: { customer: true },
  });
  if (!license) {
    return NextResponse.json({ error: "License 不存在" }, { status: 404 });
  }

  const yyyymm = license.endDate
    ? `${license.endDate.getFullYear()}${String(license.endDate.getMonth() + 1).padStart(2, "0")}`
    : "000000";

  const opportunity = await prisma.opportunity.create({
    data: {
      customerId: license.customerId,
      name: body.name || `${yyyymm}-${license.customer.accountName}-${license.productLine || "License"}-续费`,
      stage: "Discovery",
      type: "Renewal",
      productLine: license.productLine,
      dealSize: body.dealSize != null ? Number(body.dealSize) : null,
      currency: "CNY",
      closeDate: license.endDate,
      nextStep: "联系客户确认续费意向",
      ownerName: license.customer.ownerName,
      aeName: license.customer.aeName,
    },
  });

  return NextResponse.json(opportunity, { status: 201 });
}
