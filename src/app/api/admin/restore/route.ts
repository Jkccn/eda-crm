import { NextResponse } from "next/server";
import { restoreFromBuffer } from "@/lib/backup";
import { requireApiAdmin } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "请上传备份 ZIP 文件" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await restoreFromBuffer(buffer);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
