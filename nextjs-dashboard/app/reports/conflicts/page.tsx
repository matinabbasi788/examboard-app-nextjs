"use client";

import React, { useEffect, useState } from 'react';
import { getTerms, Term } from '@/app/lib/terms-service';
import { getExams, Exam } from '@/app/lib/exams-service';
import { getAllocationsForExams, Allocation } from '@/app/lib/allocations-service';
import { getRooms, Room } from '@/app/lib/rooms-service';
import { LoadingSpinner } from '@/app/ui/loading-spinner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function parseAllocationDateTime(a: Allocation): { start?: Date | null; end?: Date | null; date?: string } {
  try {
    let startIso: string | undefined;
    let endIso: string | undefined;

    if (a.start_at) {
      if (typeof a.start_at === 'object' && 'iso' in a.start_at) startIso = (a.start_at as any).iso;
      else if (typeof a.start_at === 'string') startIso = a.start_at as string;
    }
    if (a.end_at) {
      if (typeof a.end_at === 'object' && 'iso' in a.end_at) endIso = (a.end_at as any).iso;
      else if (typeof a.end_at === 'string') endIso = a.end_at as string;
    }

    // fallback to date/time fields
    if (!startIso && a.date && a.time) {
      startIso = `${a.date}T${a.time}:00.000Z`;
    }
    if (!endIso && a.date && a.time && (a.allocated_seats || a.allocated_seats === 0)) {
      // we don't know duration reliably here; if end_at missing leave undefined
    }

    const start = startIso ? new Date(startIso) : undefined;
    const end = endIso ? new Date(endIso) : undefined;
    const date = start ? start.toISOString().slice(0, 10) : a.date || undefined;
    return { start, end, date };
  } catch (e) {
    return {} as any;
  }
}

function timesOverlap(s1?: Date | null, e1?: Date | null, s2?: Date | null, e2?: Date | null) {
  if (!s1 || !s2) return false;
  // If end missing, treat as point-in-time or add 2 hours default
  const defaultMs = 1000 * 60 * 60 * 2;
  const end1 = e1 ?? new Date(s1.getTime() + defaultMs);
  const end2 = e2 ?? new Date(s2.getTime() + defaultMs);
  return s1 < end2 && s2 < end1;
}

function isManualAllocation(a: Allocation) {
  // best-effort: check common flags
  if (!a) return false;
  const keys = ['created_manually', 'is_manual', 'manual', 'source', 'created_by'];
  for (const k of keys) {
    if (k in a) {
      const v = (a as any)[k];
      if (v === true) return true;
      if (typeof v === 'string' && v.toLowerCase && v.toLowerCase().includes('manual')) return true;
    }
  }
  return false;
}

export default function ConflictsReportPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [examsMap, setExamsMap] = useState<Map<number, Exam>>(new Map());
  const [roomsMap, setRoomsMap] = useState<Map<number, Room>>(new Map());
  const [conflictGroups, setConflictGroups] = useState<Array<{ room: Room | null; date: string; allocations: Allocation[] }>>([]);
  const [logs, setLogs] = useState<any[] | null>(null);

  useEffect(() => {
    async function loadTerms() {
      try {
        const t = await getTerms();
        setTerms(t);
        if (t.length > 0) setSelectedTerm(t[0].id);
      } catch (e: any) {
        console.warn('Failed to load terms for conflicts report', e);
      }
    }
    loadTerms();
  }, []);

  useEffect(() => {
    if (selectedTerm === null) return;
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const [exams, rooms] = await Promise.all([
          getExams(selectedTerm ?? undefined),
          getRooms(),
        ]);

        const examsMap = new Map<number, Exam>();
        exams.forEach((ex: Exam) => examsMap.set(ex.id, ex));
        setExamsMap(examsMap);

        const roomsMap = new Map<number, Room>();
        rooms.forEach((r: Room) => roomsMap.set(Number(r.id), r));
        setRoomsMap(roomsMap);

        // Get allocations for exams in this term
        const examIds = exams.map((e: Exam) => e.id);
        const allocationsMap = await getAllocationsForExams(examIds);
        const allocations = Array.from(allocationsMap.values());

        // Build pairwise conflicts and then merge into groups
        const pairs: Array<[Allocation, Allocation]> = [];
        for (let i = 0; i < allocations.length; i++) {
          for (let j = i + 1; j < allocations.length; j++) {
            const A = allocations[i];
            const B = allocations[j];
            // require same room
            if (!A.room || !B.room || String(A.room) !== String(B.room)) continue;

            const pa = parseAllocationDateTime(A);
            const pb = parseAllocationDateTime(B);
            if (!pa.start || !pb.start) continue;
            // require same date (ISO date)
            const dateA = pa.date;
            const dateB = pb.date;
            if (!dateA || !dateB || dateA !== dateB) continue;

            if (timesOverlap(pa.start, pa.end, pb.start, pb.end)) {
              pairs.push([A, B]);
            }
          }
        }

        // merge pairs into groups
        const groups: Array<Set<Allocation>> = [];
        const findGroupIndex = (alloc: Allocation) => groups.findIndex((g) => Array.from(g).some((x) => x === alloc));

        pairs.forEach(([a, b]) => {
          const ai = findGroupIndex(a);
          const bi = findGroupIndex(b);
          if (ai === -1 && bi === -1) {
            groups.push(new Set([a, b]));
          } else if (ai !== -1 && bi === -1) {
            groups[ai].add(b);
          } else if (ai === -1 && bi !== -1) {
            groups[bi].add(a);
          } else if (ai !== -1 && bi !== -1 && ai !== bi) {
            // merge
            const aSet = groups[ai];
            const bSet = groups[bi];
            const merged = new Set([...aSet, ...bSet]);
            groups[ai] = merged;
            groups.splice(bi, 1);
          }
        });

        const finalGroups = groups.map((g) => {
          const arr = Array.from(g);
          // determine room/date for group (take from first element)
          const p = parseAllocationDateTime(arr[0]);
          const room = roomsMap.get(Number(arr[0].room)) ?? null;
          return { room, date: p.date ?? '-', allocations: arr };
        });

        setConflictGroups(finalGroups);

        // try to fetch allocation logs (best-effort)
        try {
          const maybeLogs = await fetch(`${API_BASE}/api/allocations/logs/`, { headers: { 'Accept': 'application/json' } });
          if (maybeLogs.ok) {
            const json = await maybeLogs.json();
            setLogs(Array.isArray(json) ? json : [json]);
          } else {
            // try another path
            const maybe2 = await fetch(`${API_BASE}/api/allocations/attempts/`, { headers: { 'Accept': 'application/json' } });
            if (maybe2.ok) {
              const j2 = await maybe2.json();
              setLogs(Array.isArray(j2) ? j2 : [j2]);
            } else {
              setLogs(null);
            }
          }
        } catch (e) {
          setLogs(null);
        }

      } catch (e: any) {
        console.error('Failed to load conflicts', e);
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [selectedTerm]);

  return (
    <div className="p-16" dir="rtl">
      <h1 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">گزارش تداخل‌ها</h1>

      <div className="flex items-center gap-3 mb-4">
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

      {!loading && conflictGroups.length === 0 && (
        <div className="p-4 text-gray-700 dark:text-gray-300">هیچ تداخلی پیدا نشد.</div>
      )}

      <div className="space-y-4">
        {conflictGroups.map((g, idx) => (
          <div key={idx} className="p-4 border rounded bg-white dark:bg-gray-800 border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">مکان: {g.room?.name ?? 'نامشخص'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">تاریخ: {g.date}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {g.allocations.map((a) => {
                const exam = examsMap.get(Number(a.exam));
                const p = parseAllocationDateTime(a);
                const manual = isManualAllocation(a);
                return (
                  <div key={a.id} className="p-2 rounded border bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{exam?.title ?? `Exam ${a.exam}`}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">آی‌دی امتحان: {a.exam}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">زمان شروع: {p.start ? p.start.toISOString().slice(11,16) : a.time ?? '-'}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">تعداد اختصاصی: {a.allocated_seats ?? '-'}</div>
                    {manual ? <div className="mt-1 inline-block text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 rounded">افزودن دستی</div> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">لاگ تلاش‌های سیستم برای جلوگیری از تداخل</h2>
        {logs === null ? (
          <div className="text-sm text-gray-600 dark:text-gray-300">لاگ‌های مربوط به تلاش سیستم موجود نیست یا در دسترس نمی‌باشد.</div>
        ) : (
          <div className="max-h-64 overflow-auto border rounded p-2 bg-white dark:bg-gray-800">
            {logs.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">لاگ خالی است.</div>
            ) : (
              logs.map((l, i) => (
                <pre key={i} className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{JSON.stringify(l, null, 2)}</pre>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
