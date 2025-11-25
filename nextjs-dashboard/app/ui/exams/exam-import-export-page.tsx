'use client';

import { useState, useEffect } from 'react';
import { Term, getTerms } from '@/app/lib/terms-service';
import { Exam, getExams, importExamsFromExcel, exportExamsToExcel, ImportResult } from '@/app/lib/exams-service';
import { getAllocationsForExams } from '@/app/lib/allocations-service';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, DocumentArrowDownIcon, HomeIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/ui/button';
import { useAuth } from '@/app/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { format as formatJalali } from 'date-fns-jalali';
import { parseISO } from 'date-fns';
import { LoadingSpinner } from '@/app/ui/loading-spinner';

interface PreviewExam {
  title: string;
  course_code?: string;
  date?: string;
  time?: string;
  duration_minutes?: number;
  expected_students?: number;
  location?: string;
}

export default function ExamImportExportPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<number | undefined>();
  const [exams, setExams] = useState<Exam[]>([]);
  const [allocationsMap, setAllocationsMap] = useState<Map<number, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<Array<{ exam: string; error: string }>>([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewExam[] | null>(null);
  const [totalRecordsCount, setTotalRecordsCount] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadTerms();
  }, [user, router]);

  useEffect(() => {
    if (selectedTermId) {
      loadExams(selectedTermId);
      setCurrentPage(1); // Reset to first page when term changes
    } else {
      setExams([]);
      setCurrentPage(1);
    }
  }, [selectedTermId]);
  
  // Calculate pagination
  const totalPages = Math.ceil(exams.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExams = exams.slice(startIndex, endIndex);

  async function loadTerms() {
    try {
      setLoading(true);
      const fetchedTerms = await getTerms();
      setTerms(fetchedTerms);
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

  // تابع برای فرمت کردن تاریخ ISO به شمسی
  function formatDate(dateStr: string | undefined, jalaliDate?: string): string {
    // If jalali date is already available, use it
    if (jalaliDate) {
      // Convert "1403-07-16" to "1403/07/16"
      return jalaliDate.replace(/-/g, '/');
    }
    
    if (!dateStr) return '-';
    try {
      // اگر تاریخ به فرمت ISO است (YYYY-MM-DD)
      if (dateStr.includes('-')) {
        const date = parseISO(dateStr);
        return formatJalali(date, 'yyyy/MM/dd');
      }
      // اگر قبلاً شمسی است، همان را برگردان
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }

  // تابع برای فرمت کردن زمان
  function formatTime(timeStr: string | undefined): string {
    if (!timeStr) return '-';
    // اگر زمان به فرمت HH:MM:SS است، فقط HH:MM را برگردان
    if (timeStr.includes(':') && timeStr.split(':').length > 2) {
      return timeStr.substring(0, 5);
    }
    return timeStr;
  }

  async function loadExams(termId: number) {
    try {
      setError(null);
      const fetchedExams = await getExams(termId);
      console.log('Loaded exams:', fetchedExams);
      console.log('Exam IDs:', fetchedExams.map(exam => exam.id));
      
      // Fetch allocations for all exams
      if (fetchedExams.length > 0) {
        const examIds = fetchedExams.map(exam => exam.id);
        console.log('Fetching allocations for exam IDs:', examIds);
        try {
          const allocations = await getAllocationsForExams(examIds);
          console.log('Allocations map size:', allocations.size);
          console.log('Allocations map entries:', Array.from(allocations.entries()));
          
          // Log each allocation's structure
          allocations.forEach((allocation, examId) => {
            console.log(`Allocation for exam ${examId}:`, {
              id: allocation.id,
              exam: allocation.exam,
              date: allocation.date,
              time: allocation.time,
              datetime: allocation.datetime,
              start_datetime: allocation.start_datetime,
              start_time: allocation.start_time,
              all_keys: Object.keys(allocation),
            });
          });
          
          setAllocationsMap(allocations);
        } catch (err) {
          console.error('Failed to load allocations:', err);
          setAllocationsMap(new Map());
        }
      }
      
      setExams(fetchedExams);
    } catch (err: any) {
      console.error('Error loading exams:', err);
      setError('خطا در بارگذاری امتحانات: ' + err.message);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('فقط فایل‌های Excel (.xlsx, .xls) پشتیبانی می‌شوند');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setSuccess(null);
    setPreviewData(null);
    setTotalRecordsCount(null);

    // Read and preview file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

        if (jsonData.length < 2) {
          setError('فایل Excel باید حداقل یک ردیف داده داشته باشد');
          return;
        }

        // Parse all data to count total records and create preview
        // First, normalize headers like in route.ts
        const headers = jsonData[0].map((h: any) => {
          if (h === null || h === undefined) return '';
          if (typeof h === 'number') return String(h);
          if (typeof h === 'object' && h.w) return h.w; // Excel rich text
          return String(h).trim();
        });

        // Column mapping (same as in route.ts)
        const COLUMN_MAPPING: { [key: string]: string } = {
          'عنوان': 'title',
          'title': 'title',
          'نام درس': 'title',
          'کد درس': 'course_code',
          'كد درس': 'course_code',
          'course_code': 'course_code',
          'کد': 'course_code',
          'كد': 'course_code',
          'تاریخ': 'date',
          'تاریخ (میلادی)': 'date',
          'تاریخ (شمسی)': 'date_jalali',
          'date': 'date',
          'ساعت': 'time',
          'time': 'time',
          'زمان امتحان': 'exam_datetime',
          'مدت': 'duration_minutes',
          'مدت (دقیقه)': 'duration_minutes',
          'duration_minutes': 'duration_minutes',
          'مدت امتحان': 'duration_minutes',
          'تعداد دانشجویان': 'expected_students',
          'تعداد ثبت نامي': 'expected_students',
          'تعداد ثبت نامی': 'expected_students',
          'expected_students': 'expected_students',
          'ظرفیت': 'expected_students',
          'حداكثر ظرفيت': 'expected_students',
          'حداکثر ظرفیت': 'expected_students',
          'محل برگزاری': 'location',
          'location': 'location',
          'مکان': 'location',
        };

        // Map headers to column indices (same logic as route.ts)
        const headerMap: { [key: string]: number } = {};
        headers.forEach((header, index) => {
          if (!header) return;
          
          const headerCleaned = String(header).trim().replace(/\s+/g, ' ');
          const isPersian = /[\u0600-\u06FF]/.test(headerCleaned);
          const headerNormalized = isPersian ? headerCleaned : headerCleaned.toLowerCase();
          
          for (const [key, value] of Object.entries(COLUMN_MAPPING)) {
            const keyCleaned = String(key).trim().replace(/\s+/g, ' ');
            const keyIsPersian = /[\u0600-\u06FF]/.test(keyCleaned);
            const keyNormalized = keyIsPersian ? keyCleaned : keyCleaned.toLowerCase();
            
            const isMatch = headerNormalized === keyNormalized;
            const partialMatch = headerNormalized.includes(keyNormalized) || keyNormalized.includes(headerNormalized);
            
            if (isMatch || (partialMatch && keyNormalized.length > 3 && headerNormalized.length > 3)) {
              if (headerMap[value] === undefined) {
                headerMap[value] = index;
              }
              if (isMatch) break;
            }
          }
        });

        const preview: PreviewExam[] = [];
        let totalCount = 0;

        // First pass: count all valid records using headerMap
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          const titleIndex = headerMap['title'];
          const title = (titleIndex !== undefined && row[titleIndex]) ? String(row[titleIndex]).trim() : '';
          if (title) {
            totalCount++;
          }
        }

        // Second pass: create preview (first 10 rows) using headerMap
        for (let i = 1; i < Math.min(jsonData.length, 11); i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const getValue = (field: string): string | undefined => {
            const index = headerMap[field];
            if (index !== undefined && row[index] !== null && row[index] !== undefined && row[index] !== '') {
              return String(row[index]).trim();
            }
            return undefined;
          };

          const getNumber = (field: string): number | undefined => {
            const index = headerMap[field];
            if (index !== undefined && row[index] !== null && row[index] !== undefined && row[index] !== '') {
              const num = Number(row[index]);
              return isNaN(num) ? undefined : num;
            }
            return undefined;
          };

          const title = getValue('title') || '';
          if (!title) continue; // Skip rows without title

          // Try to extract date from exam_datetime if it exists
          let dateValue = getValue('date') || getValue('date_jalali');
          const examDateTime = getValue('exam_datetime');
          if (!dateValue && examDateTime) {
            // If exam_datetime exists and no date found, try to extract date from it
            // Format could be: "1404/10/18 از 10:30 تا 12:00" or just "1404/10/18" or timestamp
            const examDateTimeStr = String(examDateTime).trim();
            
            // Try to match Jalali date pattern: YYYY/MM/DD or YYYY-MM-DD
            const jalaliDateMatch = examDateTimeStr.match(/^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
            if (jalaliDateMatch) {
              dateValue = jalaliDateMatch[1].replace(/-/g, '/');
            } else {
              // Check if it's a timestamp (like 1759398190296)
              const timestampMatch = examDateTimeStr.match(/^\d{10,13}$/);
              if (timestampMatch) {
                // It's a timestamp, we'll show it as is in preview (will be converted in route.ts)
                dateValue = examDateTimeStr;
              } else {
                // If it doesn't match any pattern, use the whole value as date
                dateValue = examDateTimeStr;
              }
            }
          }

          const previewExam: PreviewExam = {
            title,
            course_code: getValue('course_code'),
            date: dateValue,
            time: getValue('time'),
            duration_minutes: getNumber('duration_minutes'),
            expected_students: getNumber('expected_students'),
            location: getValue('location'),
          };

          preview.push(previewExam);
        }

        setTotalRecordsCount(totalCount);
        setPreviewData(preview);
      } catch (err: any) {
        setError('خطا در خواندن فایل Excel: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (!selectedFile) {
      setError('لطفاً یک فایل Excel انتخاب کنید');
      return;
    }

    if (!selectedTermId) {
      setError('لطفاً یک ترم را انتخاب کنید');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      setSuccess(null);

      const result: ImportResult = await importExamsFromExcel(selectedFile, selectedTermId);

      if (result.success) {
        const warningCount = result.warnings || result.errors?.filter(e => e.error.includes('⚠ هشدار')).length || 0;
        const actualFailedCount = result.failed || 0;
        
        let successMessage = `با موفقیت ${result.imported} امتحان وارد شد.`;
        if (warningCount > 0) {
          successMessage += ` ${warningCount} امتحان مشکل داشت.`;
        }
        if (actualFailedCount > 0) {
          successMessage += ` ${actualFailedCount} امتحان ایجاد نشد.`;
        }
        
        setSuccess(successMessage);
        setImportErrors(result.errors || []);
        setSelectedFile(null);
        setPreviewData(null);
        setTotalRecordsCount(null);
        // Reset file input
        const fileInput = document.getElementById('excel-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        // Reload exams
        await loadExams(selectedTermId);

        // Log errors if any
        if (result.errors && result.errors.length > 0) {
          const errorMessages = result.errors.map(e => `${e.exam}: ${e.error}`).join('\n');
          console.warn('Import errors:', errorMessages);
        }
      } else {
        setError('خطا در وارد کردن فایل Excel');
        setImportErrors([]);
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'خطا در وارد کردن فایل Excel');
      setImportErrors([]);
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    if (!selectedTermId) {
      setError('لطفاً یک ترم را انتخاب کنید');
      return;
    }

    try {
      setExporting(true);
      setError(null);
      setSuccess(null);

      const blob = await exportExamsToExcel(selectedTermId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exams-${selectedTermId}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess('فایل Excel با موفقیت دانلود شد');
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'خطا در خروجی گرفتن فایل Excel');
    } finally {
      setExporting(false);
    }
  }

  if (loading && terms.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-6xl mx-auto p-4" dir="rtl">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <HomeIcon className="h-5 w-5" />
          <span>بازگشت به صفحه اصلی</span>
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-6">وارد کردن و خروجی گرفتن امتحانات</h1>

      {/* Semester Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          انتخاب ترم
        </label>
        <select
          value={selectedTermId || ''}
          onChange={(e) => setSelectedTermId(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full md:w-64 rounded-lg border border-gray-200 py-2 px-8"
        >
          <option value="">انتخاب ترم...</option>
          {terms.filter(term => !term.is_archived).map(term => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-600 rounded-lg">
          {success}
        </div>
      )}

      {/* Import Warnings Details */}
      {importErrors.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">
            ⚠ هشدارها ({importErrors.length} مورد):
          </h3>
          <div className="max-h-60 overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-yellow-300">
                  <th className="text-right py-2 pr-4 text-yellow-800">امتحان</th>
                  <th className="text-right py-2 pr-4 text-yellow-800">خطا</th>
                </tr>
              </thead>
              <tbody>
                {importErrors.map((err, idx) => (
                  <tr key={idx} className="border-b border-yellow-200 last:border-b-0">
                    <td className="py-2 pr-4 text-yellow-700 font-medium">{err.exam || 'نامشخص'}</td>
                    <td className="py-2 pr-4 text-yellow-700">{err.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Import Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <ArrowUpTrayIcon className="h-5 w-5" />
            وارد کردن از Excel
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                انتخاب فایل Excel
              </label>
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={importing || !selectedTermId}
              />
            </div>

            {previewData && previewData.length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    پیش‌نمایش داده‌ها ({previewData.length} ردیف اول از {totalRecordsCount !== null ? totalRecordsCount : '...'} رکورد):
                  </h3>
                  {totalRecordsCount !== null && (
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      تعداد کل رکوردها: {totalRecordsCount}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 text-right">عنوان</th>
                        <th className="px-2 py-1 text-right">کد درس</th>
                        <th className="px-2 py-1 text-right">تاریخ</th>
                        <th className="px-2 py-1 text-right">ساعت</th>
                        <th className="px-2 py-1 text-right">تعداد دانشجو</th>
                        <th className="px-2 py-1 text-right">مکان</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((exam, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-2 py-1">{exam.title}</td>
                          <td className="px-2 py-1">{exam.course_code || '-'}</td>
                          <td className="px-2 py-1">{exam.date || '-'}</td>
                          <td className="px-2 py-1">{exam.time || '-'}</td>
                          <td className="px-2 py-1">{exam.expected_students || '-'}</td>
                          <td className="px-2 py-1">{exam.location || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalRecordsCount !== null && totalRecordsCount > previewData.length && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    نمایش {previewData.length} رکورد اول از {totalRecordsCount} رکورد موجود در فایل
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={importing || !selectedFile || !selectedTermId}
              className="w-full"
            >
              {importing ? 'در حال وارد کردن...' : (
                <>
                  <ArrowUpTrayIcon className="h-5 w-5 ml-1" />
                  وارد کردن امتحانات
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <ArrowDownTrayIcon className="h-5 w-5" />
            خروجی گرفتن به Excel
          </h2>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              تمام امتحانات ترم انتخاب شده را به صورت فایل Excel دانلود کنید.
            </p>
            <p className="text-sm text-gray-500">
              تعداد امتحانات فعلی: <strong>{exams.length}</strong>
            </p>
            <Button
              onClick={handleExport}
              disabled={exporting || !selectedTermId || exams.length === 0}
              className="w-full"
            >
              {exporting ? 'در حال آماده‌سازی...' : (
                <>
                  <DocumentArrowDownIcon className="h-5 w-5 ml-1" />
                  دانلود فایل Excel
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Current Exams Table */}
      {selectedTermId && exams.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-medium mb-4">
            امتحانات ترم انتخاب شده ({exams.length} مورد)
            {totalPages > 1 && (
              <span className="text-sm text-gray-500 font-normal mr-2">
                (صفحه {currentPage} از {totalPages})
              </span>
            )}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-right">عنوان</th>
                  <th className="px-4 py-2 text-right">کد درس</th>
                  <th className="px-4 py-2 text-right">تاریخ (شمسی)</th>
                  <th className="px-4 py-2 text-right">ساعت</th>
                  <th className="px-4 py-2 text-right">مدت (دقیقه)</th>
                  <th className="px-4 py-2 text-right">تعداد دانشجویان</th>
                </tr>
              </thead>
              <tbody>
                {currentExams.map((exam) => {
                  // Get allocation data for this exam
                  const allocation = allocationsMap.get(exam.id);
                  
                  // Use date and time from allocation (already extracted from start_at in service)
                  // or fallback to exam data
                  const examDate = allocation?.date || exam.date;
                  const examTime = allocation?.time || exam.time;
                  const examJalaliDate = allocation?.jalaliDate;
                  
                  // Debug logging
                  console.log(`Rendering exam ${exam.id}:`, {
                    examId: exam.id,
                    examIdType: typeof exam.id,
                    allocationsMapSize: allocationsMap.size,
                    allocationsMapKeys: Array.from(allocationsMap.keys()),
                    hasAllocation: !!allocation,
                    allocationStartAt: allocation?.start_at,
                    allocationDate: allocation?.date,
                    allocationTime: allocation?.time,
                    allocationJalaliDate: allocation?.jalaliDate,
                    examDate: exam.date,
                    examTime: exam.time,
                    finalDate: examDate,
                    finalTime: examTime,
                    finalJalaliDate: examJalaliDate,
                  });
                  
                  return (
                    <tr key={exam.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{exam.title}</td>
                      <td className="px-4 py-2">{exam.course_code || '-'}</td>
                      <td className="px-4 py-2">{formatDate(examDate, examJalaliDate)}</td>
                      <td className="px-4 py-2">{formatTime(examTime)}</td>
                      <td className="px-4 py-2">{exam.duration_minutes || '-'}</td>
                      <td className="px-4 py-2">{exam.expected_students || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                قبلی
              </button>
              
              <span className="px-4 py-2 text-sm text-gray-600">
                صفحه {currentPage} از {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                بعدی
              </button>
            </div>
          )}
        </div>
      )}

      {selectedTermId && exams.length === 0 && (
        <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
          هیچ امتحانی برای این ترم ثبت نشده است.
        </div>
      )}
    </div>
  );
}

