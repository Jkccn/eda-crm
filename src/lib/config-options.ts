import { prisma } from "@/lib/prisma";
import {
  CONFIG_KEYS,
  DEFAULT_INDUSTRIES,
  DEFAULT_REGIONS,
} from "@/lib/constants";

const DEFAULTS: Record<(typeof CONFIG_KEYS)[number], readonly string[]> = {
  regions: DEFAULT_REGIONS,
  industries: DEFAULT_INDUSTRIES,
};

export async function getConfigOptions(key: (typeof CONFIG_KEYS)[number]): Promise<string[]> {
  const row = await prisma.appConfig.findUnique({ where: { key } });
  if (!row) return [...DEFAULTS[key]];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed.map(String) : [...DEFAULTS[key]];
  } catch {
    return [...DEFAULTS[key]];
  }
}

export async function setConfigOptions(
  key: (typeof CONFIG_KEYS)[number],
  values: string[],
): Promise<string[]> {
  const cleaned = values.map((v) => v.trim()).filter(Boolean);
  await prisma.appConfig.upsert({
    where: { key },
    create: { key, value: JSON.stringify(cleaned) },
    update: { value: JSON.stringify(cleaned) },
  });
  return cleaned;
}

export async function ensureDefaultConfigs() {
  for (const key of CONFIG_KEYS) {
    const existing = await prisma.appConfig.findUnique({ where: { key } });
    if (!existing) {
      await prisma.appConfig.create({
        data: { key, value: JSON.stringify([...DEFAULTS[key]]) },
      });
    }
  }
}

export async function getRegions() {
  return getConfigOptions("regions");
}

export async function getIndustries() {
  return getConfigOptions("industries");
}
