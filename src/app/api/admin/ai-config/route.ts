import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { getAiSettings, isVisionConfigured, maskApiKey, setAiSettings } from "@/lib/ai/config";

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
    visionBaseUrl: settings.visionBaseUrl,
    visionModel: settings.visionModel,
    visionApiKeyMasked: maskApiKey(settings.visionApiKey),
    visionConfigured: isVisionConfigured(settings),
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
    visionBaseUrl: typeof body.visionBaseUrl === "string" ? body.visionBaseUrl : undefined,
    visionApiKey: typeof body.visionApiKey === "string" ? body.visionApiKey : undefined,
    visionModel: typeof body.visionModel === "string" ? body.visionModel : undefined,
  });
  return NextResponse.json({
    baseUrl: next.baseUrl,
    model: next.model,
    apiKeyMasked: maskApiKey(next.apiKey),
    configured: Boolean(next.apiKey),
    visionBaseUrl: next.visionBaseUrl,
    visionModel: next.visionModel,
    visionApiKeyMasked: maskApiKey(next.visionApiKey),
    visionConfigured: isVisionConfigured(next),
  });
}
