"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DEFAULT_INDUSTRIES, DEFAULT_REGIONS } from "@/lib/constants";

async function fetchConfigValues(url: string, fallback: readonly string[]) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [...fallback];
    const text = await res.text();
    if (!text.trim()) return [...fallback];
    const data = JSON.parse(text) as { values?: string[] };
    return Array.isArray(data.values) ? data.values : [...fallback];
  } catch {
    return [...fallback];
  }
}

export function ConfigOptionsPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [regions, setRegions] = useState<string[]>([...DEFAULT_REGIONS]);
  const [industries, setIndustries] = useState<string[]>([...DEFAULT_INDUSTRIES]);
  const [newRegion, setNewRegion] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setIsAdmin(d.user?.role === "admin"));
    Promise.all([
      fetchConfigValues("/api/config/regions", DEFAULT_REGIONS),
      fetchConfigValues("/api/config/industries", DEFAULT_INDUSTRIES),
    ]).then(([r, i]) => {
      setRegions(r);
      setIndustries(i);
    });
  }, []);

  if (!isAdmin) return null;

  async function save(key: "regions" | "industries", values: string[]) {
    setSaving(true);
    await fetch(`/api/config/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-800">区域与行业配置</h2>
        <p className="text-xs text-slate-500">管理员可维护客户表单中的区域、行业选项</p>
      </CardHeader>
      <CardBody className="grid gap-6 lg:grid-cols-2">
        <ConfigList
          label="区域"
          items={regions}
          newValue={newRegion}
          onNewChange={setNewRegion}
          onAdd={() => {
            if (!newRegion.trim()) return;
            const next = [...regions, newRegion.trim()];
            setRegions(next);
            setNewRegion("");
            save("regions", next);
          }}
          onRemove={(idx) => {
            const next = regions.filter((_, i) => i !== idx);
            setRegions(next);
            save("regions", next);
          }}
          saving={saving}
        />
        <ConfigList
          label="行业"
          items={industries}
          newValue={newIndustry}
          onNewChange={setNewIndustry}
          onAdd={() => {
            if (!newIndustry.trim()) return;
            const next = [...industries, newIndustry.trim()];
            setIndustries(next);
            setNewIndustry("");
            save("industries", next);
          }}
          onRemove={(idx) => {
            const next = industries.filter((_, i) => i !== idx);
            setIndustries(next);
            save("industries", next);
          }}
          saving={saving}
        />
      </CardBody>
    </Card>
  );
}

function ConfigList({
  label,
  items,
  newValue,
  onNewChange,
  onAdd,
  onRemove,
  saving,
}: {
  label: string;
  items: string[];
  newValue: string;
  onNewChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  saving: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      <ul className="mb-3 space-y-1">
        {items.map((item, idx) => (
          <li key={item} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
            {item}
            <button type="button" className="text-xs text-red-600" onClick={() => onRemove(idx)}>删除</button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={newValue} onChange={(e) => onNewChange(e.target.value)} placeholder={`新增${label}`} />
        <Button type="button" variant="secondary" disabled={saving} onClick={onAdd}>添加</Button>
      </div>
    </div>
  );
}
