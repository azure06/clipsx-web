import { type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface SettingsActionProps {
  children: ReactNode;
  label?: string;
  description?: string;
  comingSoon?: boolean;
  notEnforced?: boolean;
  reason?: string;
  className?: string;
}

export function SettingsAction({
  children,
  label,
  description,
  comingSoon = false,
  notEnforced = false,
  reason,
  className,
}: SettingsActionProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || comingSoon || notEnforced) && (
        <div className="flex items-center gap-2">
          {label && <span className="text-sm font-medium">{label}</span>}
          {comingSoon && <Badge variant="yellow">Coming soon</Badge>}
          {notEnforced && <Badge variant="yellow">Not enforced yet</Badge>}
        </div>
      )}
      <div className={cn(comingSoon ? "pointer-events-none opacity-50" : "")}>{children}</div>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {comingSoon && reason && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{reason}</p>
      )}
    </div>
  );
}
