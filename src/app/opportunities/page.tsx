import { OpportunityKanban } from "@/components/opportunities/opportunity-kanban";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEngineer, opportunityScopeWhere } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OpportunitiesKanbanPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isEngineer(user.role)) redirect("/support");

  const opportunities = await prisma.opportunity.findMany({
    where: { ...opportunityScopeWhere(user), stage: { not: "Lost" } },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { id: true, accountName: true } },
      _count: { select: { documents: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">商机看板</h1>
        <p className="mt-1 text-sm text-slate-500">
          拖拽卡片切换阶段 · 点击卡片进入详情
        </p>
      </div>
      <OpportunityKanban initialOpportunities={opportunities} />
    </div>
  );
}
