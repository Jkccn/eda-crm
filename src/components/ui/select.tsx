import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full cursor-pointer rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] outline-none transition hover:border-white/25 hover:bg-slate-950/70 focus:border-cyan-400/60 focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),0_0_0_3px_rgba(34,211,238,0.12)]",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
