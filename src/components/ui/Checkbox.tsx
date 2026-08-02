import { type InputHTMLAttributes, forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm select-none">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border border-(--vault-border) bg-(--vault-surface)",
          "checked:accent-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1",
          "cursor-pointer",
          className,
        )}
        {...props}
      />
      {label && <span>{label}</span>}
    </label>
  ),
);
Checkbox.displayName = "Checkbox";
