const statusConfig: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  'En attente': { dot: '#F97316', text: '#9A3412', bg: '#FFF7ED', border: '#FED7AA' },
  'Confirmé':   { dot: '#8B5CF6', text: '#5B21B6', bg: '#F5F3FF', border: '#DDD6FE' },
  'Livré':      { dot: '#22C55E', text: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
  'Annulé':     { dot: '#6B7280', text: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
};

export function StatusPill({ status, small }: { status: string; small?: boolean }) {
  const cfg = statusConfig[status] ?? { dot: '#8A9BB5', text: '#374151', bg: '#F9FAFB', border: '#E5E7EB' };
  const size = small ? 'text-[11px] px-2 py-0.5' : 'text-[12px] px-2.5 py-1';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${size}`}
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {status}
    </span>
  );
}
