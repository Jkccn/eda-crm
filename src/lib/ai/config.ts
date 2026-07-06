import { prisma } from "@/lib/prisma";

const AI_CONFIG_KEY = "ai_settings";

export type AiSettings = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

const DEFAULTS: AiSettings = {
  baseUrl: process.env.AI_BASE_URL || "https://api.deepseek.com/v1",
  apiKey: process.env.AI_API_KEY || "",
  model: process.env.AI_MODEL || "deepseek-v4-pro",
};

export async function getAiSettings(): Promise<AiSettings> {
  const row = await prisma.appConfig.findUnique({ where: { key: AI_CONFIG_KEY } });
  if (!row) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(row.value) as Partial<AiSettings>;
    return {
      baseUrl: parsed.baseUrl?.trim() || DEFAULTS.baseUrl,
      apiKey: parsed.apiKey ?? DEFAULTS.apiKey,
      model: parsed.model?.trim() || DEFAULTS.model,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setAiSettings(settings: Partial<AiSettings>): Promise<AiSettings> {
  const current = await getAiSettings();
  const next: AiSettings = {
    baseUrl: settings.baseUrl?.trim() || current.baseUrl,
    // 传空字符串保持原 key 不变；传 "-" 清空
    apiKey:
      settings.apiKey === undefined || settings.apiKey === ""
        ? current.apiKey
        : settings.apiKey === "-"
          ? ""
          : settings.apiKey,
    model: settings.model?.trim() || current.model,
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
