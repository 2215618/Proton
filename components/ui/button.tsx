import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary:
        "bg-primary text-white hover:bg-primary-hover shadow-elev-1 hover:shadow-elev-2 active:shadow-elev-1",
      secondary:
        "bg-white/80 text-text-main border border-slate-200/70 hover:bg-white shadow-sm hover:shadow-elev-1 dark:bg-surface-dark/80 dark:text-surface-light dark:border-slate-700/60",
      outline:
        "bg-transparent border border-primary/70 text-primary hover:bg-primary/10 shadow-sm hover:shadow-elev-1",
      ghost:
        "bg-transparent text-text-muted hover:text-text-main hover:bg-slate-100/80 dark:hover:bg-slate-800/60",
      danger:
        "bg-danger text-white hover:bg-red-600 shadow-elev-1 hover:shadow-elev-2 active:shadow-elev-1",
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
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-background-dark disabled:opacity-50 disabled:pointer-events-none",
          sizes[size],
          variants[variant],
          "active:translate-y-[0.5px]",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
