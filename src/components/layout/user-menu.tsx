"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type User = { username: string; displayName: string | null; role: string };

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUser(d.user));
  }, []);

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  if (!user) return null;

  return (
    <div className="border-t border-white/5 px-4 py-4">
      <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
        <p className="truncate text-sm font-medium text-slate-200">
          {user.displayName || user.username}
        </p>
        <p className="text-xs text-cyan-400/70">
          {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
        </p>
      </div>
      <Button
        variant="ghost"
        className="mt-2 w-full justify-start !px-2 text-xs !text-slate-400 hover:!bg-cyan-500/12 hover:!text-cyan-200"
        onClick={logout}
      >
        <LogOut className="h-3.5 w-3.5" />
        退出登录
      </Button>
    </div>
  );
}

export function MobileNav({
  items,
  pathname,
}: {
  items: { href: string; label: string }[];
  pathname: string;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-white/5 bg-slate-900/90 px-2 py-2 backdrop-blur-md md:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-cyan-500/20 text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.15)]"
                : "text-slate-400 hover:bg-cyan-500/15 hover:text-cyan-200",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
