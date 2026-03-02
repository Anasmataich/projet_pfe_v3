import { cn } from '@/utils/helpers';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/25',
  success: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25',
  danger: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/25',
  info: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25',
};

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  );
}
