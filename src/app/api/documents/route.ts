import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";
import { DOCUMENT_CATEGORIES } from "@/lib/constants";
import { requireOpportunityApiAccess } from "@/lib/api-auth";

const VALID_CATEGORIES = new Set(DOCUMENT_CATEGORIES.map((c) => c.key));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const opportunityId = searchParams.get("opportunityId");
  const category = searchParams.get("category");

  const { error } = await requireOpportunityApiAccess(opportunityId);
  if (error) return error;

  const documents = await prisma.document.findMany({
    where: {
      opportunityId: opportunityId!,
      ...(category && category !== "all" ? { category } : {}),
    },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const opportunityId = formData.get("opportunityId") as string;
  const category = formData.get("category") as string;
  const notes = (formData.get("notes") as string) || null;
  const versionRaw = formData.get("version") as string | null;
  const file = formData.get("file") as File | null;

  if (!opportunityId || !category || !file) {
    return NextResponse.json({ error: "商机、分类与文件必填" }, { status: 400 });
  }
  if (!VALID_CATEGORIES.has(category as (typeof DOCUMENT_CATEGORIES)[number]["key"])) {
    return NextResponse.json({ error: "无效文件分类" }, { status: 400 });
  }

  const { error } = await requireOpportunityApiAccess(opportunityId);
  if (error) return error;

  const saved = await saveUploadedFile(opportunityId, file);
  const document = await prisma.document.create({
    data: {
      opportunityId,
      category,
      fileName: file.name,
      notes,
      version: versionRaw ? Number(versionRaw) : null,
      ...saved,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
