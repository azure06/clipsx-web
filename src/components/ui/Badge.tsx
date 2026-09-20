import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'cyan' | 'violet' | 'green' | 'yellow';
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium',
        {
          'border border-(--ui-border) bg-(--ui-muted) text-(--ui-text-muted)': variant === 'default',
          'border border-blue-400/25 bg-blue-400/10 text-blue-700 dark:text-blue-300': variant === 'cyan',
          'border border-violet-400/25 bg-violet-400/10 text-violet-700 dark:text-violet-300': variant === 'violet',
          'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20': variant === 'green',
          'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20': variant === 'yellow',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
