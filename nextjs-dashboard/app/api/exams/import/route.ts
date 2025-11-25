import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { parse as parseJalali, formatISO } from 'date-fns-jalali';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const EXAMS_API = `${API_BASE_URL}/api/exams/`;
const ROOMS_API = `${API_BASE_URL}/api/rooms/`;
const ALLOCATIONS_API = `${API_BASE_URL}/api/allocations/`;

// Expected Excel columns (can be in Persian or English)
const COLUMN_MAPPING: { [key: string]: string } = {
  'عنوان': 'title',
  'title': 'title',
  'نام درس': 'title',
  'کد درس': 'course_code',
  'كد درس': 'course_code', // Alternative spelling (كد instead of کد)
  'course_code': 'course_code',
  'کد': 'course_code',
  'كد': 'course_code', // Alternative spelling
  'تاریخ': 'date',
  'تاریخ (میلادی)': 'date',
  'تاریخ (شمسی)': 'date_jalali', // Special handling for Jalali dates
  'date': 'date',
  'ساعت': 'time',
  'time': 'time',
  'زمان امتحان': 'exam_datetime', // New format: "1404/10/18 از 10:30 تا 12:00"
  'مدت': 'duration_minutes',
  'مدت (دقیقه)': 'duration_minutes',
  'duration_minutes': 'duration_minutes',
  'مدت امتحان': 'duration_minutes',
  'تعداد دانشجویان': 'expected_students',
  'تعداد ثبت نامي': 'expected_students', // Alternative field name from Excel
  'تعداد ثبت نامی': 'expected_students', // Alternative spelling
  'expected_students': 'expected_students',
  'ظرفیت': 'expected_students',
  'حداكثر ظرفيت': 'expected_students', // Maximum capacity
  'حداکثر ظرفیت': 'expected_students', // Alternative spelling
  'محل برگزاری': 'location',
  'location': 'location',
  'مکان': 'location',
};

interface ParsedExam {
  title: string;
  course_code?: string;
  date?: string;
  time?: string;
  duration_minutes?: number;
  expected_students?: number;
  location?: string;
}

// Parse exam datetime string in format: "1404/10/18 از 10:30 تا 12:00"
function parseExamDateTime(datetimeStr: string): { date?: string; time?: string; duration_minutes?: number } {
  try {
    // Trim whitespace from both ends
    const trimmedStr = datetimeStr.trim();
    console.log(`Parsing exam datetime: "${trimmedStr}" (original: "${datetimeStr}")`);
    
    // Format: "1404/10/18 از 10:30 تا 12:00"
    // Extract date part (before "از")
    const dateMatch = trimmedStr.match(/^(\d{4}\/\d{1,2}\/\d{1,2})/);
    if (!dateMatch) {
      console.warn(`  ✗ Could not extract date from: "${datetimeStr}"`);
      return {};
    }
    
    const jalaliDateStr = dateMatch[1];
    console.log(`  Extracted Jalali date: "${jalaliDateStr}"`);
    
    // Convert Jalali date to ISO
    const normalizedJalali = jalaliDateStr.replace(/-/g, '/');
    const date = parseJalali(normalizedJalali, 'yyyy/MM/dd', new Date());
    const isoDate = formatISO(date, { representation: 'date' });
    console.log(`  Converted to ISO date: "${isoDate}"`);
    
    // Extract time range: "از 10:30 تا 12:00" (handle various spacing)
    // Try different patterns to handle Persian text and spacing variations
    const timeRangePatterns = [
      /از\s+(\d{1,2}):(\d{2})\s+تا\s+(\d{1,2}):(\d{2})/,  // Standard: "از 10:30 تا 12:00"
      /از\s*(\d{1,2}):(\d{2})\s*تا\s*(\d{1,2}):(\d{2})/,  // Flexible spacing
      /(\d{1,2}):(\d{2})\s*تا\s*(\d{1,2}):(\d{2})/,       // Without "از"
    ];
    
    let timeRangeMatch = null;
    for (const pattern of timeRangePatterns) {
      timeRangeMatch = trimmedStr.match(pattern);
      if (timeRangeMatch) {
        console.log(`  Matched time range pattern: ${pattern}`);
        break;
      }
    }
    
    if (!timeRangeMatch) {
      console.warn(`  ✗ Could not extract time range from: "${trimmedStr}"`);
      return { date: isoDate };
    }
    
    const startHour = parseInt(timeRangeMatch[1]);
    const startMinute = parseInt(timeRangeMatch[2]);
    const endHour = parseInt(timeRangeMatch[3]);
    const endMinute = parseInt(timeRangeMatch[4]);
    
    const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
    console.log(`  Extracted start time: "${startTime}"`);
    
    // Calculate duration in minutes
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    let durationMinutes = endTotalMinutes - startTotalMinutes;
    
    // Handle case where end time is next day (e.g., 23:00 to 01:00)
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60; // Add 24 hours
    }
    
    console.log(`  Calculated duration: ${durationMinutes} minutes`);
    
    return {
      date: isoDate,
      time: startTime,
      duration_minutes: durationMinutes,
    };
  } catch (error) {
    console.error(`  ✗ Error parsing exam datetime: "${datetimeStr}"`, error);
    return {};
  }
}

function normalizeColumnName(col: string): string {
  return col.trim().toLowerCase();
}

function parseExcelFile(buffer: Buffer): ParsedExam[] {
  // Read Excel file with proper options
  const workbook = XLSX.read(buffer, { 
    type: 'buffer',
    cellText: false,
    cellDates: true,
  });
  
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('فایل Excel خالی است یا فرمت نامعتبر دارد');
  }
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    throw new Error('نمی‌توان sheet اول را خواند');
  }
  
  // Convert to JSON with proper options
  const data = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: '',
    raw: false, // Convert dates and numbers to strings
  }) as any[][];

  if (!data || data.length < 2) {
    throw new Error('فایل Excel باید حداقل یک ردیف داده داشته باشد');
  }

  // First row is headers - handle various formats
  const headers = data[0].map((h: any) => {
    if (h === null || h === undefined) return '';
    // Handle different data types
    if (typeof h === 'number') return String(h);
    if (typeof h === 'object' && h.w) return h.w; // Excel rich text
    return String(h).trim();
  }).filter((h, i, arr) => {
    // Remove duplicate empty headers
    return h || i === 0 || arr[i - 1];
  });
  
  console.log('Excel headers found:', headers);
  console.log('First row raw data:', data[0]);
  
  const headerMap: { [key: string]: number } = {};

  // Map headers to column indices
  headers.forEach((header, index) => {
    if (!header) return; // Skip empty headers
    
    // Clean header: remove extra spaces
    const headerCleaned = String(header).trim().replace(/\s+/g, ' ');
    
    // For Persian text, we should compare directly (case doesn't matter for Persian)
    // For English text, use lowercase
    const isPersian = /[\u0600-\u06FF]/.test(headerCleaned);
    const headerNormalized = isPersian ? headerCleaned : headerCleaned.toLowerCase();
    
    console.log(`Checking header [${index}]: "${header}" (length: ${header.length}, cleaned: "${headerCleaned}", normalized: "${headerNormalized}", isPersian: ${isPersian})`);
    
    // Try to match with all possible column names
    let matched = false;
    for (const [key, value] of Object.entries(COLUMN_MAPPING)) {
      const keyCleaned = String(key).trim().replace(/\s+/g, ' ');
      const keyIsPersian = /[\u0600-\u06FF]/.test(keyCleaned);
      const keyNormalized = keyIsPersian ? keyCleaned : keyCleaned.toLowerCase();
      
      // Exact match (case-insensitive for English, exact for Persian)
      const isMatch = headerNormalized === keyNormalized;
      
      // Also try partial match for columns with parentheses like "تاریخ (میلادی)"
      const partialMatch = headerNormalized.includes(keyNormalized) || keyNormalized.includes(headerNormalized);
      
      if (isMatch || (partialMatch && keyNormalized.length > 3 && headerNormalized.length > 3)) {
        // Only set if not already set (prefer first match)
        if (headerMap[value] === undefined) {
          headerMap[value] = index;
          console.log(`  ✓✓✓ MATCHED! Header "${header}" (index ${index}) -> field "${value}" (${isMatch ? 'exact' : 'partial'} match)`);
          matched = true;
        } else {
          console.log(`  ⚠ Field "${value}" already mapped to index ${headerMap[value]}, skipping duplicate`);
        }
        if (isMatch) {
          break; // Found exact match, no need to check further
        }
      }
    }
    
    if (!matched) {
      console.log(`  ✗ No match found for header "${header}"`);
    }
  });

  console.log('=== Header Mapping Summary ===');
  console.log('Header mapping result:', headerMap);
  console.log('Available headers with indices:', headers.map((h, i) => `[${i}] "${h}"`).join(', '));
  console.log('Mapped columns:');
  Object.entries(headerMap).forEach(([field, index]) => {
    console.log(`  ${field} -> index ${index} (header: "${headers[index]}")`);
  });

  // Validate required columns
  if (headerMap['title'] === undefined) {
    const availableHeaders = headers.filter(h => h).join(', ');
    throw new Error(`ستون "عنوان" یا "title" یافت نشد. ستون‌های موجود: ${availableHeaders || '(هیچ)'}`);
  }
  
  console.log('✓ Required column "title" found at index:', headerMap['title']);
  console.log('Date column found:', headerMap['date'] !== undefined ? `index ${headerMap['date']}` : 'NO');
  console.log('Date Jalali column found:', headerMap['date_jalali'] !== undefined ? `index ${headerMap['date_jalali']}` : 'NO');
  console.log('Time column found:', headerMap['time'] !== undefined ? `index ${headerMap['time']}` : 'NO');
  console.log('Location column found:', headerMap['location'] !== undefined ? `index ${headerMap['location']}` : 'NO');

  const exams: ParsedExam[] = [];

  // Process data rows
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const title = row[headerMap['title']] ? String(row[headerMap['title']]).trim() : '';
    if (!title) continue; // Skip empty rows

    const exam: ParsedExam = { title };

    if (headerMap['course_code'] !== undefined) {
      const courseCode = row[headerMap['course_code']];
      if (courseCode) exam.course_code = String(courseCode).trim();
    }

    // First, check if "زمان امتحان" (exam_datetime) field exists - this has priority
    if (headerMap['exam_datetime'] !== undefined) {
      const examDateTime = row[headerMap['exam_datetime']];
      console.log(`Processing exam_datetime for row ${i}:`, {
        examDateTimeIndex: headerMap['exam_datetime'],
        examDateTimeValue: examDateTime,
      });
      
      if (examDateTime !== null && examDateTime !== undefined && examDateTime !== '') {
        const examDateTimeStr = String(examDateTime).trim();
        console.log(`  Exam datetime string: "${examDateTimeStr}"`);
        
        // Check if it's a timestamp (like 1759398190296 or 159018)
        const timestampMatch = examDateTimeStr.match(/^\d{10,13}$/);
        if (timestampMatch) {
          // It's a timestamp - convert to date
          // Timestamp could be in milliseconds (13 digits) or seconds (10 digits)
          const timestamp = parseInt(examDateTimeStr);
          const date = new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);
          if (!isNaN(date.getTime())) {
            const isoDate = formatISO(date, { representation: 'date' });
            exam.date = isoDate;
            console.log(`  ✓✓✓ Converted timestamp "${examDateTimeStr}" to date: "${isoDate}"`);
          } else {
            console.warn(`  ✗✗✗ Invalid timestamp: "${examDateTimeStr}"`);
          }
        } else {
          // Try to parse as datetime string (format: "1404/10/18 از 10:30 تا 12:00")
          const parsed = parseExamDateTime(examDateTimeStr);
          console.log(`  Parsed result:`, parsed);
          
          if (parsed.date) {
            exam.date = parsed.date;
            console.log(`  ✓✓✓ Set date from exam_datetime: "${parsed.date}"`);
          } else {
            // If parseExamDateTime didn't extract date, try to extract just the date part
            const dateMatch = examDateTimeStr.match(/^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
            if (dateMatch) {
              // It's a Jalali date, convert it
              try {
                const jalaliStr = dateMatch[1].replace(/-/g, '/');
                const jalaliDate = parseJalali(jalaliStr, 'yyyy/MM/dd', new Date());
                const isoDate = formatISO(jalaliDate, { representation: 'date' });
                exam.date = isoDate;
                console.log(`  ✓✓✓ Extracted and converted Jalali date from exam_datetime: "${isoDate}"`);
              } catch (e) {
                console.warn(`  ✗✗✗ Failed to convert Jalali date from exam_datetime: "${dateMatch[1]}"`, e);
              }
            } else {
              console.warn(`  ✗✗✗ No date extracted from exam_datetime`);
            }
          }
          
          if (parsed.time) {
            exam.time = parsed.time;
            console.log(`  ✓✓✓ Set time from exam_datetime: "${parsed.time}"`);
          } else {
            console.warn(`  ✗✗✗ No time extracted from exam_datetime`);
          }
          
          if (parsed.duration_minutes) {
            exam.duration_minutes = parsed.duration_minutes;
            console.log(`  ✓✓✓ Set duration from exam_datetime: ${parsed.duration_minutes} minutes`);
          } else {
            console.warn(`  ✗✗✗ No duration extracted from exam_datetime`);
          }
        }
      }
    }
    
    // Handle date - prefer "تاریخ (میلادی)" over "تاریخ (شمسی)" over "تاریخ"
    // Only if exam_datetime didn't provide a date
    let dateValue: string | undefined = exam.date;
    
    if (!dateValue) {
      console.log(`Processing date for row ${i}:`, {
        dateIndex: headerMap['date'],
        dateJalaliIndex: headerMap['date_jalali'],
        dateValue: headerMap['date'] !== undefined ? row[headerMap['date']] : undefined,
        dateJalaliValue: headerMap['date_jalali'] !== undefined ? row[headerMap['date_jalali']] : undefined,
      });
    }
    
    if (headerMap['date'] !== undefined) {
      const date = row[headerMap['date']];
      console.log(`  Found date at index ${headerMap['date']}:`, date, 'type:', typeof date);
      if (date !== null && date !== undefined && date !== '') {
        // Handle different date formats
        let dateStr = String(date).trim();
        console.log(`  Date string: "${dateStr}"`);
        
        // If it's an Excel date number, convert it
        if (typeof date === 'number') {
          const excelDate = XLSX.SSF.parse_date_code(date);
          if (excelDate) {
            dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
            console.log(`  Converted Excel date number to: "${dateStr}"`);
          }
        }
        
        // Check if it's already in ISO format (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          dateValue = dateStr;
          console.log(`  ✓ Using ISO date: "${dateValue}"`);
        } else {
          console.log(`  ⚠ Date string "${dateStr}" is not in ISO format`);
        }
      } else {
        console.log(`  ⚠ Date value is empty or null`);
      }
    } else {
      console.log(`  ⚠ Date column not found in headerMap`);
    }
    
    // If no ISO date found, try Jalali date
    if (!dateValue && headerMap['date_jalali'] !== undefined) {
      const jalaliDate = row[headerMap['date_jalali']];
      console.log(`  Trying Jalali date at index ${headerMap['date_jalali']}:`, jalaliDate);
      if (jalaliDate !== null && jalaliDate !== undefined && jalaliDate !== '') {
        try {
          const jalaliStr = String(jalaliDate).trim();
          console.log(`  Jalali string: "${jalaliStr}"`);
          // Try to parse Jalali date (format: YYYY/MM/DD or YYYY-MM-DD)
          const normalizedJalali = jalaliStr.replace(/-/g, '/');
          console.log(`  Normalized Jalali: "${normalizedJalali}"`);
          const date = parseJalali(normalizedJalali, 'yyyy/MM/dd', new Date());
          dateValue = formatISO(date, { representation: 'date' });
          console.log(`  ✓ Converted Jalali date "${jalaliStr}" to ISO "${dateValue}"`);
        } catch (e) {
          console.warn(`  ✗ Failed to parse Jalali date: "${jalaliDate}"`, e);
        }
      }
    }
    
    if (dateValue) {
      exam.date = dateValue;
      console.log(`  ✓ Final date value: "${dateValue}"`);
    } else {
      console.log(`  ✗ No date value found for this row`);
    }

    // Handle time - only if exam_datetime didn't provide a time
    // IMPORTANT: If "زمان امتحان" exists, we use the start time from it and ignore the separate "ساعت" field
    if (exam.time) {
      console.log(`  ✓✓✓ Time already set from exam_datetime (start time): "${exam.time}"`);
      console.log(`  ℹℹℹ Ignoring separate "ساعت" field if it exists - using time from "زمان امتحان"`);
    } else if (headerMap['time'] !== undefined) {
      const time = row[headerMap['time']];
      console.log(`Processing separate time field for row ${i} (exam_datetime did not provide time):`, {
        timeIndex: headerMap['time'],
        timeValue: time,
        timeType: typeof time,
      });
      if (time !== null && time !== undefined && time !== '') {
        let timeStr = String(time).trim();
        console.log(`  Time string: "${timeStr}"`);
        
        // Handle Excel time format
        if (typeof time === 'number') {
          const hours = Math.floor(time * 24);
          const minutes = Math.floor((time * 24 - hours) * 60);
          timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          console.log(`  Converted Excel time number to: "${timeStr}"`);
        }
        
        // Normalize time format to HH:MM
        if (timeStr.includes(':')) {
          const parts = timeStr.split(':');
          if (parts.length >= 2) {
            const hours = parts[0].padStart(2, '0');
            const minutes = parts[1].padStart(2, '0');
            timeStr = `${hours}:${minutes}`;
            console.log(`  Normalized time to: "${timeStr}"`);
          }
        }
        
        exam.time = timeStr;
        console.log(`  ✓ Final time value from separate "ساعت" field: "${timeStr}"`);
      } else {
        console.log(`  ⚠ Time value is empty or null`);
      }
    } else {
      console.log(`  ⚠ Time column not found in headerMap and exam_datetime did not provide time`);
    }

    // Handle duration - only if exam_datetime didn't provide a duration
    if (!exam.duration_minutes && headerMap['duration_minutes'] !== undefined) {
      const duration = row[headerMap['duration_minutes']];
      if (duration) {
        const durationNum = Number(duration);
        if (!isNaN(durationNum)) {
          exam.duration_minutes = Math.floor(durationNum);
          console.log(`  ✓ Set duration from duration_minutes column: ${exam.duration_minutes} minutes`);
        }
      }
    } else if (exam.duration_minutes) {
      console.log(`  ✓ Duration already set from exam_datetime: ${exam.duration_minutes} minutes`);
    }

    if (headerMap['expected_students'] !== undefined) {
      const students = row[headerMap['expected_students']];
      if (students) {
        const studentsNum = Number(students);
        if (!isNaN(studentsNum)) exam.expected_students = Math.floor(studentsNum);
      }
    }

    // Handle location - only set if it exists in Excel, otherwise leave undefined
    if (headerMap['location'] !== undefined) {
      const location = row[headerMap['location']];
      console.log(`Processing location for row ${i}:`, {
        locationIndex: headerMap['location'],
        locationValue: location,
        locationType: typeof location,
      });
      if (location !== null && location !== undefined && location !== '') {
        const locationStr = String(location).trim();
        console.log(`  Location string: "${locationStr}"`);
        // Location will be handled later - we need to convert room name to room ID
        exam.location = locationStr;
        console.log(`  ✓ Final location value: "${locationStr}"`);
      } else {
        console.log(`  ⚠ Location value is empty or null - will be left undefined`);
        // Don't set exam.location - leave it undefined
      }
    } else {
      console.log(`  ⚠ Location column not found in headerMap - will be left undefined`);
      // Don't set exam.location - leave it undefined
    }

    console.log('=== Parsed exam data ===');
    console.log('Row', i, ':', {
      title: exam.title,
      course_code: exam.course_code,
      date: exam.date,
      time: exam.time,
      duration_minutes: exam.duration_minutes,
      expected_students: exam.expected_students,
      location: exam.location,
    });
    console.log('Raw row data:', row);
    console.log('Header map indices:', {
      title: headerMap['title'],
      date: headerMap['date'],
      date_jalali: headerMap['date_jalali'],
      time: headerMap['time'],
      location: headerMap['location'],
      expected_students: headerMap['expected_students'],
    });

    exams.push(exam);
  }

  console.log(`Total parsed exams: ${exams.length}`);
  return exams;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const termId = formData.get('termId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'فایل Excel ارسال نشده است' },
        { status: 400 }
      );
    }

    if (!termId) {
      return NextResponse.json(
        { error: 'ترم انتخاب نشده است' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'فقط فایل‌های Excel (.xlsx, .xls) پشتیبانی می‌شوند' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel file
    const parsedExams = parseExcelFile(buffer);

    if (parsedExams.length === 0) {
      return NextResponse.json(
        { error: 'هیچ داده‌ای در فایل Excel یافت نشد' },
        { status: 400 }
      );
    }

    // Get auth token from request headers or cookies
    let authHeader = request.headers.get('authorization');
    if (!authHeader) {
      const token = request.cookies.get('accessToken')?.value;
      if (token) {
        authHeader = `Bearer ${token}`;
      }
    }
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'احراز هویت انجام نشده است' },
        { status: 401 }
      );
    }

    // Fetch rooms to map room names to room IDs
    const roomsMap = new Map<string, number>();
    try {
      const roomsResponse = await fetch(ROOMS_API, {
        headers: {
          'Authorization': authHeader,
        },
      });

      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json();
        const roomsArray = Array.isArray(roomsData) ? roomsData : (roomsData.results || []);
        roomsArray.forEach((room: any) => {
          if (room.id && room.name) {
            roomsMap.set(room.name.trim().toLowerCase(), room.id);
            // Also add exact match
            roomsMap.set(room.name.trim(), room.id);
          }
        });
        console.log('Loaded rooms map:', Array.from(roomsMap.entries()));
      }
    } catch (error) {
      console.warn('Failed to fetch rooms:', error);
    }

    // Fetch existing exams to check for duplicates
    const existingExamsMap = new Map<string, boolean>(); // key: "course_code|term"
    try {
      const existingExamsResponse = await fetch(`${EXAMS_API}?term=${termId}`, {
        headers: {
          'Authorization': authHeader,
        },
      });

      if (existingExamsResponse.ok) {
        const existingExamsData = await existingExamsResponse.json();
        const existingExamsArray = Array.isArray(existingExamsData) ? existingExamsData : (existingExamsData.results || []);
        existingExamsArray.forEach((existingExam: any) => {
          if (existingExam.course_code && existingExam.term) {
            const key = `${existingExam.course_code.trim()}|${existingExam.term}`;
            existingExamsMap.set(key, true);
          }
        });
        console.log(`Loaded ${existingExamsMap.size} existing exams for term ${termId}`);
      }
    } catch (error) {
      console.warn('Failed to fetch existing exams:', error);
    }

    // Create exams via API
    const createdExams = [];
    const errors = [];
    const processedCourseCodes = new Set<string>(); // Track course codes processed in this import

    for (const exam of parsedExams) {
      try {
        const warnings: string[] = [];
        
        // Validate required fields
        if (!exam.title || !exam.title.trim()) {
          errors.push({
            exam: exam.title || 'نامشخص',
            error: 'عنوان امتحان الزامی است - این رکورد نادیده گرفته شد',
          });
          continue; // Skip exams without title
        }

        // Validate date format if provided
        if (exam.date && !/^\d{4}-\d{2}-\d{2}$/.test(exam.date)) {
          // Try to parse as Jalali date
          try {
            const jalaliMatch = exam.date.match(/^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
            if (jalaliMatch) {
              const jalaliStr = jalaliMatch[1].replace(/-/g, '/');
              const jalaliDate = parseJalali(jalaliStr, 'yyyy/MM/dd', new Date());
              exam.date = formatISO(jalaliDate, { representation: 'date' });
            } else {
              // Invalid date format - remove it and warn
              warnings.push(`فرمت تاریخ نامعتبر: ${exam.date} - تاریخ حذف شد`);
              exam.date = undefined;
            }
          } catch (e) {
            warnings.push(`فرمت تاریخ نامعتبر: ${exam.date} - تاریخ حذف شد`);
            exam.date = undefined;
          }
        }

        // Validate time format if provided
        if (exam.time && !/^\d{1,2}:\d{2}$/.test(exam.time)) {
          warnings.push(`فرمت زمان نامعتبر: ${exam.time} - زمان حذف شد`);
          exam.time = undefined;
        }

        // Set default values for missing fields
        if (!exam.expected_students || exam.expected_students <= 0) {
          warnings.push('تعداد دانشجو مشخص نشده - مقدار پیش‌فرض 1 تنظیم شد');
          exam.expected_students = 1;
        }

        // Check for duplicate course_code + term combination
        if (exam.course_code && exam.course_code.trim()) {
          const courseCodeKey = exam.course_code.trim();
          const duplicateKey = `${courseCodeKey}|${parseInt(termId)}`;
          
          // Check if already exists in database
          if (existingExamsMap.has(duplicateKey)) {
            warnings.push(`این درس با کد ${courseCodeKey} قبلاً در این ترم ثبت شده است - نادیده گرفته شد`);
            errors.push({
              exam: exam.title,
              error: `⚠ هشدار: این درس با کد ${courseCodeKey} قبلاً در این ترم ثبت شده است - نادیده گرفته شد`,
            });
            continue; // Skip this exam
          }
          
          // Check if already processed in this import batch
          if (processedCourseCodes.has(duplicateKey)) {
            warnings.push(`این درس با کد ${courseCodeKey} در همین فایل تکراری است - نادیده گرفته شد`);
            errors.push({
              exam: exam.title,
              error: `⚠ هشدار: این درس با کد ${courseCodeKey} در همین فایل تکراری است - نادیده گرفته شد`,
            });
            continue; // Skip this exam
          }
          
          // Mark as processed
          processedCourseCodes.add(duplicateKey);
        }

        // Convert room name to room ID if location is provided
        let locationId: string | undefined = exam.location;
        if (exam.location) {
          const roomName = exam.location.trim();
          const roomId = roomsMap.get(roomName.toLowerCase()) || roomsMap.get(roomName);
          if (roomId) {
            locationId = String(roomId);
            console.log(`Converted room name "${roomName}" to room ID ${roomId}`);
          } else {
            // If location is already a number, use it as is
            const locationNum = Number(exam.location);
            if (!isNaN(locationNum)) {
              locationId = String(locationNum);
            } else {
              console.warn(`Room name "${roomName}" not found in rooms map`);
              // Don't fail, just warn - location can be set later
            }
          }
        }

        const payload = {
          title: exam.title.trim(),
          course_code: exam.course_code?.trim(),
          term: parseInt(termId),
          owner: 1, // Default owner
          date: exam.date,
          time: exam.time, // May be undefined
          duration_minutes: exam.duration_minutes,
          expected_students: exam.expected_students || 1, // Default to 1 if not provided
          location: locationId,
        };

        console.log('=== Creating exam ===');
        if (warnings.length > 0) {
          console.warn(`⚠ Warnings for exam "${exam.title}":`, warnings);
        }
        console.log('Original exam data:', {
          title: exam.title,
          course_code: exam.course_code,
          date: exam.date,
          time: exam.time,
          duration_minutes: exam.duration_minutes,
          expected_students: exam.expected_students,
          location: exam.location,
        });
        console.log('Location conversion:', {
          original: exam.location,
          converted: locationId,
          foundInMap: exam.location ? (roomsMap.get(exam.location.trim().toLowerCase()) || roomsMap.get(exam.location.trim())) : null,
        });
        console.log('Final payload:', JSON.stringify(payload, null, 2));
        console.log('Payload date:', payload.date, 'type:', typeof payload.date);
        console.log('Payload time:', payload.time, 'type:', typeof payload.time);

        const response = await fetch(EXAMS_API, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const created = await response.json();
          console.log('✓ Exam created successfully:', created);
          console.log('Created exam date:', created.date, 'type:', typeof created.date);
          console.log('Created exam time:', created.time, 'type:', typeof created.time);
          console.log('Created exam full object:', JSON.stringify(created, null, 2));
          createdExams.push(created);
          
          // Add to existing exams map to prevent duplicates in same batch
          if (created.course_code && created.term) {
            const duplicateKey = `${created.course_code.trim()}|${created.term}`;
            existingExamsMap.set(duplicateKey, true);
          }
          
          // Add warnings if any
          if (warnings.length > 0) {
            errors.push({
              exam: exam.title,
              error: `⚠ هشدار: ${warnings.join(' | ')}`,
            });
          }
          
          // Create allocation if date, time, location, and expected_students are provided
          // Use the same logic as in /exams page
          // Note: If location is not provided, allocation will not be created
          // The user can assign location later in /exams page
          const hasAllRequiredData = created.id && exam.date && exam.time && locationId && exam.expected_students;
          console.log('Checking if allocation should be created:', {
            hasId: !!created.id,
            hasDate: !!exam.date,
            hasTime: !!exam.time,
            hasLocation: !!locationId,
            hasExpectedStudents: !!exam.expected_students,
            willCreateAllocation: hasAllRequiredData,
          });
          
          if (hasAllRequiredData) {
            // Type guard: we know these values exist because hasAllRequiredData is true
            if (!exam.date || !exam.time || !locationId || !exam.expected_students) {
              console.error('Type guard failed - this should not happen');
              continue;
            }
            
            try {
              console.log('=== Creating allocation (same logic as /exams) ===');
              console.log('Input data:', {
                examId: created.id,
                date: exam.date,
                time: exam.time,
                locationId: locationId,
                expectedStudents: exam.expected_students,
                durationMinutes: exam.duration_minutes,
              });
              
              // Parse time (format: HH:MM) - treat as UTC time directly (no timezone conversion)
              // Same as in exams-page.tsx
              const [hours, minutes] = exam.time.split(':').map(Number);
              
              if (isNaN(hours) || isNaN(minutes)) {
                throw new Error(`Invalid time format: ${exam.time}`);
              }
              
              // Create start datetime in UTC (treating the input time as UTC, not local time)
              // This ensures the time displayed is exactly what the user entered
              // Same as in exams-page.tsx
              const dateParts = exam.date.split('-');
              if (dateParts.length < 3) {
                throw new Error(`Invalid date format: ${exam.date}`);
              }
              
              const startDateTime = new Date(Date.UTC(
                parseInt(dateParts[0]), // year
                parseInt(dateParts[1]) - 1, // month (0-indexed)
                parseInt(dateParts[2]), // day
                hours,
                minutes,
                0,
                0
              ));
              
              if (isNaN(startDateTime.getTime())) {
                throw new Error(`Invalid datetime created from: ${exam.date} ${exam.time}`);
              }
              
              // Calculate end datetime (default duration: 120 minutes if not specified)
              // Same as in exams-page.tsx
              const durationMinutes = exam.duration_minutes ? parseInt(String(exam.duration_minutes)) : 120;
              const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

              const startAtISO = startDateTime.toISOString();
              const endAtISO = endDateTime.toISOString();
              
              console.log('Time conversion:', {
                inputTime: exam.time,
                hours,
                minutes,
                startAtISO,
                extractedTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
              });

              const allocationPayload = {
                exam: created.id,
                room: parseInt(locationId),
                start_at: startAtISO,
                end_at: endAtISO,
                allocated_seats: parseInt(String(exam.expected_students)),
              };

              console.log('Creating allocation with payload:', allocationPayload);
              
              const allocationResponse = await fetch(ALLOCATIONS_API, {
                method: 'POST',
                headers: {
                  'Authorization': authHeader,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(allocationPayload),
              });

              console.log('Allocation response status:', allocationResponse.status);

              if (allocationResponse.ok) {
                const allocationData = await allocationResponse.json();
                console.log('✓✓✓ Allocation created successfully for exam:', created.id, allocationData);
              } else {
                const allocationErrorText = await allocationResponse.text();
                let allocationError: any;
                try {
                  allocationError = JSON.parse(allocationErrorText);
                } catch {
                  allocationError = { detail: allocationErrorText || 'خطا در ایجاد allocation' };
                }
                console.error('✗✗✗ Failed to create allocation:', {
                  status: allocationResponse.status,
                  statusText: allocationResponse.statusText,
                  error: allocationError,
                  payload: allocationPayload,
                });
              }
            } catch (allocationError: any) {
              console.error('✗✗✗ Error creating allocation:', {
                error: allocationError.message || allocationError,
                stack: allocationError.stack,
                exam: exam.title,
                examId: created.id,
              });
              // Don't fail the whole operation if allocation creation fails
            }
          } else {
            if (!locationId) {
              console.log('ℹℹℹ Skipping allocation creation - no location provided. Location can be assigned later in /exams page.');
            } else {
              console.warn('⚠⚠⚠ Skipping allocation creation - missing required data:', {
                hasId: !!created.id,
                hasDate: !!exam.date,
                hasTime: !!exam.time,
                hasLocation: !!locationId,
                hasExpectedStudents: !!exam.expected_students,
                values: {
                  examId: created.id,
                  date: exam.date,
                  time: exam.time,
                  locationId: locationId,
                  expectedStudents: exam.expected_students,
                },
              });
            }
          }
        } else {
          const errorData = await response.json().catch(() => ({ detail: 'خطا در ایجاد امتحان' }));
          
          // Parse validation errors
          let errorMessage = errorData.detail || errorData.message || 'خطا در ایجاد امتحان';
          
          // Check if it's a duplicate error (course_code + term unique constraint)
          const isDuplicateError = errorMessage.includes('course_code') && 
                                   errorMessage.includes('term') && 
                                   (errorMessage.includes('یکتا') || errorMessage.includes('unique') || errorMessage.includes('duplicate'));
          
          if (isDuplicateError) {
            // This is a duplicate - treat as warning and skip
            const courseCode = exam.course_code || 'نامشخص';
            errors.push({
              exam: exam.title,
              error: `⚠ هشدار: این درس با کد ${courseCode} قبلاً در این ترم ثبت شده است - نادیده گرفته شد`,
            });
            console.warn(`⚠ Duplicate exam skipped "${exam.title}" (course_code: ${courseCode})`);
          } else {
            // If it's a validation error object, format it nicely
            if (typeof errorData === 'object' && !errorData.detail && !errorData.message) {
              const validationErrors: string[] = [];
              for (const [field, messages] of Object.entries(errorData)) {
                if (Array.isArray(messages)) {
                  validationErrors.push(`${field}: ${messages.join(', ')}`);
                } else if (typeof messages === 'string') {
                  validationErrors.push(`${field}: ${messages}`);
                } else {
                  validationErrors.push(`${field}: ${JSON.stringify(messages)}`);
                }
              }
              if (validationErrors.length > 0) {
                errorMessage = validationErrors.join(' | ');
              }
            }
            
            errors.push({
              exam: exam.title,
              error: errorMessage,
            });
            
            console.error(`✗ Failed to create exam "${exam.title}":`, {
              status: response.status,
              statusText: response.statusText,
              errorData,
              formattedError: errorMessage,
            });
          }
        }
      } catch (error: any) {
        errors.push({
          exam: exam.title,
          error: error.message || 'خطا در ایجاد امتحان',
        });
      }
    }

    // Separate actual failures from warnings
    const actualFailures = errors.filter(e => !e.error.includes('⚠ هشدار'));
    const warnings = errors.filter(e => e.error.includes('⚠ هشدار'));
    
    return NextResponse.json({
      success: true,
      imported: createdExams.length,
      failed: actualFailures.length,
      warnings: warnings.length,
      exams: createdExams,
      errors: errors, // Keep all errors/warnings for display
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در پردازش فایل Excel' },
      { status: 500 }
    );
  }
}

