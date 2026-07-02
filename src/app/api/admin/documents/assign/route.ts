import { copyFile, mkdir, unlink, stat } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/api-auth";
import { guessMimeType } from "@/lib/document-reindex";
import { getUploadRoot, normalizeStoragePath, parseStoredFileName } from "@/lib/paths";
import { resolveStoragePath } from "@/lib/storage";

export const runtime = "nodejs";

/** 将孤立磁盘文件关联到指定商机 */
export async function POST(request: Request) {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const body = await request.json();
  const storagePath = body.storagePath as string | undefined;
  const targetOpportunityId = body.targetOpportunityId as string | undefined;
  const category = (body.category as string) || "other";

  if (!storagePath || !targetOpportunityId) {
    return NextResponse.json({ error: "storagePath 与 targetOpportunityId 必填" }, { status: 400 });
  }

  const opp = await prisma.opportunity.findUnique({ where: { id: targetOpportunityId } });
  if (!opp) {
    return NextResponse.json({ error: "目标商机不存在" }, { status: 404 });
  }

  const existing = await prisma.document.findFirst({
    where: { storagePath: normalizeStoragePath(storagePath) },
  });
  if (existing) {
    return NextResponse.json({ error: "该文件已在数据库中" }, { status: 409 });
  }

  let oldAbsolute: string;
  try {
    oldAbsolute = resolveStoragePath(storagePath);
  } catch {
    return NextResponse.json({ error: "文件路径无效" }, { status: 400 });
  }

  const storedName = path.basename(normalizeStoragePath(storagePath));
  const displayName = parseStoredFileName(storedName);
  const safeName = displayName.replace(/[^\w.\-()\u4e00-\u9fff]/g, "_");
  const newStored = `${randomUUID()}-${safeName}`;
  const newStoragePath = normalizeStoragePath(path.posix.join(targetOpportunityId, newStored));
  const newAbsolute = path.join(getUploadRoot(), ...newStoragePath.split("/"));

  await mkdir(path.dirname(newAbsolute), { recursive: true });
  await copyFile(oldAbsolute, newAbsolute);

  const fileInfo = await stat(newAbsolute);
  await unlink(oldAbsolute).catch(() => {});

  const document = await prisma.document.create({
    data: {
      opportunityId: targetOpportunityId,
      category,
      fileName: displayName,
      storagePath: newStoragePath,
      fileSize: fileInfo.size,
      mimeType: guessMimeType(displayName),
    },
  });

  return NextResponse.json(document, { status: 201 });
}
