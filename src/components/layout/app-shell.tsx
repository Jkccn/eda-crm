"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Kanban,
  LayoutDashboard,
  BarChart3,
  Truck,
  Headphones,
  Database,
  Users,
  Settings2,
  FileBarChart2,
} from "lucide-react";
import { GlobalSearch } from "@/components/search/global-search";
import { UserMenu, MobileNav } from "@/components/layout/user-menu";
import type { AppModule } from "@/lib/constants";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ALL_NAV: { module: AppModule; href: string; label: string; icon: typeof Building2 }[] = [
  { module: "customers", href: "/customers", label: "客户", icon: Building2 },
  { module: "opportunities", href: "/opportunities", label: "商机看板", icon: Kanban },
  { module: "dashboard", href: "/dashboard", label: "仪表盘", icon: BarChart3 },
  { module: "reports", href: "/reports", label: "信息汇报", icon: FileBarChart2 },
  { module: "vendors", href: "/vendors", label: "供应商", icon: Truck },
  { module: "support", href: "/support", label: "技术支持", icon: Headphones },
  { module: "settings", href: "/admin/settings", label: "信息配置", icon: Settings2 },
  { module: "users", href: "/admin/users", label: "用户管理", icon: Users },
  { module: "users", href: "/admin/data", label: "数据备份", icon: Database },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/customers") return pathname === "/customers" || pathname.startsWith("/customers/");
  if (href === "/opportunities") return pathname.startsWith("/opportunities");
  if (href === "/admin/users") return pathname.startsWith("/admin/users");
  if (href === "/admin/data") return pathname.startsWith("/admin/data");
  if (href === "/admin/settings") return pathname.startsWith("/admin/settings");
  if (href === "/reports") return pathname.startsWith("/reports");
  if (href === "/vendors") return pathname.startsWith("/vendors");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [modules, setModules] = useState<AppModule[] | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.modules?.length) {
          setModules(d.modules);
        } else {
          setModules(["customers", "opportunities", "dashboard", "vendors", "support"]);
        }
      })
      .catch(() => {
        setModules(["customers", "opportunities", "dashboard", "vendors", "support"]);
      });
  }, []);

  const nav = modules
    ? ALL_NAV.filter((item) => modules.includes(item.module))
    : ALL_NAV.filter((item) => item.module !== "users" && item.module !== "settings");
  const mobileNav = nav.map(({ href, label }) => ({ href, label }));

  return (
    <div className="flex h-screen overflow-hidden bg-[#060a14]">
      <aside className="app-sidebar hidden h-screen w-64 shrink-0 flex-col md:flex">
        <div className="flex shrink-0 items-center gap-3 border-b border-white/5 px-6 py-5">
          <div className="logo-glow flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <p className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-sm font-bold tracking-wide text-transparent">
              EDA CRM
            </p>
            <p className="text-[11px] text-slate-500">客户 · 商机 · 文件</p>
          </div>
        </div>
        <div className="shrink-0 px-4 pt-4">
          <GlobalSearch variant="sidebar" />
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
          {nav.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "nav-link-active"
                    : "nav-link-inactive text-slate-400",
                )}
              >
                <item.icon className={cn("h-4 w-4", active && "text-cyan-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <UserMenu />
        <p className="shrink-0 px-6 pb-4 text-[10px] uppercase tracking-widest text-slate-600">本地部署 · v1.0</p>
      </aside>
      <main
        id="app-main-scroll"
        className="app-mesh-bg h-screen min-w-0 flex-1 overflow-y-auto"
      >
        <MobileNav items={mobileNav} pathname={pathname} />
        <div className="border-b border-white/5 bg-slate-900/80 px-4 py-3 backdrop-blur-md md:hidden">
          <GlobalSearch variant="mobile" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
