import { redirect } from "next/navigation";
import { AiSettingsPanel } from "@/components/settings/ai-settings-panel";
import { ConfigOptionsPanel } from "@/components/settings/config-options-panel";
import { getSessionUser } from "@/lib/auth";
import { canManageSettings } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canManageSettings(user.role)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">信息配置</h1>
        <p className="page-subtitle">维护区域与行业等基础选项，以及 AI 助手接入配置</p>
      </div>
      <ConfigOptionsPanel standalone />
      <AiSettingsPanel />
    </div>
  );
}
