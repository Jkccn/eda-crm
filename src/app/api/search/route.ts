import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import {
  canAccessModule,
  customerPicklistWhere,
  customerScopeWhere,
  isEngineer,
  isGlobalViewer,
  isSalesScoped,
  opportunityScopeWhere,
  supportCaseScopeWhere,
} from "@/lib/rbac";

export async function GET(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({
      customers: [],
      opportunities: [],
      supportCases: [],
      vendors: [],
      contacts: [],
      documents: [],
    });
  }

  const role = user!.role;
  const tasks: Promise<unknown>[] = [];
  const result: Record<string, unknown[]> = {
    customers: [],
    opportunities: [],
    supportCases: [],
    vendors: [],
    contacts: [],
    documents: [],
  };

  if (canAccessModule(role, "customers")) {
    tasks.push(
      prisma.customer
        .findMany({
          where: {
            ...customerScopeWhere(user!),
            OR: [
              { accountName: { contains: q } },
              { englishName: { contains: q } },
              { ownerName: { contains: q } },
              { aeName: { contains: q } },
              { description: { contains: q } },
            ],
          },
          take: 8,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            accountName: true,
            englishName: true,
            region: true,
            _count: { select: { opportunities: true } },
          },
        })
        .then((rows) => {
          result.customers = rows;
        }),
    );
  }

  if (canAccessModule(role, "opportunities")) {
    tasks.push(
      prisma.opportunity
        .findMany({
          where: {
            ...opportunityScopeWhere(user!),
            name: { contains: q },
          },
          take: 8,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
            stage: true,
            dealSize: true,
            currency: true,
            customer: { select: { id: true, accountName: true } },
          },
        })
        .then((rows) => {
          result.opportunities = rows;
        }),
    );

    tasks.push(
      prisma.document
        .findMany({
          where: {
            opportunity: opportunityScopeWhere(user!),
            OR: [{ fileName: { contains: q } }, { notes: { contains: q } }],
          },
          take: 8,
          orderBy: { uploadedAt: "desc" },
          select: {
            id: true,
            fileName: true,
            category: true,
            mimeType: true,
            opportunity: {
              select: {
                id: true,
                name: true,
                customer: { select: { id: true, accountName: true } },
              },
            },
          },
        })
        .then((rows) => {
          result.documents = rows;
        }),
    );
  }

  if (canAccessModule(role, "support")) {
    tasks.push(
      prisma.supportCase
        .findMany({
          where: {
            ...supportCaseScopeWhere(user!),
            OR: [
              { title: { contains: q } },
              { customerIssue: { contains: q } },
              { solution: { contains: q } },
            ],
          },
          take: 8,
          orderBy: { openedAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            customer: { select: { id: true, accountName: true } },
          },
        })
        .then((rows) => {
          result.supportCases = rows;
        }),
    );
  }

  if (canAccessModule(role, "vendors") && isGlobalViewer(role)) {
    tasks.push(
      prisma.vendor
        .findMany({
          where: {
            OR: [{ name: { contains: q } }, { productLines: { contains: q } }],
          },
          take: 6,
          orderBy: { name: "asc" },
          select: { id: true, name: true, productLines: true },
        })
        .then((rows) => {
          result.vendors = rows;
        }),
    );
  }

  if (canAccessModule(role, "customers") && !isEngineer(role)) {
    tasks.push(
      prisma.contact
        .findMany({
          where: {
            customer: customerScopeWhere(user!),
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
            ],
          },
          take: 6,
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            customer: { select: { id: true, accountName: true } },
          },
        })
        .then((rows) => {
          result.contacts = rows;
        }),
    );
  }

  await Promise.all(tasks);
  return NextResponse.json(result);
}
