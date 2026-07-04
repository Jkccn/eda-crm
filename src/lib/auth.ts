import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  signSession,
  verifySessionToken,
  normalizeRole,
  type SessionUser,
} from "@/lib/session";
import { normalizeUsername } from "@/lib/username";

export { SESSION_COOKIE, type SessionUser } from "@/lib/session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verify = scryptSync(password, salt, 64).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(verify));
  } catch {
    return false;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session?.id) return null;

  // 始终以数据库中的最新角色为准，避免 Cookie 中角色过期
  const dbUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, username: true, role: true, displayName: true },
  });
  if (!dbUser) return null;

  const role = normalizeRole(dbUser.role);
  if (!role) return null;

  return {
    id: dbUser.id,
    username: dbUser.username,
    role,
    displayName: dbUser.displayName,
  };
}

export async function setSessionCookie(response: NextResponse, user: SessionUser) {
  response.cookies.set(SESSION_COOKIE, await signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function requireAuth(minRole?: "admin" | "user") {
  const user = await getSessionUser();
  if (!user) return null;
  if (user.role === "readonly" && minRole) return null;
  if (minRole === "admin" && user.role !== "admin") return null;
  return user;
}

export async function authenticateUser(username: string, password: string) {
  const normalized = normalizeUsername(username);
  const user = await prisma.user.findUnique({ where: { username: normalized } });
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return {
    id: user.id,
    username: user.username,
    role: normalizeRole(user.role) || "sales",
    displayName: user.displayName,
  } satisfies SessionUser;
}
