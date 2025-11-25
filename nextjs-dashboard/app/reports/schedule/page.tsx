'use client';

import { useState, useEffect, useMemo } from 'react';
import { Term, getTerms } from '@/app/lib/terms-service';
import { Room, getRooms, getRoomCategories, RoomCategory } from '@/app/lib/rooms-service';
import { Exam, getExams } from '@/app/lib/exams-service';
import { getAllocationsForExams, Allocation } from '@/app/lib/allocations-service';
import { HomeIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/ui/button';
import Link from 'next/link';
import { format as formatJalali, parseISO } from 'date-fns-jalali';
import { LoadingSpinner } from '@/app/ui/loading-spinner';

interface ScheduleItem {
  exam: Exam;
  allocation: Allocation | null;
  room: Room | null;
  category: RoomCategory | null;
  date: string | null;
  jalaliDate: string | null;
  time: string | null;
}

const resolveRoomCategoryId = (room: Room): RoomCategory['id'] | null => {
  const categoryValue = room.category;
  if (categoryValue && typeof categoryValue === 'object') {
    if ('id' in categoryValue) {
      return (categoryValue as RoomCategory).id;
    }
  } else if (categoryValue !== undefined && categoryValue !== null) {
    return categoryValue as RoomCategory['id'];
  }
  if (room.category_id !== undefined && room.category_id !== null) {
    return room.category_id as RoomCategory['id'];
  }
  return null;
};

const resolveRoomCategoryName = (room: Room, categories: RoomCategory[]): string | null => {
  const categoryId = resolveRoomCategoryId(room);
  if (categoryId !== null) {
    const match = categories.find((cat) => String(cat.id) === String(categoryId));
    if (match) {
      return match.name;
    }
  }
  return room.category_name || null;
};

export default function ScheduleReportPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [allocationsMap, setAllocationsMap] = useState<Map<number, Allocation>>(new Map());
  const [selectedTermId, setSelectedTermId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterCourseCode, setFilterCourseCode] = useState<string>('');
  const [filterOwner, setFilterOwner] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterBuilding, setFilterBuilding] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (selectedTermId) {
      loadExams(selectedTermId);
    } else {
      setExams([]);
      setAllocationsMap(new Map());
    }
  }, [selectedTermId]);

  async function initialize() {
    try {
      setLoading(true);
      setError(null);
      const [termsData, roomsData, categoriesData] = await Promise.all([
        getTerms(),
        getRooms(),
        getRoomCategories(),
      ]);
      setTerms(termsData);
      setRooms(roomsData);
      setCategories(categoriesData);
      
      // Auto-select first active term
      const firstActiveTerm = termsData.find(term => !term.is_archived);
      if (firstActiveTerm) {
        setSelectedTermId(firstActiveTerm.id);
      }
    } catch (err: any) {
      console.error('Error initializing:', err);
      setError('خطا در بارگذاری داده‌ها: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadExams(termId: number) {
    try {
      setLoading(true);
      setError(null);
      const fetchedExams = await getExams(termId);
      setExams(fetchedExams);

      if (fetchedExams.length > 0) {
        const examIds = fetchedExams.map(exam => exam.id);
        try {
          const allocations = await getAllocationsForExams(examIds);
          setAllocationsMap(allocations);
        } catch (err) {
          console.warn('Failed to load allocations:', err);
          setAllocationsMap(new Map());
        }
      } else {
        setAllocationsMap(new Map());
      }
    } catch (err: any) {
      console.error('Error loading exams:', err);
      setError('خطا در بارگذاری امتحانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Build schedule items from exams, allocations, and rooms
  const scheduleItems = useMemo<ScheduleItem[]>(() => {
    return exams.map(exam => {
      const allocation = allocationsMap.get(exam.id) || null;
      const roomId = allocation?.room || (exam.location ? Number(exam.location) : null);
      const room = roomId ? rooms.find(r => r.id === roomId) || null : null;
      const categoryId = room ? resolveRoomCategoryId(room) : null;
      const category = categoryId ? categories.find(c => String(c.id) === String(categoryId)) || null : null;

      // Extract date and time from allocation or exam
      let date: string | null = null;
      let jalaliDate: string | null = null;
      let time: string | null = null;

      if (allocation) {
        if (allocation.date) {
          date = allocation.date;
        }
        if (allocation.jalaliDate) {
          jalaliDate = allocation.jalaliDate;
        } else if (allocation.date) {
          try {
            const parsedDate = parseISO(allocation.date);
            jalaliDate = formatJalali(parsedDate, 'yyyy/MM/dd');
          } catch {
            // Ignore parse errors
          }
        }
        if (allocation.time) {
          time = allocation.time;
        }
      } else if (exam.date) {
        date = exam.date;
        try {
          const parsedDate = parseISO(exam.date);
          jalaliDate = formatJalali(parsedDate, 'yyyy/MM/dd');
        } catch {
          // Ignore parse errors
        }
        if (exam.time) {
          time = exam.time;
        }
      }

      return {
        exam,
        allocation,
        room,
        category,
        date,
        jalaliDate,
        time,
      };
    });
  }, [exams, allocationsMap, rooms, categories]);

  // Filter schedule items
  const filteredItems = useMemo(() => {
    return scheduleItems.filter(item => {
      // Filter by date (Jalali)
      if (filterDate && item.jalaliDate) {
        if (!item.jalaliDate.includes(filterDate)) {
          return false;
        }
      }

      // Filter by course code
      if (filterCourseCode && item.exam.course_code) {
        if (!item.exam.course_code.toLowerCase().includes(filterCourseCode.toLowerCase())) {
          return false;
        }
      }

      // Filter by owner (استاد)
      if (filterOwner && item.exam.owner) {
        if (String(item.exam.owner) !== filterOwner) {
          return false;
        }
      }

      // Filter by category (دانشکده)
      if (filterCategory && item.category) {
        if (String(item.category.id) !== filterCategory) {
          return false;
        }
      }

      // Filter by building (ساختمان) - using category name or room name pattern
      if (filterBuilding) {
        const buildingMatch = 
          (item.category && item.category.name.toLowerCase().includes(filterBuilding.toLowerCase())) ||
          (item.room && item.room.name.toLowerCase().includes(filterBuilding.toLowerCase()));
        if (!buildingMatch) {
          return false;
        }
      }

      return true;
    });
  }, [scheduleItems, filterDate, filterCourseCode, filterOwner, filterCategory, filterBuilding]);

  // Get unique values for filter dropdowns
  const uniqueCourseCodes = useMemo(() => {
    const codes = new Set<string>();
    scheduleItems.forEach(item => {
      if (item.exam.course_code) {
        codes.add(item.exam.course_code);
      }
    });
    return Array.from(codes).sort();
  }, [scheduleItems]);

  const uniqueOwners = useMemo(() => {
    const owners = new Set<number>();
    scheduleItems.forEach(item => {
      if (item.exam.owner) {
        owners.add(item.exam.owner);
      }
    });
    return Array.from(owners).sort((a, b) => a - b);
  }, [scheduleItems]);

  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    scheduleItems.forEach(item => {
      if (item.jalaliDate) {
        dates.add(item.jalaliDate);
      }
    });
    return Array.from(dates).sort();
  }, [scheduleItems]);

  // Sort filtered items by date and time
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      // Sort by date first
      if (a.date && b.date) {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
      } else if (a.date) return -1;
      else if (b.date) return 1;

      // Then by time
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      } else if (a.time) return -1;
      else if (b.time) return 1;

      return 0;
    });
  }, [filteredItems]);

  const clearFilters = () => {
    setFilterDate('');
    setFilterCourseCode('');
    setFilterOwner('');
    setFilterCategory('');
    setFilterBuilding('');
  };

  if (loading && terms.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto p-14 min-h-screen bg-white dark:bg-gray-900" dir="rtl">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          <HomeIcon className="h-5 w-5" />
          <span>بازگشت به صفحه اصلی</span>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">گزارش برنامه امتحانات</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">لیست کامل امتحانات با جزئیات زمان و مکان</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              انتخاب ترم
            </label>
            <select
              value={selectedTermId || ''}
              onChange={(e) => setSelectedTermId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-10"
            >
              <option value="">انتخاب ترم...</option>
              {terms.filter(term => !term.is_archived).map(term => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <FunnelIcon className="h-5 w-5" />
              {showFilters ? 'پنهان کردن فیلترها' : 'نمایش فیلترها'}
            </Button>
            {(filterDate || filterCourseCode || filterOwner || filterCategory || filterBuilding) && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex h-10 items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                پاک کردن فیلترها
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">فیلترها</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  فیلتر بر اساس روز
                </label>
                <input
                  type="text"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  placeholder="مثال: ۱۴۰۳/۰۹/۱۵"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  فیلتر بر اساس درس
                </label>
                <select
                  value={filterCourseCode}
                  onChange={(e) => setFilterCourseCode(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
                >
                  <option value="">همه دروس</option>
                  {uniqueCourseCodes.map(code => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  فیلتر بر اساس استاد
                </label>
                <select
                  value={filterOwner}
                  onChange={(e) => setFilterOwner(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
                >
                  <option value="">همه اساتید</option>
                  {uniqueOwners.map(owner => (
                    <option key={owner} value={String(owner)}>
                      استاد {owner}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  فیلتر بر اساس دانشکده
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
                >
                  <option value="">همه دانشکده‌ها</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  فیلتر بر اساس ساختمان
                </label>
                <input
                  type="text"
                  value={filterBuilding}
                  onChange={(e) => setFilterBuilding(e.target.value)}
                  placeholder="نام ساختمان یا مکان"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedTermId ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              تعداد نتایج: <strong>{sortedItems.length}</strong> از {scheduleItems.length} امتحان
            </p>
          </div>

          {sortedItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                {scheduleItems.length === 0
                  ? 'هیچ امتحانی برای این ترم ثبت نشده است.'
                  : 'هیچ امتحانی با فیلترهای انتخابی یافت نشد.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      تاریخ
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      ساعت
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      استاد
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      درس
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      عنوان امتحان
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      مکان
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      دانشکده
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      مدت (دقیقه)
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      تعداد دانشجویان
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr
                      key={item.exam.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.jalaliDate || item.date || '-'}
                      </td>
                      <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.time || '-'}
                      </td>
                      <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.exam.owner ? `استاد ${item.exam.owner}` : '-'}
                      </td>
                      <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.exam.course_code || '-'}
                      </td>
                      <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                        {item.exam.title}
                      </td>
                      <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.room ? item.room.name : '-'}
                      </td>
                      <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.category ? item.category.name : '-'}
                      </td>
                      <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.exam.duration_minutes || '-'}
                      </td>
                      <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.exam.expected_students || item.allocation?.allocated_seats || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">لطفاً یک ترم را انتخاب کنید.</p>
        </div>
      )}
    </div>
  );
}

