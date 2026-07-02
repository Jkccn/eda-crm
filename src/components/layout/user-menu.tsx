"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";

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
    <div className="border-t border-slate-100 px-4 py-4">
      <p className="truncate text-sm font-medium text-slate-800">
        {user.displayName || user.username}
      </p>
      <p className="text-xs text-slate-400">
        {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
      </p>
      <Button variant="ghost" className="mt-2 w-full justify-start !px-2 text-xs" onClick={logout}>
        <LogOut className="h-3.5 w-3.5" />
        退出登录
      </Button>
    </div>
  );
}

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 md:hidden">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-indigo-50"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
