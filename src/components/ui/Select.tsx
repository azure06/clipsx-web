import { type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, id, children, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          "block w-full rounded-lg border border-(--vault-border) bg-(--vault-surface) px-3 py-2 text-sm",
          "focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  ),
);
Select.displayName = "Select";
