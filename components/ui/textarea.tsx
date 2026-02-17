import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        // Aurora Premium: glass + bordes suaves + dark mode
        "min-h-[96px] w-full rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 backdrop-blur-md px-3 py-2 text-sm shadow-elev-1 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";
