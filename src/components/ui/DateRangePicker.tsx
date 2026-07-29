'use client';

import React, { useState } from 'react';

interface DateRangePickerProps {
  onDateChange: (startDate: string | null, endDate: string | null) => void;
}

export function DateRangePicker({ onDateChange }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFiltered, setIsFiltered] = useState(false);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short' });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  const handleApply = () => {
    if (startDate && endDate) {
      onDateChange(startDate, endDate);
      setIsFiltered(true);
      setIsOpen(false);
    }
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setIsFiltered(false);
    onDateChange(null, null);
    setIsOpen(false);
  };

  const displayText = isFiltered && startDate && endDate 
    ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
    : null;

  return (
    <div className="relative">
      {displayText ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F0FDF4] text-[11px] font-semibold text-[#166534]">
          <span>{displayText}</span>
          <button
            onClick={handleReset}
            className="flex items-center justify-center w-4 h-4 rounded hover:bg-[#BBF7D0] transition-colors flex-shrink-0"
            title="Réinitialiser le filtre"
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[11px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors shadow-sm"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <path d="M8 2v4M16 2v4M3 4h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Filtrer
        </button>
      )}

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-lg border border-[#E2E8F0] shadow-lg p-3 min-w-[240px]">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-[#8A9BB5] uppercase">Date début</label>
              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className="w-full px-2 py-1.5 mt-1 text-[11px] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF4F]/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#8A9BB5] uppercase">Date fin</label>
              <input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                className="w-full px-2 py-1.5 mt-1 text-[11px] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF4F]/30"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-1.5 text-[11px] font-semibold text-[#374151] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleApply}
                disabled={!startDate || !endDate}
                className="flex-1 px-3 py-1.5 text-[11px] font-semibold text-white bg-[#4CAF4F] rounded-lg hover:bg-[#43A047] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
