"use client";

import Link from "next/link";
import {
  Building2,
  Kanban,
  LayoutDashboard,
  BarChart3,
  Truck,
  Headphones,
  Database,
  Users,
} from "lucide-react";
import { GlobalSearch } from "@/components/search/global-search";
import { UserMenu, MobileNav } from "@/components/layout/user-menu";
import type { AppModule } from "@/lib/constants";
import { useEffect, useState } from "react";

const ALL_NAV: { module: AppModule; href: string; label: string; icon: typeof Building2 }[] = [
  { module: "customers", href: "/customers", label: "客户", icon: Building2 },
  { module: "opportunities", href: "/opportunities", label: "商机看板", icon: Kanban },
  { module: "dashboard", href: "/dashboard", label: "仪表盘", icon: BarChart3 },
  { module: "vendors", href: "/vendors", label: "供应商", icon: Truck },
  { module: "support", href: "/support", label: "技术支持", icon: Headphones },
  { module: "users", href: "/admin/users", label: "用户管理", icon: Users },
  { module: "users", href: "/admin/data", label: "数据备份", icon: Database },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [modules, setModules] = useState<AppModule[] | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.modules?.length) {
          setModules(d.modules);
        } else {
          // 权限加载失败时回退显示基础导航，避免侧边栏空白
          setModules(["customers", "opportunities", "dashboard", "vendors", "support"]);
        }
      })
      .catch(() => {
        setModules(["customers", "opportunities", "dashboard", "vendors", "support"]);
      });
  }, []);

  const nav = modules
    ? ALL_NAV.filter((item) => modules.includes(item.module))
    : ALL_NAV.filter((item) => item.module !== "users");
  const mobileNav = nav.map(({ href, label }) => ({ href, label }));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">EDA CRM</p>
            <p className="text-xs text-slate-500">客户 · 商机 · 文件</p>
          </div>
        </div>
        <div className="px-4 pt-4">
          <GlobalSearch />
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <UserMenu />
        <p className="px-6 pb-4 text-xs text-slate-400">本地部署 · v1.0</p>
      </aside>
      <main className="flex-1 overflow-auto">
        <MobileNav items={mobileNav} />
        <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <GlobalSearch />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
