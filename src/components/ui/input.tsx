import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] outline-none transition placeholder:text-slate-500 hover:border-white/25 hover:bg-slate-950/70 focus:border-cyan-400/60 focus:bg-slate-950/80 focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),0_0_0_3px_rgba(34,211,238,0.12)]";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      // 数字输入框滚轮会误改数值，聚焦时禁用滚轮修改
      onWheel={type === "number" ? (e) => (e.target as HTMLInputElement).blur() : undefined}
      className={cn(inputClass, className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";
