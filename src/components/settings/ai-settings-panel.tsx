"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function AiSettingsPanel() {
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyMasked, setApiKeyMasked] = useState("");
  const [configured, setConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/ai-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setBaseUrl(d.baseUrl || "");
        setModel(d.model || "");
        setApiKeyMasked(d.apiKeyMasked || "");
        setConfigured(Boolean(d.configured));
      });
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/ai-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, model, apiKey }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setApiKeyMasked(d.apiKeyMasked || "");
      setConfigured(Boolean(d.configured));
      setApiKey("");
      setMessage("已保存");
    } else {
      setMessage("保存失败");
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          AI 助手设置
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-xs text-slate-500">
          支持任何 OpenAI 兼容接口（DeepSeek、通义千问、Kimi、OpenAI 等）。配置后左侧导航将出现「AI
          助手」，可用自然语言查询和更新 CRM 数据。
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">API 地址（Base URL）</label>
            <Input
              placeholder="https://api.deepseek.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              模型名称（图片识别需视觉模型，如 GPT-4o / qwen-vl-max；DeepSeek 仅支持文字和文件）
            </label>
            <Input
              placeholder="deepseek-v4-pro"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              API Key{" "}
              {configured && (
                <span className="text-emerald-400">（已配置：{apiKeyMasked}，留空保持不变）</span>
              )}
            </label>
            <Input
              type="password"
              placeholder={configured ? "留空保持不变，输入新 Key 覆盖" : "sk-..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" disabled={saving} onClick={save}>
            {saving ? "保存中…" : "保存设置"}
          </Button>
          {message && <span className="text-xs text-slate-400">{message}</span>}
        </div>
      </CardBody>
    </Card>
  );
}
