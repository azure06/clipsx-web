import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-linear-to-r from-blue-500 to-violet-500 text-white hover:brightness-110 shadow-lg shadow-violet-950/30',
        brand:
          'bg-violet-500 text-white hover:bg-violet-400 shadow-lg shadow-violet-500/20',
        secondary:
          'border border-(--ui-border-strong) bg-(--ui-surface-raised) text-(--ui-text) hover:border-violet-400 hover:bg-(--ui-accent-subtle) backdrop-blur-sm',
        outline:
          'border border-violet-400/50 text-(--ui-violet-strong) hover:border-violet-400 hover:bg-(--ui-accent-subtle)',
        ghost: 'text-(--ui-text-muted) hover:bg-(--ui-muted) hover:text-(--ui-text)',
        danger: 'bg-red-600 text-white hover:bg-red-500',
      },
      size: {
        sm: 'h-8 px-4 text-sm',
        md: 'h-11 px-6 text-sm',
        lg: 'h-13 px-8 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
