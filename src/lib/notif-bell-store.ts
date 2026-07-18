// Store léger partagé entre Sidebar (bouton) et TopBar (panel)
type Listener = (count: number) => void;

const listeners = new Set<Listener>();
let count = 0;
let openFn: (() => void) | null = null;

export const notifBell = {
  setCount(n: number) {
    count = n;
    listeners.forEach((l) => l(n));
  },
  getCount() { return count; },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
  setOpen(fn: () => void) { openFn = fn; },
  open() { openFn?.(); },
};
