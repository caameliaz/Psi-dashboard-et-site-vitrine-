const statusConfig: Record<string, { dot: string; text: string; bg: string }> = {
  'En attente':          { dot: '#F59E0B', text: '#92400E', bg: '#FFFBEB' },
  'Contacté':            { dot: '#3B82F6', text: '#1E40AF', bg: '#EFF6FF' },
  'Validé':              { dot: '#22C55E', text: '#166534', bg: '#F0FDF4' },
  'Annulé':              { dot: '#EF4444', text: '#991B1B', bg: '#FEF2F2' },
  'Annulation en attente': { dot: '#EF4444', text: '#991B1B', bg: '#FEF2F2' },
};

export function StatusPill({ status, small }: { status: string; small?: boolean }) {
  const cfg = statusConfig[status] ?? { dot: '#8A9BB5', text: '#374151', bg: '#F9FAFB' };
  const size = small ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${size}`}
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {status}
    </span>
  );
}
