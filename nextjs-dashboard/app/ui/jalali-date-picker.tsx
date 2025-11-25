"use client";

import React, { useEffect, useRef, useState } from 'react';
import { format, getDay, parse, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns-jalali';
import { isFriday } from 'date-fns';

interface Props {
  value?: string; // jalali string yyyy/mm/dd
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Persian weekday names (starting with Saturday/شنبه)
const weekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const weekDaysShort = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export default function JalaliDatePicker({ value, onChange, disabled, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(value || '');
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) {
      try {
        return parse(value, 'yyyy/MM/dd', new Date());
      } catch (e) {
        return new Date();
      }
    }
    return new Date();
  });
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDisplay(value || '');
    if (value) {
      try {
        setCurrentDate(parse(value, 'yyyy/MM/dd', new Date()));
      } catch (e) {
        // Invalid date format, keep current
      }
    }
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  function prevMonth() {
    setCurrentDate(d => subMonths(d, 1));
  }

  function nextMonth() {
    setCurrentDate(d => addMonths(d, 1));
  }

  function selectDay(date: Date) {
    const formatted = format(date, 'yyyy/MM/dd');
    setDisplay(formatted);
    onChange(formatted);
    setOpen(false);
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // JS getDay: Sun=0, Mon=1, ..., Sat=6
  // We want: Sat=0, Sun=1, ..., Fri=6
  // So if JS returns 0 (Sun) we want 1, if it returns 6 (Sat) we want 0
  const firstDayJS = getDay(monthStart);
  const firstDayIndex = firstDayJS === 0 ? 1 : firstDayJS === 6 ? 0 : firstDayJS + 1;
  const blankCells = Array.from({ length: firstDayIndex });

  // Only Fridays are holidays (when getDay() returns 5)
  const isHoliday = (date: Date) => {
    return getDay(date) === 5; // 5 = Friday in JS getDay()
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <input
        readOnly
        value={display}
        onClick={() => setOpen(!open)}
        placeholder={placeholder || 'YYYY/MM/DD'}
        className="w-full rounded-lg border border-gray-200 py-2 px-3"
        disabled={disabled}
      />

      {open && (
        <div className="absolute z-50 mt-2 w-64 rounded-lg bg-white p-3 shadow-lg dark:bg-gray-700 text-gray-900 dark:text-white " dir="rtl">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="px-2 py-1">‹</button>
            <div className="text-sm font-medium">{format(currentDate, 'yyyy/MM')}</div>
            <button type="button" onClick={nextMonth} className="px-2 py-1">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
            {weekDaysShort.map((d, i) => (
              <div key={i} className="font-medium">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {blankCells.map((_, i) => (
              <div key={`b-${i}`} />
            ))}
            {daysInMonth.map((date) => {
              const day = parseInt(format(date, 'd'));
              const isSelected = display === format(date, 'yyyy/MM/dd');
              const holiday = isHoliday(date);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(date)}
                  className={`
                  py-1 rounded text-sm
                  ${holiday ? 'text-red-500' : ''}
                  ${isSelected 
                    ? 'bg-blue-500 text-white dark:bg-blue-600' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}