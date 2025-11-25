"use client";

import React, { useEffect, useState } from 'react';
import { getTerms, Term } from '@/app/lib/terms-service';
import { getExams, Exam } from '@/app/lib/exams-service';
import { getAllocationsForExams, Allocation } from '@/app/lib/allocations-service';
import { getRooms, Room } from '@/app/lib/rooms-service';
import { LoadingSpinner } from '@/app/ui/loading-spinner';

type RoomUtilization = {
  room: Room;
  examCount: number;
  allocations: Allocation[];
  usagePercent: number; // 0-100%
  emptyHours: number; // approximate hours when room is not in use (based on business hours)
  peakHours: string[]; // time slots when room is busiest
};

function parseAllocationStart(a: Allocation): Date | null {
  try {
    let iso: string | undefined;
    if (a.start_at) {
      if (typeof a.start_at === 'object' && 'iso' in a.start_at) iso = (a.start_at as any).iso;
      else if (typeof a.start_at === 'string') iso = a.start_at as string;
    }
    if (!iso && a.date && a.time) {
      iso = `${a.date}T${a.time}:00.000Z`;
    }
    return iso ? new Date(iso) : null;
  } catch (e) {
    return null;
  }
}

export default function UtilizationReportPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [utilizations, setUtilizations] = useState<RoomUtilization[]>([]);

  useEffect(() => {
    async function loadTerms() {
      try {
        const t = await getTerms();
        setTerms(t);
        if (t.length > 0) setSelectedTerm(t[0].id);
      } catch (e: any) {
        console.warn('Failed to load terms', e);
      }
    }
    loadTerms();
  }, []);

  useEffect(() => {
    if (selectedTerm === null) return;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [exams, rooms] = await Promise.all([
          getExams(selectedTerm ?? undefined),
          getRooms(),
        ]);

        // Build room exam map
        const examIds = exams.map((e) => e.id);
        const allocationsMap = await getAllocationsForExams(examIds);

        // Group allocations by room
        const roomAllocMap = new Map<number, Allocation[]>();
        allocationsMap.forEach((a) => {
          if (a.room) {
            const roomId = Number(a.room);
            if (!roomAllocMap.has(roomId)) roomAllocMap.set(roomId, []);
            roomAllocMap.get(roomId)!.push(a);
          }
        });

        // Calculate utilization for each room
        const utils: RoomUtilization[] = rooms.map((room) => {
          const roomAllocations = roomAllocMap.get(Number(room.id)) || [];
          const examCount = roomAllocations.length;

          // Estimate usage: assume working hours 8:00-18:00 (10 hours per day)
          // Estimate: if we have allocations spread over days, calculate approximate usage
          // For simplicity: usage% = (total hours allocated) / (total available hours in term)
          // Estimate term length ~ 16 weeks = 80 working days; total hours = 80 * 10 = 800
          let totalAllocatedHours = 0;
          const hoursBySlot = new Map<string, number>();
          const allDates = new Set<string>();

          roomAllocations.forEach((a) => {
            const start = parseAllocationStart(a);
            if (start) {
              const dateStr = start.toISOString().slice(0, 10);
              const hourStr = `${String(start.getUTCHours()).padStart(2, '0')}:00`;
              allDates.add(dateStr);
              hoursBySlot.set(hourStr, (hoursBySlot.get(hourStr) || 0) + 1);
              totalAllocatedHours += 2; // assume 2 hours per exam (default)
            }
          });

          const totalAvailableHours = 80 * 10; // 80 working days, 10 hours per day
          const usagePercent = Math.round((totalAllocatedHours / totalAvailableHours) * 100);

          // Empty hours (approximate): term hours - allocated
          const emptyHours = Math.max(0, totalAvailableHours - totalAllocatedHours);

          // Peak hours: most crowded time slots
          const sortedHours = Array.from(hoursBySlot.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([h]) => h);

          return {
            room,
            examCount,
            allocations: roomAllocations,
            usagePercent,
            emptyHours,
            peakHours: sortedHours,
          };
        });

        // Sort by usage descending
        utils.sort((a, b) => b.usagePercent - a.usagePercent);
        setUtilizations(utils);
      } catch (e: any) {
        console.error('Failed to load utilization data', e);
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedTerm]);

  const maxUsage = Math.max(...utilizations.map((u) => u.usagePercent), 0) || 100;

  return (
    <div className="p-16" dir="rtl">
      <h1 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">گزارش استفاده از مکان‌ها</h1>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        این گزارش به مدیران کمک می‌کند بدانند کدام سالن‌ها پربار و کم‌بار هستند.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-gray-700 dark:text-gray-300">ترم:</label>
        <select
          value={selectedTerm ?? ''}
          onChange={(e) => setSelectedTerm(e.target.value === '' ? null : Number(e.target.value))}
          className="rounded-md border py-1 px-8 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200"
        >
          <option value="">-- انتخاب ترم --</option>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {loading && <LoadingSpinner />}
      {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded">خطا: {error}</div>}

      {!loading && utilizations.length === 0 && (
        <div className="text-gray-700 dark:text-gray-300">هیچ اطلاعات استفاده یافت نشد.</div>
      )}

      {!loading && utilizations.length > 0 && (
        <>
          {/* Bar Chart */}
          <div className="mb-8 p-4 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">نمودار بار کاری سالن‌ها</h2>
            <div className="space-y-3">
              {utilizations.map((u) => {
                const barWidth = (u.usagePercent / maxUsage) * 100;
                const color = u.usagePercent > 80 ? 'bg-red-500' : u.usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500';
                return (
                  <div key={u.room.id} className="flex items-center gap-3">
                    <div className="w-32 text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{u.room.name}</div>
                    <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative">
                      <div
                        className={`h-full ${color} transition-all`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {u.usagePercent}%
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm text-gray-600 dark:text-gray-300">{u.examCount}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Table */}
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="text-sm text-right text-gray-700 dark:text-gray-300 border-b">
                  <th className="py-2 pr-4">سالن</th>
                  <th className="py-2 pr-4">تعداد امتحانات</th>
                  <th className="py-2 pr-4">درصد استفاده</th>
                  <th className="py-2 pr-4">ساعات خالی (تقریبی)</th>
                  <th className="py-2 pr-4">ساعات پربار</th>
                </tr>
              </thead>
              <tbody>
                {utilizations.map((u) => (
                  <tr key={u.room.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 text-gray-900 dark:text-gray-100 font-medium">{u.room.name}</td>
                    <td className="py-3 pr-4 text-gray-800 dark:text-gray-200">{u.examCount}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-800 dark:text-gray-200">{u.usagePercent}%</div>
                        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                          <div
                            className={`h-full ${u.usagePercent > 80 ? 'bg-red-500' : u.usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(u.usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-800 dark:text-gray-200">{Math.round(u.emptyHours)} ساعت</td>
                    <td className="py-3 pr-4 text-gray-800 dark:text-gray-200">
                      {u.peakHours.length > 0 ? u.peakHours.join('، ') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
