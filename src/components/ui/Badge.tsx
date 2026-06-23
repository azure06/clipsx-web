import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'cyan' | 'green' | 'yellow';
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium',
        {
          'bg-white/10 text-gray-300 border border-white/10': variant === 'default',
          'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20': variant === 'cyan',
          'bg-green-500/10 text-green-400 border border-green-500/20': variant === 'green',
          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20': variant === 'yellow',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
