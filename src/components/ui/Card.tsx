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
          ? 'bg-black/3 border-gray-200/70 backdrop-blur-md dark:bg-white/5 dark:border-white/10'
          : 'bg-white border-gray-200 dark:bg-gray-900/60 dark:border-gray-800',
        className
      )}
    >
      {children}
    </div>
  );
}
