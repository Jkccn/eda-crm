import { NextResponse } from "next/server";
import { reindexMissingDocuments, scanDiskFiles } from "@/lib/document-reindex";
import { requireApiAdmin } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const scanned = await scanDiskFiles();
  const missing = scanned.filter((f) => f.opportunityExists && !f.inDatabase);
  const orphaned = scanned.filter((f) => !f.opportunityExists && !f.inDatabase);

  return NextResponse.json({
    diskFiles: scanned.length,
    missingRecords: missing.length,
    orphanedFiles: orphaned.map((f) => ({
      storagePath: f.storagePath,
      opportunityId: f.opportunityId,
      fileName: f.fileName,
      fileSize: f.fileSize,
    })),
  });
}

export async function POST() {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const result = await reindexMissingDocuments();
  return NextResponse.json(result);
}
