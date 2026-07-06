import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getAiSettings } from "@/lib/ai/config";
import { AI_TOOLS, executeAiTool } from "@/lib/ai/tools";
import { ROLE_LABELS, type UserRole } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_TOOL_ROUNDS = 8;
const MAX_ATTACHMENT_TEXT = 30_000;
const MAX_IMAGES_PER_REQUEST = 4;

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[] | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
};

type ClientAttachment = {
  kind: "text" | "image";
  name: string;
  fileToken?: string;
  text?: string;
  dataUrl?: string;
  truncated?: boolean;
};

function buildUserContent(
  content: string,
  attachments: ClientAttachment[],
): string | ContentPart[] {
  let text = content;
  const images: ContentPart[] = [];

  for (const att of attachments) {
    const tokenNote =
      typeof att.fileToken === "string" && att.fileToken ? `(fileToken: ${att.fileToken})` : "";
    if (att.kind === "text" && typeof att.text === "string") {
      const body = att.text.slice(0, MAX_ATTACHMENT_TEXT);
      text += `\n\n【附件文件：${att.name}】${tokenNote}${att.truncated ? "（内容过长，已截断）" : ""}\n${body}\n【附件结束】`;
    } else if (att.kind === "image" && typeof att.dataUrl === "string" && att.dataUrl.startsWith("data:image/")) {
      if (tokenNote) {
        text += `\n\n【附件图片：${att.name}】${tokenNote}`;
      }
      if (images.length < MAX_IMAGES_PER_REQUEST) {
        images.push({ type: "image_url", image_url: { url: att.dataUrl } });
      }
    }
  }

  if (images.length === 0) return text;
  return [{ type: "text", text }, ...images];
}

function systemPrompt(displayName: string, role: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `你是 EDA CRM 系统的 AI 助手，为一家 EDA/CAD 软件代理商服务。今天是 ${today}。
当前用户：${displayName}（角色：${ROLE_LABELS[role as UserRole] || role}）。

你可以通过工具查询和更新 CRM 数据（客户、销售机会、报价、合同、财务、License 等）。

用户可能会上传附件（PDF/Word/Excel/PPT 会以「【附件文件：xxx】(fileToken: ...) …【附件结束】」的形式附在消息中，图片会直接作为图像输入）。处理附件时：
- 仔细阅读附件内容，提取客户名称、产品、金额、币种、日期、联系人等关键信息。
- 若用户希望把附件信息录入 CRM，先用查询工具确认相关客户/商机是否已存在（避免重复创建），然后向用户列出你计划写入的字段和值，得到确认后再调用写入工具。
- 附件是报价单/合同/发票等文件时，主动建议用户把原文件归档到对应商机：确认后调用 attach_document（fileToken 取自附件标注，category 按文件类型选择，如报价单选 quote）。
- 附件中缺失的必填信息，向用户询问，不要编造。

规则：
1. 回答使用简体中文。金额需注明币种。
2. 需要数据时立即调用工具，不要凭空编造数据；工具返回为空时如实告知。
3. **任何写入操作（创建/更新客户、商机、财务记录等）之前，必须先向用户复述将要执行的操作内容，等用户明确确认后才能调用写入工具。** 用户已在上一条消息中明确确认时可以直接执行。
4. 用户要求生成报告或汇总时，优先输出 Markdown 表格，条理清晰，最后给出简短结论。
5. 你只能访问当前用户权限范围内的数据；遇到权限错误时向用户解释即可。
6. 日期格式使用 YYYY-MM-DD。`;
}

export async function POST(request: Request) {
  const { user, error } = await requireApiAuth();
  if (error) return error;

  const settings = await getAiSettings();
  if (!settings.apiKey) {
    return NextResponse.json(
      { error: "尚未配置 AI 服务。请让管理员在「信息配置 → AI 助手设置」中填写 API Key。" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const rawMessages: { role?: string; content?: unknown; attachments?: unknown }[] = Array.isArray(
    body.messages,
  )
    ? body.messages
    : [];

  const clientMessages: ChatMessage[] = rawMessages
    .filter(
      (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
    )
    .slice(-30)
    .map((m) => {
      const attachments: ClientAttachment[] = Array.isArray(m.attachments)
        ? (m.attachments as ClientAttachment[]).filter(
            (a) => a && (a.kind === "text" || a.kind === "image") && typeof a.name === "string",
          )
        : [];
      if (m.role === "user" && attachments.length > 0) {
        return { role: "user" as const, content: buildUserContent(m.content as string, attachments) };
      }
      return { role: m.role as "user" | "assistant", content: m.content as string };
    });

  if (clientMessages.length === 0 || clientMessages[clientMessages.length - 1].role !== "user") {
    return NextResponse.json({ error: "缺少用户消息" }, { status: 400 });
  }

  // DeepSeek 全系模型为纯文本接口，携带 image_url 会被直接拒绝，提前给出友好提示
  const containsImages = clientMessages.some(
    (m) => Array.isArray(m.content) && m.content.some((p) => p.type === "image_url"),
  );
  if (containsImages && /deepseek/i.test(settings.model)) {
    return NextResponse.json(
      {
        error:
          "当前配置的 DeepSeek 模型不支持图片识别。请移除图片附件（PDF/Word/Excel/PPT 文件不受影响），或让管理员在「信息配置 → AI 助手设置」中改用支持视觉的模型（如 GPT-4o、qwen-vl-max 等）。",
      },
      { status: 400 },
    );
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(user!.displayName || user!.username, user!.role) },
    ...clientMessages,
  ];

  const toolEvents: { name: string; ok: boolean; summary: string }[] = [];
  const endpoint = `${settings.baseUrl.replace(/\/+$/, "")}/chat/completions`;

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          messages,
          tools: AI_TOOLS,
          temperature: 0.2,
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        const hasImages = messages.some(
          (m) => Array.isArray(m.content) && m.content.some((p) => p.type === "image_url"),
        );
        const hint =
          hasImages && res.status < 500
            ? "（当前模型可能不支持图片识别。如需识别图片，请在「信息配置 → AI 助手设置」中改用视觉模型，如 GPT-4o、qwen-vl-max 等；PDF/Word/Excel 等文件不受影响）"
            : "";
        return NextResponse.json(
          { error: `AI 服务请求失败（${res.status}）：${detail.slice(0, 300)}${hint}` },
          { status: 502 },
        );
      }

      const data = await res.json();
      const message = data.choices?.[0]?.message as ChatMessage | undefined;
      if (!message) {
        return NextResponse.json({ error: "AI 服务返回格式异常" }, { status: 502 });
      }

      if (!message.tool_calls?.length) {
        return NextResponse.json({
          reply: message.content || "",
          toolEvents,
        });
      }

      messages.push({
        role: "assistant",
        content: message.content ?? null,
        tool_calls: message.tool_calls,
      });

      for (const call of message.tool_calls) {
        let result: unknown;
        let ok = true;
        try {
          const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
          result = await executeAiTool(user!, call.function.name, args);
        } catch (err) {
          ok = false;
          result = { error: err instanceof Error ? err.message : "工具执行失败" };
        }
        toolEvents.push({
          name: call.function.name,
          ok,
          summary: ok ? "成功" : (result as { error: string }).error,
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
        });
      }
    }

    return NextResponse.json({
      reply: "工具调用轮数超出上限，请把问题拆小一点再试。",
      toolEvents,
    });
  } catch (err) {
    console.error("POST /api/ai/chat", err);
    return NextResponse.json(
      { error: `无法连接 AI 服务：${err instanceof Error ? err.message : "未知错误"}` },
      { status: 502 },
    );
  }
}
