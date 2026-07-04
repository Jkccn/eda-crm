import { OEM_EXPIRY_WARNING_DAYS } from "@/lib/constants";

export type OemExpiryStatus = "none" | "active" | "warning" | "expired";

export function getOemExpiryStatus(expiresAt: Date | string | null | undefined): OemExpiryStatus {
  if (!expiresAt) return "none";
  const exp = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(exp.getTime())) return "none";
  const now = new Date();
  if (exp < now) return "expired";
  const warnAt = new Date(now.getTime() + OEM_EXPIRY_WARNING_DAYS * 86400000);
  if (exp <= warnAt) return "warning";
  return "active";
}

export function oemExpiryLabel(status: OemExpiryStatus): string {
  switch (status) {
    case "expired":
      return "已过期";
    case "warning":
      return "即将过期";
    case "active":
      return "有效";
    default:
      return "未报备";
  }
}

export function parseOptionalDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function quarterKey(date: Date): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${q}`;
}
