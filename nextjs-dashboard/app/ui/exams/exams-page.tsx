'use client';

import { useState, useEffect } from 'react';
import { Term, getTerms } from '@/app/lib/terms-service';
import { Room, RoomCategory, getRooms, getRoomCategories } from '@/app/lib/rooms-service';
import { Exam, getExams, createExam, deleteExam, CreateExamPayload } from '@/app/lib/exams-service';
import { createAllocation, updateAllocation, getAllocationsForExams, CreateAllocationPayload, UpdateAllocationPayload, Allocation } from '@/app/lib/allocations-service';
import { PlusIcon, XMarkIcon, PencilIcon, HomeIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/ui/button';
import JalaliDatePicker from '@/app/ui/jalali-date-picker';
import { parse as parseJalali, format as formatJalali, formatISO } from 'date-fns-jalali';
import { parseISO } from 'date-fns';
import Link from 'next/link';
import { LoadingSpinner } from '@/app/ui/loading-spinner';

const resolveRoomCategoryId = (room: Room): string | number | null => {
  if (room.category && typeof room.category === 'object' && 'id' in room.category) {
    return (room.category as { id?: string | number }).id ?? null;
  }
  if (room.category !== undefined && room.category !== null && typeof room.category !== 'object') {
    return room.category as string | number;
  }
  if (room.category_id !== undefined && room.category_id !== null) {
    return room.category_id as string | number;
  }
  return null;
};

const resolveRoomCategoryName = (
  room: Room,
  categories?: RoomCategory[],
): string | null => {
  if (room.category && typeof room.category === 'object' && 'name' in room.category) {
    return (room.category as { name?: string }).name ?? null;
  }
  if (typeof room.category_name === 'string' && room.category_name.trim().length > 0) {
    return room.category_name;
  }
  const categoryId = resolveRoomCategoryId(room);
  if (categoryId !== null && categories && categories.length > 0) {
    const match = categories.find((cat) => String(cat.id) === String(categoryId));
    if (match) return match.name;
  }
  if (typeof room.features === 'object' && room.features && 'category_name' in room.features) {
    const maybeName = (room.features as Record<string, unknown>).category_name;
    if (typeof maybeName === 'string') return maybeName;
  }
  return null;
};

const formatRoomOptionLabel = (room: Room, categories?: RoomCategory[]): string => {
  const categoryName = resolveRoomCategoryName(room, categories);
  const base = room.name;
  return categoryName ? `${base} – ${categoryName}` : base;
};

export default function ExamsPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomCategories, setRoomCategories] = useState<RoomCategory[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<number | undefined>();
  const [exams, setExams] = useState<Exam[]>([]);
  const [allocationsMap, setAllocationsMap] = useState<Map<number, Allocation>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [editingAllocation, setEditingAllocation] = useState<{ examId: number; allocation: Allocation } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editAllocationDate, setEditAllocationDate] = useState('');
  const [editAllocationTime, setEditAllocationTime] = useState('');
  const [editAllocationLocation, setEditAllocationLocation] = useState('');
  const [editAllocationDuration, setEditAllocationDuration] = useState('');
  const [editAllocationSeats, setEditAllocationSeats] = useState('');
  const [conflictDetails, setConflictDetails] = useState<{ exam: Exam; conflictingExams: Exam[] } | null>(null);

  // Form states
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamCourseCode, setNewExamCourseCode] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [newExamTime, setNewExamTime] = useState('');
  const [newExamLocation, setNewExamLocation] = useState('');
  const [newExamDurationMinutes, setNewExamDurationMinutes] = useState('');
  const [newExamExpectedStudents, setNewExamExpectedStudents] = useState('');

  // تابع کمکی برای تبدیل تاریخ شمسی به ISO (برای مقایسه)
  const convertJalaliToISO = (jalaliDate: string): string | null => {
    if (!jalaliDate) return null;
    try {
      const date = parseJalali(jalaliDate, 'yyyy/MM/dd', new Date());
      return formatISO(date, { representation: 'date' });
    } catch (e) {
      return null;
    }
  };

  // تابع کمکی برای بررسی تداخل زمانی
  const checkTimeOverlap = (date1: string, time1: string, duration1: number, date2: string, time2: string, duration2: number): boolean => {
    // تبدیل تاریخ‌ها به ISO برای مقایسه
    const isoDate1 = date1.includes('/') ? convertJalaliToISO(date1) : date1;
    const isoDate2 = date2.includes('/') ? convertJalaliToISO(date2) : date2;
    
    if (!isoDate1 || !isoDate2 || isoDate1 !== isoDate2) return false;
    if (!time1 || !time2) return false;

    // تبدیل زمان‌ها به دقیقه از ابتدای روز
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start1 = parseTime(time1);
    const end1 = start1 + (duration1 || 0);
    const start2 = parseTime(time2);
    const end2 = start2 + (duration2 || 0);

    // بررسی تداخل: اگر شروع یکی بین شروع و پایان دیگری باشد
    return (start1 < end2 && start2 < end1);
  };

  // تابع کمکی برای محاسبه ظرفیت باقیمانده یک مکان در زمان مشخص
  const getAvailableCapacity = (
    roomId: number,
    examDate: string,
    examTime: string,
    examDuration: number
  ): { total: number; used: number; available: number; overlappingCount: number } | null => {
    const room = rooms.find(r => r.id === roomId);
    if (!room || !room.capacity) return null;

    // اگر تاریخ و زمان مشخص نشده، ظرفیت کامل را برگردان
    if (!examDate || !examTime) {
      return { total: room.capacity, used: 0, available: room.capacity, overlappingCount: 0 };
    }

    // پیدا کردن امتحان‌های همزمان در همان مکان
    const overlappingExams = exams.filter(exam => {
      if (!exam.location || exam.location !== String(roomId)) return false;
      if (!exam.date || !exam.time) return false;
      
      return checkTimeOverlap(
        examDate,
        examTime,
        examDuration || 0,
        exam.date,
        exam.time,
        exam.duration_minutes || 0
      );
    });

    // محاسبه ظرفیت استفاده شده
    const usedCapacity = overlappingExams.reduce((sum, exam) => {
      return sum + (exam.expected_students || 0);
    }, 0);

    // محاسبه ظرفیت باقیمانده
    const availableCapacity = room.capacity - usedCapacity;

    return {
      total: room.capacity,
      used: usedCapacity,
      available: availableCapacity,
      overlappingCount: overlappingExams.length
    };
  };

  // تابع کمکی برای بررسی ظرفیت مکان با در نظر گیری امتحان‌های همزمان
  const validateRoomCapacity = (
    locationId: string, 
    expectedStudents: number, 
    examDate: string, 
    examTime: string, 
    examDuration: number
  ): string | null => {
    if (!locationId || !expectedStudents) return null;
    
    const selectedRoom = rooms.find(room => room.id === Number(locationId));
    if (!selectedRoom || !selectedRoom.capacity) return null;
    
    // اگر تاریخ و زمان مشخص نشده، فقط بررسی ظرفیت کلی
    if (!examDate || !examTime) {
      if (expectedStudents > selectedRoom.capacity) {
      return `ظرفیت ${selectedRoom.name} (${selectedRoom.capacity} نفر) کمتر از تعداد دانشجویان (${expectedStudents} نفر) است`;
      }
      return null;
    }

    const capacityInfo = getAvailableCapacity(
      Number(locationId),
      examDate,
      examTime,
      examDuration || 0
    );

    if (!capacityInfo) return null;

    // بررسی اینکه آیا ظرفیت کافی است
    if (expectedStudents > capacityInfo.available) {
      const roomName = selectedRoom.name;
      
      if (capacityInfo.overlappingCount > 0) {
        return `ظرفیت باقیمانده ${roomName} کافی نیست. ظرفیت کل: ${capacityInfo.total} نفر، استفاده شده: ${capacityInfo.used} نفر، باقیمانده: ${capacityInfo.available} نفر، مورد نیاز: ${expectedStudents} نفر. ${capacityInfo.overlappingCount} امتحان دیگر در این زمان ثبت شده است.`;
      } else {
        return `ظرفیت ${roomName} (${capacityInfo.total} نفر) کمتر از تعداد دانشجویان (${expectedStudents} نفر) است`;
      }
    }
    
    return null;
  };

  // تابع کمکی برای ترجمه پیغام‌های خطا
  const translateError = (error: string) => {
    return error
      .replace('owner', 'مالک')
      .replace('title', 'عنوان')
      .replace('course_code', 'کد درس')
      .replace('term', 'ترم')
      .replace('duration_minutes', 'مدت امتحان')
      .replace('expected_students', 'تعداد دانشجویان')
      .replace('location', 'محل برگزاری')
      .replace('This field is required', 'این فیلد اجباری است')
      .replace('A valid number is required', 'یک عدد معتبر وارد کنید')
      .replace('A valid integer is required', 'یک عدد صحیح معتبر وارد کنید')
      .replace('Room capacity is insufficient', 'ظرفیت مکان برگزاری کافی نیست');
  };

  // Load terms and rooms on mount
  useEffect(() => {
    loadTerms();
    loadRooms();
  }, []);

  // Load exams when term selection changes
  useEffect(() => {
    if (selectedTermId) {
      loadExams(selectedTermId);
    } else {
      setExams([]);
    }
  }, [selectedTermId]);

  // بررسی ظرفیت مکان هنگام تغییر تعداد دانشجویان، مکان، تاریخ، زمان یا مدت
  useEffect(() => {
    if (newExamLocation && newExamExpectedStudents) {
      const capacityError = validateRoomCapacity(
        newExamLocation, 
        parseInt(newExamExpectedStudents),
        newExamDate,
        newExamTime,
        newExamDurationMinutes ? parseInt(newExamDurationMinutes) : 0
      );
      setError(capacityError);
    } else {
      setError(null);
    }
  }, [newExamLocation, newExamExpectedStudents, newExamDate, newExamTime, newExamDurationMinutes, exams, rooms]);

  async function loadTerms() {
    try {
      setLoading(true);
      console.log('Loading terms...');
      const fetchedTerms = await getTerms();
      console.log('Fetched terms:', fetchedTerms);
      setTerms(fetchedTerms);
      // Automatically select the first non-archived term if available
      const firstActiveTerm = fetchedTerms.find(term => !term.is_archived);
      if (firstActiveTerm) {
        setSelectedTermId(firstActiveTerm.id);
      }
    } catch (err: any) {
      console.error('Error loading terms:', err);
      setError('خطا در بارگذاری ترم‌ها: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRooms() {
    try {
      console.log('Loading rooms...');
      const [fetchedRooms, fetchedCategories] = await Promise.all([
        getRooms(),
        getRoomCategories().catch((err) => {
          console.warn('Failed to load room categories', err);
          return [];
        }),
      ]);
      console.log('Fetched rooms:', fetchedRooms);
      setRooms(fetchedRooms);
      if (fetchedCategories.length > 0) {
        setRoomCategories(fetchedCategories);
      }
    } catch (err: any) {
      console.error('Error loading rooms:', err);
      setError('خطا در بارگذاری لیست مکان‌ها: ' + err.message);
    }
  }

  async function loadExams(termId: number) {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading exams for term:', termId);
      const fetchedExams = await getExams(termId);
      console.log('Fetched exams:', fetchedExams);
      setExams(fetchedExams);
      setCurrentPage(1); // Reset to first page when loading new exams
      
      // Fetch allocations for all exams
      if (fetchedExams.length > 0) {
        const examIds = fetchedExams.map(exam => exam.id);
        try {
          const allocations = await getAllocationsForExams(examIds);
          setAllocationsMap(allocations);
          console.log('Loaded allocations:', allocations);
        } catch (err) {
          console.warn('Failed to load allocations:', err);
          setAllocationsMap(new Map());
        }
      } else {
        setAllocationsMap(new Map());
      }
    } catch (err: any) {
      console.error('Error loading exams:', err);
      setError('خطا در بارگذاری لیست امتحانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(exams.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExams = exams.slice(startIndex, endIndex);
  
  // Check if an exam has conflicts with other exams
  const checkExamConflicts = (exam: Exam): { hasConflict: boolean; conflictingExams: Exam[] } => {
    const allocation = allocationsMap.get(exam.id);
    if (!allocation || !allocation.date || !allocation.time || !allocation.room) {
      return { hasConflict: false, conflictingExams: [] };
    }
    
    const conflictingExams = exams.filter(otherExam => {
      if (otherExam.id === exam.id) return false; // Don't check against itself
      
      const otherAllocation = allocationsMap.get(otherExam.id);
      if (!otherAllocation || !otherAllocation.date || !otherAllocation.time || !otherAllocation.room) {
        return false;
      }
      
      // Check if same room
      if (allocation.room !== otherAllocation.room) return false;
      
      // Check if same date
      if (allocation.date !== otherAllocation.date) return false;
      
      // Check time overlap
      const examDuration = exam.duration_minutes || 120;
      const otherDuration = otherExam.duration_minutes || 120;
      
      return checkTimeOverlap(
        allocation.date,
        allocation.time || '',
        examDuration,
        otherAllocation.date,
        otherAllocation.time || '',
        otherDuration
      );
    });
    
    return {
      hasConflict: conflictingExams.length > 0,
      conflictingExams
    };
  };
  
  // Get status for an exam
  const getExamStatus = (exam: Exam): { text: string; color: string; hasAllocation: boolean; hasConflict: boolean } => {
    const allocation = allocationsMap.get(exam.id);
    
    if (!allocation || !allocation.date || !allocation.time || !allocation.room) {
      return {
        text: 'بدون زمان و مکان',
        color: 'bg-gray-100 text-gray-700',
        hasAllocation: false,
        hasConflict: false
      };
    }
    
    const conflicts = checkExamConflicts(exam);
    if (conflicts.hasConflict) {
      return {
        text: `تداخل با ${conflicts.conflictingExams.length} امتحان`,
        color: 'bg-red-100 text-red-700',
        hasAllocation: true,
        hasConflict: true
      };
    }
    
    return {
      text: 'زمان و مکان اختصاص یافته',
      color: 'bg-green-100 text-green-700',
      hasAllocation: true,
      hasConflict: false
    };
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTermId) {
      setError('لطفاً یک ترم را انتخاب کنید');
      return;
    }

    // بررسی ظرفیت مکان قبل از ارسال درخواست
    if (newExamLocation && newExamExpectedStudents) {
      const capacityError = validateRoomCapacity(
        newExamLocation, 
        parseInt(newExamExpectedStudents),
        newExamDate,
        newExamTime,
        newExamDurationMinutes ? parseInt(newExamDurationMinutes) : 0
      );
      if (capacityError) {
        setError(capacityError);
        return;
      }
    }

    try {
      setAdding(true);
      setError(null);

      // Convert Jalali date to ISO format
      let isoDate: string | undefined = undefined;
      if (newExamDate) {
        try {
          const date = parseJalali(newExamDate, 'yyyy/MM/dd', new Date());
          isoDate = formatISO(date, { representation: 'date' });
        } catch (e) {
          throw new Error('تاریخ را به فرمت صحیح وارد کنید (مثال: ۱۴۰۲/۰۸/۱۵)');
        }
      }

      const payload: CreateExamPayload = {
        title: newExamTitle.trim(),
        course_code: newExamCourseCode.trim() || undefined,
        term: selectedTermId,
        owner: 1, // مقدار ثابت برای owner
        date: isoDate,
        time: newExamTime || undefined,
        duration_minutes: newExamDurationMinutes ? parseInt(newExamDurationMinutes) : undefined,
        expected_students: newExamExpectedStudents ? parseInt(newExamExpectedStudents) : undefined,
        location: newExamLocation || undefined,
      };

      console.log('Creating exam with payload:', payload);
      const createdExam = await createExam(payload);
      console.log('Exam created:', createdExam);

      // Create allocation if date, time, location, and expected_students are provided
      if (createdExam.id && isoDate && newExamTime && newExamLocation && newExamExpectedStudents) {
        try {
          // Parse time (format: HH:MM) - treat as UTC time directly (no timezone conversion)
          const [hours, minutes] = newExamTime.split(':').map(Number);
          
          // Create start datetime in UTC (treating the input time as UTC, not local time)
          // This ensures the time displayed is exactly what the user entered
          const startDateTime = new Date(Date.UTC(
            parseInt(isoDate.split('-')[0]), // year
            parseInt(isoDate.split('-')[1]) - 1, // month (0-indexed)
            parseInt(isoDate.split('-')[2]), // day
            hours,
            minutes,
            0,
            0
          ));
          
          // Calculate end datetime (default duration: 120 minutes if not specified)
          const durationMinutes = newExamDurationMinutes ? parseInt(newExamDurationMinutes) : 120;
          const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

          const startAtISO = startDateTime.toISOString();
          const endAtISO = endDateTime.toISOString();
          
          console.log('Time conversion:', {
            inputTime: newExamTime,
            hours,
            minutes,
            startAtISO,
            extractedTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
          });

          const allocationPayload: CreateAllocationPayload = {
            exam: createdExam.id,
            room: parseInt(newExamLocation),
            start_at: startAtISO,
            end_at: endAtISO,
            allocated_seats: parseInt(newExamExpectedStudents),
          };

          console.log('Creating allocation with payload:', allocationPayload);
          await createAllocation(allocationPayload);
          console.log('Allocation created successfully');
        } catch (allocationError: any) {
          console.error('Error creating allocation:', allocationError);
          // Don't fail the whole operation if allocation creation fails
          // Just log the error
          setError('امتحان ایجاد شد اما خطا در ایجاد allocation: ' + allocationError.message);
        }
      }

      // Reset form
      setNewExamTitle('');
      setNewExamCourseCode('');
      setNewExamDate('');
      setNewExamTime('');
      setNewExamDurationMinutes('');
      setNewExamLocation('');
      setNewExamExpectedStudents('');

      // Refresh exam list and allocations
      if (selectedTermId) {
        await loadExams(selectedTermId);
      }
    } catch (err: any) {
      console.error('Error creating exam:', err);
      setError(translateError(err.message));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(examId: number) {
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید این امتحان را حذف کنید؟')) {
      return;
    }

    try {
      await deleteExam(examId);
      
      // If we're on the last page and it becomes empty after deletion, go to previous page
      const willBeEmpty = currentPage > 1 && currentExams.length === 1 && currentPage === totalPages;
      if (willBeEmpty) {
        setCurrentPage(prev => Math.max(1, prev - 1));
      }
      
      if (selectedTermId) {
        await loadExams(selectedTermId);
      }
    } catch (err: any) {
      console.error('Error deleting exam:', err);
      setError('خطا در حذف امتحان: ' + err.message);
    }
  }
  
  // Handle opening edit allocation modal
  function handleEditAllocation(exam: Exam) {
    const allocation = allocationsMap.get(exam.id);
    if (allocation) {
      setEditingAllocation({ examId: exam.id, allocation });
      // Set form values from allocation
      if (allocation.jalaliDate) {
        setEditAllocationDate(allocation.jalaliDate.replace(/-/g, '/'));
      } else if (allocation.date) {
        // Convert ISO to Jalali
        try {
          const date = parseISO(allocation.date);
          const jalaliDateStr = formatJalali(date, 'yyyy/MM/dd');
          setEditAllocationDate(jalaliDateStr);
        } catch {
          setEditAllocationDate('');
        }
      } else {
        setEditAllocationDate('');
      }
      setEditAllocationTime(allocation.time || '');
      setEditAllocationLocation(allocation.room ? String(allocation.room) : '');
      setEditAllocationDuration(exam.duration_minutes ? String(exam.duration_minutes) : '120');
      setEditAllocationSeats(allocation.allocated_seats ? String(allocation.allocated_seats) : (exam.expected_students ? String(exam.expected_students) : ''));
    } else {
      // If no allocation exists, create a new one
      setEditingAllocation({ 
        examId: exam.id, 
        allocation: {
          id: 0,
          exam: exam.id,
          room: exam.location ? Number(exam.location) : undefined,
          date: exam.date,
          time: exam.time,
          allocated_seats: exam.expected_students,
        } as Allocation
      });
      // Set form values from exam
      if (exam.date) {
        try {
          const date = parseISO(exam.date);
          const jalaliDateStr = formatJalali(date, 'yyyy/MM/dd');
          setEditAllocationDate(jalaliDateStr);
        } catch {
          setEditAllocationDate('');
        }
      } else {
        setEditAllocationDate('');
      }
      setEditAllocationTime(exam.time || '');
      setEditAllocationLocation(exam.location || '');
      setEditAllocationDuration(exam.duration_minutes ? String(exam.duration_minutes) : '120');
      setEditAllocationSeats(exam.expected_students ? String(exam.expected_students) : '');
    }
  }
  
  // Handle updating allocation
  async function handleUpdateAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAllocation) return;
    
    try {
      setUpdating(true);
      setError(null);
      
      const { examId, allocation } = editingAllocation;
      const exam = exams.find(e => e.id === examId);
      if (!exam) {
        throw new Error('امتحان یافت نشد');
      }
      
      if (!editAllocationDate || !editAllocationTime || !editAllocationLocation || !editAllocationSeats) {
        throw new Error('لطفاً تمام فیلدهای الزامی را پر کنید');
      }
      
      // Convert Jalali date to ISO
      let isoDate: string;
      try {
        const date = parseJalali(editAllocationDate, 'yyyy/MM/dd', new Date());
        isoDate = formatISO(date, { representation: 'date' });
      } catch (e) {
        throw new Error('تاریخ را به فرمت صحیح وارد کنید (مثال: ۱۴۰۲/۰۸/۱۵)');
      }
      
      // Parse time and create datetime
      const [hours, minutes] = editAllocationTime.split(':').map(Number);
      const durationMinutes = editAllocationDuration ? parseInt(editAllocationDuration) : (exam.duration_minutes || 120);
      
      const startDateTime = new Date(Date.UTC(
        parseInt(isoDate.split('-')[0]),
        parseInt(isoDate.split('-')[1]) - 1,
        parseInt(isoDate.split('-')[2]),
        hours,
        minutes,
        0,
        0
      ));
      
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
      
      const updatePayload: UpdateAllocationPayload = {
        room: parseInt(editAllocationLocation),
        start_at: startDateTime.toISOString(),
        end_at: endDateTime.toISOString(),
        allocated_seats: parseInt(editAllocationSeats),
      };
      
      if (allocation.id && allocation.id > 0) {
        // Update existing allocation
        await updateAllocation(allocation.id, updatePayload);
      } else {
        // Create new allocation
        const createPayload: CreateAllocationPayload = {
          exam: examId,
          ...updatePayload
        };
        await createAllocation(createPayload);
      }
      
      setEditingAllocation(null);
      // Reset form values
      setEditAllocationDate('');
      setEditAllocationTime('');
      setEditAllocationLocation('');
      setEditAllocationDuration('');
      setEditAllocationSeats('');
      
      // Refresh exams and allocations
      if (selectedTermId) {
        await loadExams(selectedTermId);
      }
    } catch (err: any) {
      console.error('Error updating allocation:', err);
      setError('خطا در به‌روزرسانی allocation: ' + err.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading && terms.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-15xl mx-auto p-20 min-h-screen bg-white dark:bg-gray-900" dir='rtl'>
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          انتخاب ترم
        </label>
        <select
          value={selectedTermId || ''}
          onChange={(e) => setSelectedTermId(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full md:w-64 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-8"
        >
          <option value="">انتخاب ترم...</option>
          {terms.filter(term => !term.is_archived).map(term => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {selectedTermId && (
        <form onSubmit={handleSubmit} className="mb-8 space-y-4 bg-gray-50 p-4 rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white">
          <h2 className="text-lg font-medium mb-4">ثبت امتحان جدید</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={newExamTitle}
              onChange={(e) => setNewExamTitle(e.target.value)}
              placeholder="عنوان امتحان"
              className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
              disabled={adding}
              required
            />

            <input
              type="text"
              value={newExamCourseCode}
              onChange={(e) => setNewExamCourseCode(e.target.value)}
              placeholder="کد درس"
              className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
              disabled={adding}
            />

            <JalaliDatePicker
              value={newExamDate}
              onChange={setNewExamDate}
              disabled={adding}
              placeholder="تاریخ (شمسی)"
            />

            <input
              type="time"
              value={newExamTime}
              onChange={(e) => setNewExamTime(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
              disabled={adding}
              placeholder="ساعت"
            />

            <input
              type="number"
              value={newExamDurationMinutes}
              onChange={(e) => setNewExamDurationMinutes(e.target.value)}
              placeholder="مدت امتحان (دقیقه)"
              className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
              disabled={adding}
              min="0"
            />

            <input
              type="number"
              value={newExamExpectedStudents}
              onChange={(e) => setNewExamExpectedStudents(e.target.value)}
              placeholder="تعداد دانشجویان"
              className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
              disabled={adding}
              min="0"
            />

            <select
              value={newExamLocation}
              onChange={(e) => setNewExamLocation(e.target.value)}
              className={`rounded-lg border py-2 px-8 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                error && newExamLocation ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
              }`}
              disabled={adding}
            >
              <option value="">محل برگزاری...</option>
              {rooms.map(room => {
                const optionLabel = formatRoomOptionLabel(room, roomCategories);
                const capacityInfo = getAvailableCapacity(
                  room.id,
                  newExamDate,
                  newExamTime,
                  newExamDurationMinutes ? parseInt(newExamDurationMinutes) : 0
                );
                const available = capacityInfo?.available ?? room.capacity ?? 0;
                const isDisabled = !!(newExamExpectedStudents && available && parseInt(newExamExpectedStudents) > available);
                
                return (
                  <option 
                    key={room.id} 
                    value={room.id}
                    disabled={isDisabled}
                  >
                    {optionLabel}
                    {capacityInfo && newExamDate && newExamTime 
                      ? ` (ظرفیت: ${capacityInfo.total}, باقیمانده: ${capacityInfo.available}${capacityInfo.overlappingCount > 0 ? `، ${capacityInfo.overlappingCount} امتحان همزمان` : ''})`
                      : room.capacity ? ` (ظرفیت: ${room.capacity})` : ''
                    }
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex gap-4">
            <Button 
              type="submit" 
              disabled={adding || !newExamTitle.trim() || Boolean(error)}
            >
              {adding ? 'در حال ثبت...' : (
                <>
                  <PlusIcon className="h-5 w-5 mr-1" />
                  ثبت امتحان
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {selectedTermId && exams.length > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            نمایش {startIndex + 1} تا {Math.min(endIndex, exams.length)} از {exams.length} امتحان
            {totalPages > 1 && (
              <span className="mr-2">(صفحه {currentPage} از {totalPages})</span>
            )}
          </div>
        )}
        
        {currentExams.map(exam => {
          const status = getExamStatus(exam);
          const allocation = allocationsMap.get(exam.id);
          
          return (
          <div
            key={exam.id}
            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
          >
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium">{exam.title}</h3>
                  <span 
                    className={`px-2 py-1 text-xs rounded-full ${status.color} ${status.hasConflict ? 'cursor-pointer hover:opacity-80' : ''}`}
                    onClick={() => {
                      if (status.hasConflict) {
                        const conflicts = checkExamConflicts(exam);
                        setConflictDetails({ exam, conflictingExams: conflicts.conflictingExams });
                      }
                    }}
                    title={status.hasConflict ? 'کلیک کنید برای مشاهده جزئیات تداخل' : ''}
                  >
                    {status.text}
                  </span>
                </div>
              <div className="text-sm text-gray-500 space-y-1">
                {exam.course_code && <div>کد درس: {exam.course_code}</div>}
                  {allocation?.date && <div>تاریخ: {allocation.date}</div>}
                  {allocation?.time && <div>ساعت: {allocation.time}</div>}
                {exam.duration_minutes && <div>مدت: {exam.duration_minutes} دقیقه</div>}
                {exam.expected_students && <div>تعداد دانشجویان: {exam.expected_students}</div>}
                {allocation?.room && (
                  <div>
                    محل برگزاری:{' '}
                    {(() => {
                      const room = rooms.find(r => r.id === allocation.room);
                      if (room) return formatRoomOptionLabel(room, roomCategories);
                      return allocation.room;
                    })()}
                  </div>
                )}
              </div>
            </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEditAllocation(exam)}
                  className="p-1 hover:bg-blue-50 rounded"
                  title="ویرایش زمان و مکان"
                >
                  <PencilIcon className="h-5 w-5 text-gray-500 hover:text-blue-600" />
                </button>
            <button
              onClick={() => handleDelete(exam.id)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="حذف امتحان"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
            </button>
          </div>
            </div>
          );
        })}

        {/* Pagination Controls */}
        {selectedTermId && exams.length > 0 && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              قبلی
            </button>
            
            <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
              صفحه {currentPage} از {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              بعدی
            </button>
          </div>
        )}

        {selectedTermId && exams.length === 0 && !error && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
            هیچ امتحانی برای این ترم ثبت نشده است.
          </p>
        )}

        {!selectedTermId && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
            لطفاً یک ترم را انتخاب کنید.
          </p>
        )}
      </div>
      
      {/* Edit Allocation Modal */}
      {editingAllocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-medium mb-4">ویرایش زمان و مکان امتحان</h2>
            
            <form onSubmit={handleUpdateAllocation} className="space-y-4">
              <JalaliDatePicker
                value={editAllocationDate}
                onChange={setEditAllocationDate}
                disabled={updating}
                placeholder="تاریخ (شمسی)"
              />
              
              <input
                type="time"
                value={editAllocationTime}
                onChange={(e) => setEditAllocationTime(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2 px-4"
                disabled={updating}
                required
              />
              
              <input
                type="number"
                value={editAllocationDuration}
                onChange={(e) => setEditAllocationDuration(e.target.value)}
                placeholder="مدت امتحان (دقیقه)"
                className="w-full rounded-lg border border-gray-200 py-2 px-4"
                disabled={updating}
                min="1"
              />
              
              <select
                value={editAllocationLocation}
                onChange={(e) => setEditAllocationLocation(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2 px-8"
                disabled={updating}
                required
              >
                <option value="">انتخاب محل برگزاری</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {formatRoomOptionLabel(room, roomCategories)} {room.capacity ? `(ظرفیت: ${room.capacity})` : ''}
                  </option>
                ))}
              </select>
              
              <input
                type="number"
                value={editAllocationSeats}
                onChange={(e) => setEditAllocationSeats(e.target.value)}
                placeholder="تعداد دانشجویان"
                className="w-full rounded-lg border border-gray-200 py-2 px-12"
                disabled={updating}
                min="1"
                required
              />
              
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingAllocation(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={updating}
                >
                  انصراف
                </button>
                <Button
                  type="submit"
                  disabled={updating}
                >
                  {updating ? 'در حال ذخیره...' : 'ذخیره'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Conflict Details Modal */}
      {conflictDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-red-600">
                جزئیات تداخل برای: {conflictDetails.exam.title}
              </h2>
              <button
                onClick={() => setConflictDetails(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700 mb-2">
                این امتحان با <strong>{conflictDetails.conflictingExams.length}</strong> امتحان دیگر تداخل دارد:
              </p>
              <div className="text-sm text-gray-700 mt-2">
                <div><strong>امتحان فعلی:</strong> {conflictDetails.exam.title}</div>
                {conflictDetails.exam.course_code && (
                  <div><strong>کد درس:</strong> {conflictDetails.exam.course_code}</div>
                )}
                {(() => {
                  const currentAllocation = allocationsMap.get(conflictDetails.exam.id);
                  const currentRoom = rooms.find(r => r.id === currentAllocation?.room);
                  return (
                    <>
                      {currentAllocation?.date && (
                        <div>
                          <strong>تاریخ:</strong> {currentAllocation.date}
                          {currentAllocation.jalaliDate && (
                            <span className="mr-2 text-gray-500">({currentAllocation.jalaliDate.replace(/-/g, '/')})</span>
                          )}
                        </div>
                      )}
                      {currentAllocation?.time && (
                        <div><strong>ساعت:</strong> {currentAllocation.time}</div>
                      )}
                      {currentRoom && (
                        <div><strong>مکان:</strong> {formatRoomOptionLabel(currentRoom, roomCategories)}</div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            
            <div className="space-y-3">
              {conflictDetails.conflictingExams.map(conflictingExam => {
                const conflictingAllocation = allocationsMap.get(conflictingExam.id);
                const conflictingRoom = rooms.find(r => r.id === conflictingAllocation?.room);
                
                return (
                  <div key={conflictingExam.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="font-medium text-gray-900 mb-2">
                      {conflictingExam.title}
                      {conflictingExam.course_code && (
                        <span className="text-sm text-gray-500 mr-2">({conflictingExam.course_code})</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="font-medium">تاریخ:</span> {conflictingAllocation?.date || conflictingExam.date || '-'}
                        {conflictingAllocation?.jalaliDate && (
                          <span className="mr-2 text-gray-500">({conflictingAllocation.jalaliDate.replace(/-/g, '/')})</span>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">ساعت:</span> {conflictingAllocation?.time || conflictingExam.time || '-'}
                      </div>
                      <div>
                        <span className="font-medium">مدت:</span> {conflictingExam.duration_minutes || 120} دقیقه
                      </div>
                      <div>
                        <span className="font-medium">مکان:</span>{' '}
                        {conflictingRoom
                          ? formatRoomOptionLabel(conflictingRoom, roomCategories)
                          : conflictingAllocation?.room || conflictingExam.location || '-'}
                      </div>
                      <div>
                        <span className="font-medium">تعداد دانشجویان:</span> {conflictingExam.expected_students || conflictingAllocation?.allocated_seats || '-'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setConflictDetails(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}