"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { OPPORTUNITY_STAGES, STAGE_COLORS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export type KanbanOpportunity = {
  id: string;
  name: string;
  stage: string;
  type: string;
  dealSize: number | null;
  currency: string;
  nextStep: string | null;
  customer: { id: string; accountName: string };
  _count: { documents: number };
};

export function OpportunityKanban({
  initialOpportunities,
}: {
  initialOpportunities: KanbanOpportunity[];
}) {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const byStage = OPPORTUNITY_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = opportunities.filter((o) => o.stage === stage);
      return acc;
    },
    {} as Record<string, KanbanOpportunity[]>,
  );

  async function moveToStage(id: string, stage: string) {
    const prev = opportunities;
    setOpportunities((items) =>
      items.map((o) => (o.id === id ? { ...o, stage } : o)),
    );

    const res = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });

    if (!res.ok) {
      setOpportunities(prev);
    } else {
      router.refresh();
    }
  }

  function handleDragStart(id: string) {
    setDraggingId(id);
  }

  function handleDragEnd() {
    setDraggingId(null);
  }

  function handleDrop(stage: string) {
    if (!draggingId) return;
    const opp = opportunities.find((o) => o.id === draggingId);
    if (opp && opp.stage !== stage) {
      moveToStage(draggingId, stage);
    }
    setDraggingId(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {OPPORTUNITY_STAGES.map((stage) => (
        <div
          key={stage}
          className="flex w-72 shrink-0 flex-col"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(stage)}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Badge className={STAGE_COLORS[stage] || ""}>{stage}</Badge>
              <span className="text-xs text-slate-400">{byStage[stage].length}</span>
            </div>
          </div>
          <div className="kanban-column flex min-h-[420px] flex-col gap-2 rounded-xl p-2">
            {byStage[stage].map((opp) => (
              <Card
                key={opp.id}
                draggable
                onDragStart={() => handleDragStart(opp.id)}
                onDragEnd={handleDragEnd}
                className={`group cursor-grab transition-all duration-200 active:cursor-grabbing ${
                  draggingId === opp.id ? "opacity-50" : "hover-lift hover:border-cyan-400/50"
                }`}
              >
                <CardBody className="!py-3 !px-4">
                  <Link
                    href={`/opportunities/${opp.id}`}
                    className="block"
                  >
                    <p className="text-sm font-semibold text-slate-100 transition-colors group-hover:text-cyan-300">
                      {opp.name}
                    </p>
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    <Link
                      href={`/customers/${opp.customer.id}`}
                      className="link-hover hover:text-cyan-300"
                    >
                      {opp.customer.accountName}
                    </Link>
                    {" · "}
                    {opp.type}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">
                      {formatCurrency(opp.dealSize, opp.currency)}
                    </span>
                    <span className="text-slate-400">{opp._count.documents} 文件</span>
                  </div>
                  {opp.nextStep && (
                    <p className="mt-2 line-clamp-2 text-xs text-amber-800/80">
                      {opp.nextStep}
                    </p>
                  )}
                </CardBody>
              </Card>
            ))}
            {byStage[stage].length === 0 && (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/10 py-8 text-xs text-slate-400">
                拖入商机
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
