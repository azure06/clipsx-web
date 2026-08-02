import { type ReactNode, type ElementType } from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon?: ElementType;
  children: ReactNode;
  danger?: boolean;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  danger = false,
  className,
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        "rounded-xl border p-6",
        danger
          ? "border-red-500/30 bg-red-500/5"
          : "border-(--vault-border) bg-(--vault-surface)",
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        {Icon && (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              danger
                ? "bg-red-500/10 text-red-500"
                : "bg-(--vault-accent-subtle) text-(--vault-accent)",
            )}
          >
            <Icon size={16} />
          </span>
        )}
        <div>
          <h3 className={cn("font-semibold", danger ? "text-red-600 dark:text-red-400" : "")}>
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
