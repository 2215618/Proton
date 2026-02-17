import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary: cn(
        // Aurora Premium: subtle gradient + glow
        "text-white",
        "bg-primary hover:bg-primary-hover",
        "shadow-elev-1 hover:shadow-elev-2 active:shadow-elev-1",
        "relative overflow-hidden",
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 hover:before:opacity-100 before:transition-opacity",
        "before:bg-[radial-gradient(380px_180px_at_20%_30%,rgba(255,255,255,0.22),transparent_60%)]",
        "after:pointer-events-none after:absolute after:inset-0 after:opacity-0 hover:after:opacity-100 after:transition-opacity",
        "after:bg-[linear-gradient(90deg,rgba(255,255,255,0.10),transparent,rgba(255,255,255,0.08))]"
      ),
      secondary: cn(
        "text-text-main dark:text-surface-light",
        "border border-slate-200/70 dark:border-slate-700/60",
        "bg-white/70 dark:bg-surface-dark/55 backdrop-blur-md",
        "shadow-sm hover:shadow-elev-1",
        "hover:bg-white/85 dark:hover:bg-surface-dark/70"
      ),
      outline: cn(
        "text-primary",
        "border border-primary/50",
        "bg-white/10 dark:bg-surface-dark/10 backdrop-blur-md",
        "hover:bg-primary/10",
        "shadow-sm hover:shadow-elev-1"
      ),
      ghost: cn(
        "bg-transparent",
        "text-text-muted hover:text-text-main",
        "hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
      ),
      danger: cn(
        "text-white",
        "bg-danger hover:bg-red-600",
        "shadow-elev-1 hover:shadow-elev-2 active:shadow-elev-1",
        "relative overflow-hidden",
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 hover:before:opacity-100 before:transition-opacity",
        "before:bg-[radial-gradient(380px_180px_at_20%_30%,rgba(255,255,255,0.18),transparent_60%)]"
      ),
    }

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-xs rounded-lg",
      md: "h-10 px-4 py-2 text-sm rounded-xl",
      lg: "h-12 px-6 text-base rounded-xl",
    }

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium",
          "transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-background-dark",
          "disabled:opacity-50 disabled:pointer-events-none",
          sizes[size],
          variants[variant],
          // micro-interactions (safe)
          "active:translate-y-[0.5px] active:scale-[0.99]",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
