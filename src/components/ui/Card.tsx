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
          ? 'bg-white/5 border-white/10 backdrop-blur-md'
          : 'bg-gray-900/60 border-gray-800',
        className
      )}
    >
      {children}
    </div>
  );
}
