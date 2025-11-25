"use client";

import React, { useEffect, useState } from 'react';
import { getExams, Exam } from '@/app/lib/exams-service';
import { getAllocationsForExams, Allocation } from '@/app/lib/allocations-service';
import { getRooms, Room } from '@/app/lib/rooms-service';
import { getTerms, Term } from '@/app/lib/terms-service';
import { LoadingSpinner } from '@/app/ui/loading-spinner';

type CapacityRow = {
  exam: Exam;
  allocation?: Allocation | null;
  room?: Room | null;
  students: number; // number of students to consider (allocated_seats or expected_students)
  capacity?: number;
  usagePercent?: number;
};

export default function CapacityReportPage() {
  const [rows, setRows] = useState<CapacityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [termsLoading, setTermsLoading] = useState(false);

  // removed initial unconditional load; report loads when a term is selected (or when null for all terms)

  // load terms on mount
  useEffect(() => {
    async function loadTerms() {
      setTermsLoading(true);
      try {
        const allTerms = await getTerms();
        setTerms(allTerms);
        if (allTerms.length > 0 && selectedTermId == null) {
          // default to the first term (assumed most recent or primary)
          setSelectedTermId(allTerms[0].id);
        }
      } catch (e: any) {
        console.error('Failed to load terms', e);
      } finally {
        setTermsLoading(false);
      }
    }

    loadTerms();
  }, []);

  // when selectedTermId changes, reload exams/rows
  useEffect(() => {
    // Trigger the main load by calling the same loader logic above via simple pattern: re-run load effect
    // We call the internal load by toggling rows reload: simply call the load logic inline here
    async function reloadForTerm() {
      setLoading(true);
      setError(null);
      try {
        const exams = await getExams(selectedTermId ?? undefined);
        const examIds = exams.map((e) => e.id);
        const allocationsMap = await getAllocationsForExams(examIds);
        const rooms = await getRooms();
        const roomsMap = new Map<number, Room>();
        rooms.forEach((r) => roomsMap.set(Number(r.id), r));

        const computed: CapacityRow[] = exams.map((exam) => {
          const alloc = allocationsMap.get(exam.id) || null;
          const students = alloc?.allocated_seats ?? exam.expected_students ?? 0;
          const room = alloc?.room ? roomsMap.get(Number(alloc.room)) ?? null : null;
          const capacity = room?.capacity;
          const usagePercent = capacity ? Math.round((students / capacity) * 100) : undefined;

          return {
            exam,
            allocation: alloc,
            room: room ?? undefined,
            students,
            capacity,
            usagePercent,
          };
        });

        computed.sort((a, b) => (b.usagePercent ?? -1) - (a.usagePercent ?? -1));
        setRows(computed);
      } catch (e: any) {
        console.error('Error loading capacity report', e);
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    // reload for any change (selectedTermId may be null meaning 'all terms')
    reloadForTerm();
  }, [selectedTermId]);

  return (
    <div className="p-20" dir='rtl'>
      <h1 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">گزارش ظرفیت فضاها</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          این گزارش کمک می‌کند مطمئن شوید ظرفیت مکان برای تعداد دانشجو کافی بوده.
        </p>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700 dark:text-gray-300">ترم:</label>
          <select
            value={selectedTermId ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') setSelectedTermId(null);
              else setSelectedTermId(Number(v));
            }}
            disabled={termsLoading}
            className="rounded-md border py-1 px-8 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200"
          >
            <option value="">-- همه ترم‌ها --</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <LoadingSpinner />
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-md">
          خطا در بارگذاری گزارش: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="text-sm text-right text-gray-700 dark:text-gray-300 border-b">
                <th className="py-2 pr-4">امتحان</th>
                <th className="py-2 pr-4">تعداد دانشجو</th>
                <th className="py-2 pr-4">مکان اختصاصی</th>
                <th className="py-2 pr-4">ظرفیت مکان</th>
                <th className="py-2 pr-4">درصد استفاده</th>
                <th className="py-2 pr-4">هشدار</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = r.usagePercent;
                const exceeded = typeof pct === 'number' && pct > 100;
                const underutilized = typeof pct === 'number' && pct < 30;

                return (
                  <tr key={r.exam.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="text-gray-900 dark:text-gray-100 font-medium">{r.exam.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">کد درس: {r.exam.course_code ?? '-'}</div>
                    </td>
                    <td className="py-3 pr-4 text-gray-800 dark:text-gray-200">{r.students}</td>
                    <td className="py-3 pr-4 text-gray-800 dark:text-gray-200">
                      {r.room ? (
                        <div className="flex items-center gap-2">
                          <div className="text-sm">{r.room.name}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">مکان اختصاص نیافته</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-800 dark:text-gray-200">{r.capacity ?? '-'}</td>
                    <td className="py-3 pr-4">
                      {typeof pct === 'number' ? (
                        <div className="inline-flex items-center gap-2">
                          <div className="text-sm text-gray-800 dark:text-gray-200">{pct}%</div>
                          <div className="w-28 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${exceeded ? 'bg-red-600' : underutilized ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {exceeded ? (
                        <span className="px-2 py-1 rounded text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">تجاوز ظرفیت</span>
                      ) : underutilized ? (
                        <span className="px-2 py-1 rounded text-sm bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200">کمتر از ۳۰٪ استفاده</span>
                      ) : (
                        <span className="text-sm text-gray-600 dark:text-gray-300">خالی از هشدار</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-600 dark:text-gray-300">هیچ امتحانی یافت نشد.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
