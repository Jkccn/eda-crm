"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text.trim()) return `登录失败（HTTP ${res.status}）`;
    const data = JSON.parse(text) as { error?: string };
    return data.error || "登录失败";
  } catch {
    return `登录失败（HTTP ${res.status}）`;
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const from = searchParams.get("from") || "/customers";
        router.push(from);
        router.refresh();
      } else {
        setError(await readErrorMessage(res));
      }
    } catch {
      setError("无法连接服务器，请确认开发服务已启动");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-mesh flex min-h-screen items-center justify-center px-4">
      <div className="login-card w-full max-w-sm rounded-2xl p-8">
        <div className="mb-8 text-center">
          <div className="logo-glow mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white">
            <LayoutDashboard className="h-7 w-7" />
          </div>
          <h1 className="bg-gradient-to-r from-cyan-300 via-white to-indigo-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            EDA CRM
          </h1>
          <p className="mt-2 text-sm text-slate-400">登录以继续</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">用户名</label>
            <Input
              required
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            <p className="mt-1 text-[10px] text-slate-600">用户名不区分大小写</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">密码</label>
            <Input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <p className="mt-1 text-[10px] text-slate-600">密码区分大小写</p>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "登录中…" : "登录"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
