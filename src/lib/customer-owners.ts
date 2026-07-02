import { prisma } from "@/lib/prisma";
import { SALES_OWNER_ROLES } from "@/lib/constants";
import { userDisplayName } from "@/lib/user-display";
import { isSalesScoped } from "@/lib/rbac";
import type { SessionUser } from "@/lib/session";

type OwnerBody = {
  ownerUserId?: string | null;
  aeUserId?: string | null;
  ownerName?: string | null;
  aeName?: string | null;
};

export async function resolveCustomerOwners(body: OwnerBody, user: SessionUser) {
  let ownerUserId: string | null = null;
  let ownerName: string | null = null;

  if (isSalesScoped(user.role)) {
    ownerUserId = user.id;
    ownerName = user.displayName || user.username;
  } else if (body.ownerUserId) {
    const owner = await prisma.user.findUnique({
      where: { id: body.ownerUserId },
      select: { id: true, role: true, displayName: true, username: true },
    });
    if (owner && (SALES_OWNER_ROLES as readonly string[]).includes(owner.role)) {
      ownerUserId = owner.id;
      ownerName = userDisplayName(owner);
    }
  } else if (body.ownerUserId === "" || body.ownerUserId === null) {
    ownerUserId = null;
    ownerName = null;
  }

  let aeName: string | null = null;
  if (body.aeUserId) {
    const tech = await prisma.user.findUnique({
      where: { id: body.aeUserId },
      select: { role: true, displayName: true, username: true },
    });
    if (tech?.role === "engineer") {
      aeName = userDisplayName(tech);
    }
  }

  return { ownerUserId, ownerName, aeName };
}
