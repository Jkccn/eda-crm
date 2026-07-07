"use client";

import { useEffect, useState } from "react";
import { Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function AiSettingsPanel() {
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyMasked, setApiKeyMasked] = useState("");
  const [configured, setConfigured] = useState(false);

  const [visionBaseUrl, setVisionBaseUrl] = useState("");
  const [visionModel, setVisionModel] = useState("");
  const [visionApiKey, setVisionApiKey] = useState("");
  const [visionApiKeyMasked, setVisionApiKeyMasked] = useState("");
  const [visionConfigured, setVisionConfigured] = useState(false);

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
        setVisionBaseUrl(d.visionBaseUrl || "");
        setVisionModel(d.visionModel || "");
        setVisionApiKeyMasked(d.visionApiKeyMasked || "");
        setVisionConfigured(Boolean(d.visionConfigured));
      });
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/ai-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl,
        model,
        apiKey,
        visionBaseUrl,
        visionModel,
        visionApiKey,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setApiKeyMasked(d.apiKeyMasked || "");
      setConfigured(Boolean(d.configured));
      setVisionApiKeyMasked(d.visionApiKeyMasked || "");
      setVisionConfigured(Boolean(d.visionConfigured));
      setApiKey("");
      setVisionApiKey("");
      setMessage("已保存");
    } else {
      setMessage("保存失败");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            主模型（文字 + 工具调用）
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-xs text-slate-500">
            用于日常对话、CRM 数据查询与写入。推荐 DeepSeek 等支持 Function Calling 的模型。
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">API 地址</label>
              <Input
                placeholder="https://api.deepseek.com/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">模型名称</label>
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
                placeholder={configured ? "留空保持不变" : "sk-..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Eye className="h-4 w-4 text-violet-400" />
            视觉模型（图片识别）
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-xs text-slate-500">
            用户上传或粘贴图片时，先由此模型识别内容，再交给主模型处理。DeepSeek 不支持图片，需单独配置 Qwen
            等多模态模型。
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">API 地址</label>
              <Input
                placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                value={visionBaseUrl}
                onChange={(e) => setVisionBaseUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">模型名称</label>
              <Input
                placeholder="qwen3.7-plus"
                value={visionModel}
                onChange={(e) => setVisionModel(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                API Key{" "}
                {visionConfigured && (
                  <span className="text-emerald-400">
                    （已配置：{visionApiKeyMasked}，留空保持不变）
                  </span>
                )}
              </label>
              <Input
                type="password"
                placeholder={visionConfigured ? "留空保持不变" : "sk-..."}
                value={visionApiKey}
                onChange={(e) => setVisionApiKey(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="button" disabled={saving} onClick={save}>
          {saving ? "保存中…" : "保存设置"}
        </Button>
        {message && <span className="text-xs text-slate-400">{message}</span>}
      </div>
    </div>
  );
}
