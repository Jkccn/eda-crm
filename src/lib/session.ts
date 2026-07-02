import { USER_ROLES, type UserRole } from "@/lib/constants";

export const SESSION_COOKIE = "eda_session";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: string;
  username: string;
  role: string;
  displayName: string | null;
};

/** 兼容旧版角色值，统一映射到当前四角色体系 */
export function normalizeRole(role: string): UserRole | null {
  const r = role.trim().toLowerCase();
  if (r === "user" || r === "readonly") return "sales";
  if ((USER_ROLES as readonly string[]).includes(r)) return r as UserRole;
  return null;
}

function getSecret() {
  return process.env.SESSION_SECRET || "eda-crm-dev-secret-change-me";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSha256(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toBase64Url(new Uint8Array(signature));
}

export async function signSession(user: SessionUser): Promise<string> {
  const payload = {
    ...user,
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const data = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSha256(data, getSecret());
  return `${data}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = await hmacSha256(data, getSecret());
  if (sig !== expected) return null;
  try {
    const json = new TextDecoder().decode(fromBase64Url(data));
    const payload = JSON.parse(json);
    if (payload.exp < Date.now()) return null;
    const role = normalizeRole(payload.role);
    if (!role) return null;
    if (!payload.id || !payload.username) return null;
    return {
      id: payload.id,
      username: payload.username,
      role,
      displayName: payload.displayName ?? null,
    };
  } catch {
    return null;
  }
}
