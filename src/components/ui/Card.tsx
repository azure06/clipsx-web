import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  frosted?: boolean;
}

export function Card({ children, className, frosted = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border',
        frosted
          ? 'border-violet-300/15 bg-white/5 backdrop-blur-md'
          : 'border-(--ui-border) bg-(--ui-surface)',
        className
      )}
    >
      {children}
    </div>
  );
}
