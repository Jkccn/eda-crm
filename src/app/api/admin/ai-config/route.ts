import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { getAiSettings, maskApiKey, setAiSettings } from "@/lib/ai/config";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const settings = await getAiSettings();
  return NextResponse.json({
    baseUrl: settings.baseUrl,
    model: settings.model,
    apiKeyMasked: maskApiKey(settings.apiKey),
    configured: Boolean(settings.apiKey),
  });
}

export async function PUT(request: Request) {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const body = await request.json();
  const next = await setAiSettings({
    baseUrl: typeof body.baseUrl === "string" ? body.baseUrl : undefined,
    apiKey: typeof body.apiKey === "string" ? body.apiKey : undefined,
    model: typeof body.model === "string" ? body.model : undefined,
  });
  return NextResponse.json({
    baseUrl: next.baseUrl,
    model: next.model,
    apiKeyMasked: maskApiKey(next.apiKey),
    configured: Boolean(next.apiKey),
  });
}
