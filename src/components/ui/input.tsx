import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/20 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputClass, className)} {...props} />
  ),
);
Input.displayName = "Input";
