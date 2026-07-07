import type { AiVisionSettings } from "@/lib/ai/config";

type VisionImage = { name: string; dataUrl: string };

/** 调用视觉模型识别图片内容，返回纯文本描述 */
export async function recognizeImagesWithVision(
  images: VisionImage[],
  userPrompt: string,
  vision: AiVisionSettings,
): Promise<string> {
  if (!images.length) return "";

  const prompt =
    userPrompt.trim() ||
    "请识别图片中的全部文字和关键业务信息（客户名称、联系人、产品、金额、日期等），用简体中文条理清晰地输出。";

  const content: (
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  )[] = [
    { type: "text", text: prompt },
    ...images.map((img) => ({
      type: "image_url" as const,
      image_url: { url: img.dataUrl },
    })),
  ];

  const endpoint = `${vision.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${vision.apiKey}`,
    },
    body: JSON.stringify({
      model: vision.model,
      messages: [{ role: "user", content }],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`视觉模型请求失败（${res.status}）：${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content;
  if (typeof reply === "string" && reply.trim()) return reply.trim();
  if (Array.isArray(reply)) {
    const text = reply
      .filter((p: { type?: string }) => p.type === "text")
      .map((p: { text?: string }) => p.text || "")
      .join("\n")
      .trim();
    if (text) return text;
  }
  throw new Error("视觉模型未返回有效内容");
}
