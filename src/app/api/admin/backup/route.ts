import { NextResponse } from "next/server";
import { createBackupBuffer } from "@/lib/backup";
import { requireApiAdmin } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const buffer = await createBackupBuffer();
  const filename = `eda-crm-backup-${new Date().toISOString().slice(0, 10)}.zip`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
