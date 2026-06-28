export function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export const inputClass =
  'w-full px-4 py-3 border border-[#ABBED1] rounded-xl text-[15px] text-[#263238] placeholder-[#89939E] focus:outline-none focus:ring-2 focus:ring-[#4CAF4F]/40 focus:border-[#4CAF4F] transition-colors bg-white';

export const labelClass =
  'block text-[13px] font-semibold text-[#4D4D4D] mb-1.5 uppercase tracking-wide';
