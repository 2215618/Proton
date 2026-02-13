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
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
        <div
          role="dialog"
          aria-modal="true"
          className={cn("w-full rounded-2xl border border-slate-200 bg-white shadow-xl", SIZE[size])}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description) && (
            <div className="border-b border-slate-200/70 px-5 py-4">
              {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
              {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
            </div>
          )}

          <div className="px-5 py-4">{children}</div>

          <div className="border-t border-slate-200/70 px-5 py-4 flex items-center justify-end gap-2">
            {footer ?? <Button variant="secondary" onClick={onClose}>Cerrar</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
