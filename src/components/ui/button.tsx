import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "btn-glow text-white border-0",
  secondary:
    "border border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/45 hover:bg-cyan-500/12 hover:text-white hover:shadow-[0_0_16px_rgba(34,211,238,0.14)]",
  ghost:
    "text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-100 hover:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]",
  danger:
    "bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-500 hover:to-red-500 hover:shadow-[0_0_16px_rgba(244,63,94,0.25)]",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ className, variant = "primary", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
      variants[variant],
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";
