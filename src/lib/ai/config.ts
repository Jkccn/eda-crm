import { prisma } from "@/lib/prisma";

const AI_CONFIG_KEY = "ai_settings";

/** 主模型：文字对话 + CRM 工具调用（如 DeepSeek） */
export type AiTextSettings = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

/** 视觉模型：图片/多模态识别（如 Qwen3.7-Plus） */
export type AiVisionSettings = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type AiSettings = AiTextSettings & {
  visionBaseUrl: string;
  visionApiKey: string;
  visionModel: string;
};

const DEFAULTS: AiSettings = {
  baseUrl: process.env.AI_BASE_URL || "https://api.deepseek.com/v1",
  apiKey: process.env.AI_API_KEY || "",
  model: process.env.AI_MODEL || "deepseek-v4-pro",
  visionBaseUrl: process.env.AI_VISION_BASE_URL || "",
  visionApiKey: process.env.AI_VISION_API_KEY || "",
  visionModel: process.env.AI_VISION_MODEL || "qwen3.7-plus",
};

function mergeKey(
  incoming: string | undefined,
  current: string,
): string {
  if (incoming === undefined || incoming === "") return current;
  if (incoming === "-") return "";
  return incoming;
}

export async function getAiSettings(): Promise<AiSettings> {
  const row = await prisma.appConfig.findUnique({ where: { key: AI_CONFIG_KEY } });
  if (!row) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(row.value) as Partial<AiSettings>;
    return {
      baseUrl: parsed.baseUrl?.trim() || DEFAULTS.baseUrl,
      apiKey: parsed.apiKey ?? DEFAULTS.apiKey,
      model: parsed.model?.trim() || DEFAULTS.model,
      visionBaseUrl: parsed.visionBaseUrl?.trim() || DEFAULTS.visionBaseUrl,
      visionApiKey: parsed.visionApiKey ?? DEFAULTS.visionApiKey,
      visionModel: parsed.visionModel?.trim() || DEFAULTS.visionModel,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function getVisionSettings(settings: AiSettings): AiVisionSettings | null {
  if (!settings.visionApiKey || !settings.visionBaseUrl || !settings.visionModel) return null;
  return {
    baseUrl: settings.visionBaseUrl,
    apiKey: settings.visionApiKey,
    model: settings.visionModel,
  };
}

export function isVisionConfigured(settings: AiSettings): boolean {
  return getVisionSettings(settings) !== null;
}

export async function setAiSettings(settings: Partial<AiSettings>): Promise<AiSettings> {
  const current = await getAiSettings();
  const next: AiSettings = {
    baseUrl: settings.baseUrl?.trim() || current.baseUrl,
    apiKey: mergeKey(settings.apiKey, current.apiKey),
    model: settings.model?.trim() || current.model,
    visionBaseUrl: settings.visionBaseUrl?.trim() || current.visionBaseUrl,
    visionApiKey: mergeKey(settings.visionApiKey, current.visionApiKey),
    visionModel: settings.visionModel?.trim() || current.visionModel,
  };
  await prisma.appConfig.upsert({
    where: { key: AI_CONFIG_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: AI_CONFIG_KEY, value: JSON.stringify(next) },
  });
  return next;
}

export function maskApiKey(key: string) {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}
