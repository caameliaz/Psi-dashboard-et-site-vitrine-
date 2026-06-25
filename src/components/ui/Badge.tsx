interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  const variantClasses = {
    default: 'bg-zinc-100 text-zinc-900',
    success: 'bg-green-100 text-green-900',
    warning: 'bg-yellow-100 text-yellow-900',
    danger: 'bg-red-100 text-red-900',
  };

  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
