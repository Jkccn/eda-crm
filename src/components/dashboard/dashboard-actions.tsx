"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function runRenewalCron() {
    setLoading(true);
    await fetch("/api/cron/renewals", { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="secondary" disabled={loading} onClick={runRenewalCron}>
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "运行中…" : "运行续费预警任务"}
    </Button>
  );
}
