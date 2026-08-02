"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (options: { message: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const COLORS: Record<ToastVariant, string> = {
  success: "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100",
  error: "border-red-500/30 bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-100",
  info: "border-(--vault-border) bg-(--vault-surface) text-gray-900 dark:text-gray-100",
};

const ICON_COLORS: Record<ToastVariant, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-red-600 dark:text-red-400",
  info: "text-(--vault-accent)",
};

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const Icon = ICONS[item.variant];
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <div
      className={cn(
        "flex w-80 items-start gap-3 rounded-xl border px-4 py-3 shadow-lg",
        COLORS[item.variant],
      )}
    >
      <Icon size={18} className={cn("mt-0.5 shrink-0", ICON_COLORS[item.variant])} />
      <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ message, variant = "info" }: { message: string; variant?: ToastVariant }) => {
    const id = `toast-${++counter.current}`;
    setToasts((prev) => [...prev.slice(-4), { id, message, variant }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {typeof window !== "undefined" && toasts.length > 0 &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2">
            {toasts.map((item) => (
              <ToastItem key={item.id} item={item} onDismiss={dismiss} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
