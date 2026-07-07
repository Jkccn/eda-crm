import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getAiSettings, getVisionSettings } from "@/lib/ai/config";
import { recognizeImagesWithVision } from "@/lib/ai/vision";
import { AI_TOOLS, executeAiTool } from "@/lib/ai/tools";
import { ROLE_LABELS, type UserRole } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_TOOL_ROUNDS = 8;
const MAX_ATTACHMENT_TEXT = 30_000;

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
): string {
  let text = content || "";

  for (const att of attachments) {
    const tokenNote =
      typeof att.fileToken === "string" && att.fileToken ? `(fileToken: ${att.fileToken})` : "";
    if (att.kind === "text" && typeof att.text === "string") {
      const body = att.text.slice(0, MAX_ATTACHMENT_TEXT);
      text += `\n\n【附件文件：${att.name}】${tokenNote}${att.truncated ? "（内容过长，已截断）" : ""}\n${body}\n【附件结束】`;
    } else if (att.kind === "image" && tokenNote) {
      text += `\n\n【附件图片：${att.name}】${tokenNote}`;
    }
  }

  return text.trim() || "请阅读附件内容。";
}

async function buildUserMessage(
  content: string,
  attachments: ClientAttachment[],
  vision: ReturnType<typeof getVisionSettings>,
): Promise<string> {
  const images = attachments
    .filter(
      (a) =>
        a.kind === "image" &&
        typeof a.dataUrl === "string" &&
        a.dataUrl.startsWith("data:image/"),
    )
    .map((a) => ({ name: a.name, dataUrl: a.dataUrl! }));

  let text = buildUserContent(content, attachments);

  if (images.length > 0) {
    if (!vision) {
      throw new Error(
        "消息包含图片，但尚未配置视觉模型。请在「信息配置 → AI 助手设置」中填写视觉模型（如 Qwen3.7-Plus）的 API 地址和 Key。",
      );
    }
    const visionText = await recognizeImagesWithVision(images, content, vision);
    text += `\n\n【图片识别结果（${vision.model}）】\n${visionText}`;
  }

  return text;
}

function systemPrompt(displayName: string, role: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `你是 EDA CRM 系统的 AI 助手，为一家 EDA/CAD 软件代理商服务。今天是 ${today}。
当前用户：${displayName}（角色：${ROLE_LABELS[role as UserRole] || role}）。

你可以通过工具查询和更新 CRM 数据（客户、销售机会、报价、合同、财务、License 等）。

用户可能会上传附件（PDF/Word/Excel/PPT 会以「【附件文件：xxx】(fileToken: ...) …【附件结束】」的形式附在消息中；图片会先由视觉模型识别为文字「【图片识别结果】…」再交给你处理）。处理附件时：
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

  const vision = getVisionSettings(settings);

  const body = await request.json();
  const rawMessages: { role?: string; content?: unknown; attachments?: unknown }[] = Array.isArray(
    body.messages,
  )
    ? body.messages
    : [];

  const parsed = rawMessages
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
      return {
        role: m.role as "user" | "assistant",
        content: m.content as string,
        attachments,
      };
    });

  if (parsed.length === 0 || parsed[parsed.length - 1].role !== "user") {
    return NextResponse.json({ error: "缺少用户消息" }, { status: 400 });
  }

  let clientMessages: ChatMessage[];
  try {
    const lastIdx = parsed.length - 1;
    clientMessages = await Promise.all(
      parsed.map(async (m, idx) => {
        if (m.role === "user" && m.attachments.length > 0) {
          // 仅对当前轮次做视觉识别，历史图片信息已在上下文中
          if (idx !== lastIdx) {
            const textOnly = m.attachments.filter((a) => a.kind !== "image");
            let content = buildUserContent(m.content, textOnly);
            if (m.attachments.some((a) => a.kind === "image")) {
              content += "\n\n（此消息曾包含图片附件）";
            }
            return { role: "user" as const, content };
          }
          return {
            role: "user" as const,
            content: await buildUserMessage(m.content, m.attachments, vision),
          };
        }
        return { role: m.role, content: m.content };
      }),
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "附件处理失败" },
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
        return NextResponse.json(
          { error: `AI 服务请求失败（${res.status}）：${detail.slice(0, 300)}` },
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
