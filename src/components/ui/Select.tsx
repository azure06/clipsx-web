"use client";

import { Children, forwardRef, isValidElement, useId, type ReactNode } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

type SelectChangeEvent = { target: { value: string } };

interface SelectProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  label?: string;
  onChange?: (event: SelectChangeEvent) => void;
  value?: string | number;
}

type OptionProps = {
  children?: ReactNode;
  disabled?: boolean;
  value?: string | number;
};

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ children, className, disabled, id, label, onChange, value }, ref) => {
    const generatedId = useId();
    const triggerId = id ?? generatedId;
    const options = Children.toArray(children).filter(isValidElement<OptionProps>);

    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        {label && (
          <label htmlFor={triggerId} className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {label}
          </label>
        )}
        <SelectPrimitive.Root
          value={value === undefined ? undefined : String(value)}
          onValueChange={(nextValue) => onChange?.({ target: { value: nextValue } })}
          disabled={disabled}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={triggerId}
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-(--vault-border) bg-(--vault-surface) px-3 text-sm",
              "focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
          >
            <SelectPrimitive.Value />
            <SelectPrimitive.Icon asChild>
              <ChevronDown size={15} className="shrink-0 text-gray-400" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={4}
              className="z-50 min-w-(--radix-select-trigger-width) overflow-hidden rounded-lg border border-(--vault-border) bg-(--vault-surface) text-gray-900 shadow-lg dark:text-gray-100"
            >
              <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center text-gray-500">
                <ChevronUp size={14} />
              </SelectPrimitive.ScrollUpButton>
              <SelectPrimitive.Viewport className="p-1">
                {options.map((option, index) => {
                  const optionValue = option.props.value;
                  if (optionValue === undefined) return null;
                  return (
                    <SelectPrimitive.Item
                      key={option.key ?? `${String(optionValue)}-${index}`}
                      value={String(optionValue)}
                      disabled={option.props.disabled}
                      className="relative flex cursor-default select-none items-center rounded-md py-2 pr-8 pl-3 text-sm outline-none data-[highlighted]:bg-(--vault-accent-subtle) data-[highlighted]:text-(--vault-accent) data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    >
                      <SelectPrimitive.ItemText>{option.props.children}</SelectPrimitive.ItemText>
                      <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex items-center">
                        <Check size={14} />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  );
                })}
              </SelectPrimitive.Viewport>
              <SelectPrimitive.ScrollDownButton className="flex h-7 items-center justify-center text-gray-500">
                <ChevronDown size={14} />
              </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      </div>
    );
  },
);
Select.displayName = "Select";
