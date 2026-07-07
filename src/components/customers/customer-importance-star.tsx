"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function CustomerImportanceStar({
  customerId,
  isImportant: initial,
  size = "md",
}: {
  customerId: string;
  isImportant: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [isImportant, setIsImportant] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;

    const next = !isImportant;
    setIsImportant(next);
    setSaving(true);
    const res = await fetch(`/api/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isImportant: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setIsImportant(!next);
      return;
    }
    startTransition(() => router.refresh());
  }

  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || saving}
      title={isImportant ? "取消重要标记" : "标记为重要客户"}
      className={cn(
        "shrink-0 rounded-lg p-1.5 transition",
        isImportant
          ? "text-amber-400 hover:bg-amber-500/15 hover:text-amber-300"
          : "text-slate-500 hover:bg-white/10 hover:text-amber-300",
        (pending || saving) && "opacity-60",
      )}
    >
      <Star className={iconClass} fill={isImportant ? "currentColor" : "none"} strokeWidth={1.75} />
    </button>
  );
}
