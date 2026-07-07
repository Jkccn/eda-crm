import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, apiForbidden } from "@/lib/api-auth";
import {
  canAccessCustomer,
  canDeleteCustomer,
  canViewCustomerContacts,
  isAssistant,
  isEngineer,
} from "@/lib/rbac";
import { resolveCustomerOwners } from "@/lib/customer-owners";
import { oemFieldsFromBody, stripUndefined } from "@/lib/customer-oem-fields";

const PROFILE_FIELDS = [
  "accountName",
  "englishName",
  "region",
  "industry",
  "description",
  "notes",
] as const;

function profilePatchData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const key of PROFILE_FIELDS) {
    if (body[key] !== undefined) {
      data[key] = typeof body[key] === "string" && body[key] === "" ? null : body[key];
    }
  }
  return data;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      contacts: canViewCustomerContacts(user!),
      opportunities: canViewCustomerContacts(user!)
        ? {
            orderBy: { updatedAt: "desc" },
            include: {
              _count: { select: { documents: true, quotes: true } },
            },
          }
        : false,
    },
  });
  if (!customer) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }
  if (!canAccessCustomer(user!, customer)) {
    return apiForbidden();
  }
  const payload = canViewCustomerContacts(user!)
    ? customer
    : { ...customer, contacts: [], opportunities: [] };
  return NextResponse.json(payload);
}

export async function PATCH(request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (isEngineer(user!.role)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  if (!canAccessCustomer(user!, existing)) return apiForbidden();

  const body = await request.json();
  const importanceOnly =
    typeof body.isImportant === "boolean" &&
    PROFILE_FIELDS.every((key) => body[key] === undefined) &&
    body.ownerUserId === undefined &&
    body.aeUserId === undefined &&
    body.oemOpportunityNo === undefined;

  let ownerUserId = existing.ownerUserId;
  let ownerName = existing.ownerName;
  let aeName = existing.aeName;

  if (!importanceOnly) {
    const resolved = isAssistant(user!.role)
      ? {
          ownerUserId: existing.ownerUserId,
          ownerName: existing.ownerName,
          aeName: existing.aeName,
        }
      : await resolveCustomerOwners(body, user!);
    ownerUserId = resolved.ownerUserId;
    ownerName = resolved.ownerName;
    aeName = resolved.aeName;
  }

  const data = stripUndefined({
    ...profilePatchData(body),
    ...(importanceOnly
      ? {}
      : {
          ownerName,
          aeName,
          ownerUserId,
          ...oemFieldsFromBody(body),
        }),
    ...(typeof body.isImportant === "boolean"
      ? {
          isImportant: body.isImportant,
          importanceUpdatedAt: body.isImportant ? new Date() : null,
        }
      : {}),
  });

  const customer = await prisma.customer.update({
    where: { id },
    data,
  });
  return NextResponse.json(customer);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, error } = await requireApiAuth();
  if (error) return error;
  if (isEngineer(user!.role) || !canDeleteCustomer(user!)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  if (!canAccessCustomer(user!, existing)) return apiForbidden();

  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
