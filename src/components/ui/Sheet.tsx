"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, children, className }: SheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  if (!open) return null;

  if (isDesktop) {
    return createPortal(
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "relative z-10 flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-(--vault-border) bg-(--vault-surface) shadow-2xl",
            className,
          )}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-(--vault-muted) hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          {children}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full rounded-t-2xl border border-(--vault-border) bg-(--vault-surface) shadow-2xl",
          "max-h-[92dvh] overflow-y-auto",
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-(--vault-muted) hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function SheetTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("font-heading text-xl font-bold", className)}>{children}</h2>;
}

export function SheetDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-1.5 text-sm text-gray-600 dark:text-gray-300", className)}>{children}</p>;
}

export function SheetBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-6 pb-2 pt-6", className)}>{children}</div>;
}

export function SheetFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex justify-end gap-2 border-t border-(--vault-border) px-6 py-4", className)}>{children}</div>;
}
