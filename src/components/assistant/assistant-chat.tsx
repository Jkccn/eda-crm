"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
  RotateCcw,
  Send,
  Sparkles,
  User,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/assistant/markdown";
import { cn } from "@/lib/utils";

type ToolEvent = { name: string; ok: boolean; summary: string };

type Attachment = {
  kind: "text" | "image";
  name: string;
  fileToken?: string;
  text?: string;
  dataUrl?: string;
  truncated?: boolean;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  toolEvents?: ToolEvent[];
  error?: boolean;
};

const TOOL_LABELS: Record<string, string> = {
  list_customers: "查询客户",
  get_customer: "读取客户详情",
  list_opportunities: "查询商机",
  get_opportunity: "读取商机详情",
  sales_summary: "销售汇总",
  list_expiring_licenses: "查询到期 License",
  list_overdue_invoices: "查询逾期发票",
  create_customer: "创建客户",
  update_customer: "更新客户",
  create_contact: "添加联系人",
  create_opportunity: "创建商机",
  update_opportunity: "更新商机",
  create_finance_record: "添加财务记录",
  update_finance_record: "更新财务记录",
  create_quote: "创建报价",
  update_quote: "更新报价",
  attach_document: "归档文件",
};

const SUGGESTIONS = [
  "本季度销售情况怎么样？给我一份汇总报告",
  "哪些客户的 License 即将到期？",
  "列出所有逾期未回款的发票",
  "上传一份报价单，让我帮你录入 CRM",
];

const ACCEPT =
  ".pdf,.docx,.doc,.xlsx,.xls,.csv,.pptx,.ppt,.txt,.md,.json,.png,.jpg,.jpeg,.gif,.webp";

function attachmentIcon(att: Attachment) {
  if (att.kind === "image") return <ImageIcon className="h-3.5 w-3.5" />;
  if (/\.(xlsx?|csv)$/i.test(att.name)) return <FileSpreadsheet className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

function AttachmentChip({
  att,
  onRemove,
}: {
  att: Attachment;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300">
      {att.kind === "image" && att.dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={att.dataUrl} alt={att.name} className="h-8 w-8 rounded object-cover" />
      ) : (
        attachmentIcon(att)
      )}
      <span className="max-w-[10rem] truncate" title={att.name}>
        {att.name}
      </span>
      {att.truncated && <span className="text-[10px] text-amber-400">已截断</span>}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-0.5 text-slate-500 transition hover:bg-white/10 hover:text-rose-300"
          title="移除附件"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export function AssistantChat({ configured }: { configured: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function uploadFiles(files: File[]) {
    if (!files.length || !configured) return;
    setUploadError("");
    setUploading(true);
    try {
      for (const file of files.slice(0, 5)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/ai/extract", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setUploadError(data.error || `「${file.name}」解析失败`);
          continue;
        }
        setAttachments((prev) => [...prev, data as Attachment]);
      }
    } catch {
      setUploadError("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData?.files || []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length > 0) {
      e.preventDefault();
      uploadFiles(files);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) uploadFiles(files);
  }

  async function send(text: string) {
    const content = text.trim();
    if ((!content && attachments.length === 0) || loading || uploading) return;

    const userMessage: Message = {
      role: "user",
      content: content || "请阅读附件内容。",
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    const nextMessages: Message[] = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setAttachments([]);
    setUploadError("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content, attachments }) => ({
            role,
            content,
            attachments,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error || "请求失败，请稍后重试。", error: true },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply || "（无回复）", toolEvents: data.toolEvents },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "网络错误，无法连接服务器。", error: true },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div
      className={cn(
        "flex h-[calc(100vh-11rem)] min-h-[24rem] flex-col overflow-hidden rounded-2xl border bg-slate-900/50 backdrop-blur-md transition-colors",
        dragOver ? "border-cyan-400/60" : "border-white/10",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (configured) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="logo-glow flex h-14 w-14 items-center justify-center rounded-2xl text-white">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-100">CRM AI 助手</p>
              <p className="mt-1 max-w-md text-sm text-slate-400">
                用自然语言查询客户、商机、财务数据，生成报告表格，或让我帮你录入和更新数据。
                支持上传 PDF/Word/Excel/PPT 或粘贴图片，AI 会读取内容并帮你填写 CRM。
              </p>
            </div>
            {!configured ? (
              <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
                尚未配置 AI 服务，请联系管理员在「信息配置」中填写大模型 API Key。
              </p>
            ) : (
              <div className="flex max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      s.includes("上传") ? fileRef.current?.click() : send(s)
                    }
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, idx) => (
          <div key={idx} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                m.role === "user"
                  ? "bg-gradient-to-br from-cyan-500 to-indigo-500 text-white"
                  : "border border-white/10 bg-white/5 text-cyan-300",
              )}
            >
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div
              className={cn(
                "max-w-[85%] space-y-2 rounded-2xl px-4 py-3",
                m.role === "user"
                  ? "bg-gradient-to-br from-cyan-500/20 to-indigo-500/15 text-slate-100"
                  : m.error
                    ? "border border-rose-400/30 bg-rose-500/10"
                    : "border border-white/10 bg-white/[0.04]",
              )}
            >
              {m.toolEvents && m.toolEvents.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.toolEvents.map((t, ti) => (
                    <span
                      key={ti}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                        t.ok
                          ? "bg-cyan-500/15 text-cyan-300"
                          : "bg-rose-500/15 text-rose-300",
                      )}
                      title={t.summary}
                    >
                      <Wrench className="h-3 w-3" />
                      {TOOL_LABELS[t.name] || t.name}
                    </span>
                  ))}
                </div>
              )}
              {m.attachments && m.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.attachments.map((att, ai) => (
                    <AttachmentChip key={ai} att={att} />
                  ))}
                </div>
              )}
              {m.role === "user" ? (
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
              ) : m.error ? (
                <p className="text-sm text-rose-300">{m.content}</p>
              ) : (
                <Markdown content={m.content} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-cyan-300">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              思考中（可能需要查询数据）…
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-3 sm:p-4">
        {(attachments.length > 0 || uploading || uploadError) && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {attachments.map((att, i) => (
              <AttachmentChip
                key={i}
                att={att}
                onRemove={() => setAttachments((prev) => prev.filter((_, pi) => pi !== i))}
              />
            ))}
            {uploading && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                解析文件中…
              </span>
            )}
            {uploadError && <span className="text-xs text-rose-400">{uploadError}</span>}
          </div>
        )}
        <div className="flex items-end gap-2">
          {messages.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              className="!px-2.5 shrink-0"
              title="清空对话"
              onClick={() => {
                setMessages([]);
                setAttachments([]);
                setUploadError("");
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              uploadFiles(Array.from(e.target.files || []));
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            className="!px-2.5 shrink-0"
            title="上传文件（PDF / Word / Excel / PPT / 图片）"
            disabled={!configured || loading || uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <textarea
            ref={inputRef}
            rows={Math.min(4, Math.max(1, input.split("\n").length))}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              configured
                ? "输入问题，Enter 发送；可粘贴图片或拖入文件…"
                : "AI 服务未配置"
            }
            disabled={!configured || loading}
            className="input-dark w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-50"
          />
          <Button
            type="button"
            disabled={
              !configured || loading || uploading || (!input.trim() && attachments.length === 0)
            }
            onClick={() => send(input)}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
            发送
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          AI 可查询你权限范围内的 CRM 数据；创建/修改数据前会先与你确认。支持上传
          PDF、Word、Excel、PPT、文本及图片（图片需模型支持视觉）。回复内容仅供参考，请核实后使用。
        </p>
      </div>
    </div>
  );
}
