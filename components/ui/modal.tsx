"use client";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ModalSize = "sm" | "md" | "lg";
const SIZE: Record<ModalSize, string> = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Dialog */}
      <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "w-full rounded-2xl border border-white/70 dark:border-slate-700/60 ",
            "bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl ",
            "shadow-elev-2 overflow-hidden",
            SIZE[size]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle aurora glow */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-[520px] rounded-full bg-primary/15 blur-3xl" />

          {(title || description) && (
            <div className="relative border-b border-slate-200/60 dark:border-slate-700/60 px-5 py-4 bg-white/35 dark:bg-slate-900/15">
              {title && <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>}
              {description && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
              )}
            </div>
          )}

          <div className="relative px-5 py-4">{children}</div>

          <div className="relative border-t border-slate-200/60 dark:border-slate-700/60 px-5 py-4 flex items-center justify-end gap-2 bg-white/30 dark:bg-slate-900/10">
            {footer ?? (
              <Button variant="secondary" onClick={onClose}>
                Cerrar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
