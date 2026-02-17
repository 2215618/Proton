import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            // Aurora Premium style
            "h-10 w-full appearance-none rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 backdrop-blur-md px-3 pr-10 text-sm shadow-elev-1 text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        >
          {children}
        </select>

        {/* Icon arrow */}
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
          <span className="material-icons text-[18px]">expand_more</span>
        </span>
      </div>
    );
  }
);

Select.displayName = "Select";
