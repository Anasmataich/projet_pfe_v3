import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/utils/helpers';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const config: Record<AlertVariant, { icon: React.ElementType; className: string }> = {
  info:    { icon: Info,          className: 'alert-info' },
  success: { icon: CheckCircle,   className: 'alert-success' },
  warning: { icon: AlertTriangle, className: 'alert-warning' },
  error:   { icon: XCircle,       className: 'alert-error' },
};

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const c = config[variant];
  const Icon = c.icon;
  return (
    <div className={cn('flex gap-3', c.className, className)}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="text-sm">
        {title && <p className="font-medium mb-1">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
