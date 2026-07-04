import { redirect } from "next/navigation";
import { ReportsClient } from "@/components/reports/reports-client";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, isEngineer } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isEngineer(user.role)) redirect("/support");
  if (!canAccessModule(user.role, "reports")) redirect("/dashboard");
  return <ReportsClient />;
}
