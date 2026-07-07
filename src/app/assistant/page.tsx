import { redirect } from "next/navigation";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule } from "@/lib/rbac";
import { getAiSettings } from "@/lib/ai/config";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccessModule(user.role, "ai")) redirect("/");

  const settings = await getAiSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">AI 助手</h1>
        <p className="page-subtitle">
          自然语言查询 CRM 数据、生成报告表格、快速录入更新信息
        </p>
      </div>
      <AssistantChat
        configured={Boolean(settings.apiKey)}
        visionConfigured={Boolean(settings.visionApiKey && settings.visionBaseUrl)}
      />
    </div>
  );
}
