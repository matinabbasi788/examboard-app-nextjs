import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { format as formatJalali } from 'date-fns-jalali';
import { parseISO } from 'date-fns';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const EXAMS_API = `${API_BASE_URL}/api/exams/`;
const ALLOCATIONS_API = `${API_BASE_URL}/api/allocations/`;
const ROOMS_API = `${API_BASE_URL}/api/rooms/`;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const termId = searchParams.get('termId');

    if (!termId) {
      return NextResponse.json(
        { error: 'ترم انتخاب نشده است' },
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

    // Fetch all exams from API (with pagination support)
    let allExams: any[] = [];
    let nextUrl: string | null = `${EXAMS_API}?term=${termId}`;
    
    console.log('Fetching all exams for export from:', nextUrl);
    
    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: {
          'Authorization': authHeader,
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: 'خطا در دریافت داده‌های امتحانات' },
          { status: response.status }
        );
      }

      const data = await response.json();
      const examsArray = Array.isArray(data) ? data : (data.results || []);
      allExams = allExams.concat(examsArray);
      
      console.log(`Fetched ${examsArray.length} exams from this page, total: ${allExams.length}`);
      
      // Check if there's a next page
      nextUrl = data.next || null;
    }

    if (allExams.length === 0) {
      return NextResponse.json(
        { error: 'هیچ امتحانی برای این ترم یافت نشد' },
        { status: 404 }
      );
    }
    
    console.log(`Total exams fetched for export: ${allExams.length}`);
    const examsArray = allExams;

    // Fetch rooms to map room IDs to room names
    let roomsMap = new Map<number, string>();
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
            roomsMap.set(room.id, room.name);
          }
        });
        console.log('Loaded rooms map:', Array.from(roomsMap.entries()));
      }
    } catch (error) {
      console.warn('Failed to fetch rooms:', error);
    }

    // Fetch allocations for all exams
    const examIds = examsArray.map((exam: any) => exam.id);
    let allocationsMap = new Map<number, any>();
    
    // Helper function to extract date and time from start_at
    const extractDateAndTime = (startAt: any): { date?: string; time?: string; jalaliDate?: string; jalaliTime?: string } => {
      if (!startAt) {
        console.log('extractDateAndTime: startAt is empty');
        return {};
      }
      
      try {
        console.log('extractDateAndTime: parsing startAt:', startAt, 'type:', typeof startAt);
        
        let isoString: string;
        let jalaliString: string | undefined;
        
        // Check if start_at is an object with iso/jalali
        if (typeof startAt === 'object' && startAt !== null && 'iso' in startAt) {
          isoString = startAt.iso;
          jalaliString = startAt.jalali;
          console.log('extractDateAndTime: found object format, iso:', isoString, 'jalali:', jalaliString);
        } else if (typeof startAt === 'string') {
          isoString = startAt;
          console.log('extractDateAndTime: found string format:', isoString);
        } else {
          console.log('extractDateAndTime: unknown format');
          return {};
        }
        
        // Parse ISO string to get date and time
        const dt = new Date(isoString);
        
        if (isNaN(dt.getTime())) {
          console.log('extractDateAndTime: invalid date');
          return {};
        }
        
        // Use UTC to avoid timezone issues - extract exactly what was stored
        // The ISO string is in UTC, so we extract UTC components directly
        const year = dt.getUTCFullYear();
        const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const day = String(dt.getUTCDate()).padStart(2, '0');
        const hours = String(dt.getUTCHours()).padStart(2, '0');
        const minutes = String(dt.getUTCMinutes()).padStart(2, '0');
        
        const date = `${year}-${month}-${day}`; // YYYY-MM-DD
        const time = `${hours}:${minutes}`; // HH:MM (UTC time, exactly as stored)
        
        console.log('UTC extraction:', {
          isoString,
          utcHours: hours,
          utcMinutes: minutes,
          extractedTime: time,
        });
        
        // Extract jalali date and time if available
        let jalaliDate: string | undefined;
        let jalaliTime: string | undefined;
        if (jalaliString) {
          // Format: "1403-07-16 11:30" -> extract date and time
          const parts = jalaliString.split(' ');
          if (parts.length >= 1) {
            jalaliDate = parts[0]; // "1403-07-16"
            // Convert to format "1403/07/16" if needed
            jalaliDate = jalaliDate.replace(/-/g, '/');
          }
          if (parts.length >= 2) {
            jalaliTime = parts[1]; // "11:30"
          }
        }
        
        console.log('extractDateAndTime: extracted date:', date, 'time:', time, 'jalaliDate:', jalaliDate, 'jalaliTime:', jalaliTime);
        
        return { date, time, jalaliDate, jalaliTime };
      } catch (e) {
        console.error('extractDateAndTime: error:', e);
        return {};
      }
    };

    // Fetch all allocations (with pagination support)
    try {
      console.log('Fetching all allocations from:', ALLOCATIONS_API);
      
      let allAllocations: any[] = [];
      let nextUrl: string | null = ALLOCATIONS_API;
      
      // Fetch all pages if paginated
      while (nextUrl) {
        const allocationResponse = await fetch(nextUrl, {
          headers: {
            'Authorization': authHeader,
          },
        });

        if (!allocationResponse.ok) {
          console.warn('Failed to fetch allocations, status:', allocationResponse.status);
          break;
        }

        const allocationData = await allocationResponse.json();
        console.log('Allocations response:', allocationData);
        const allocationsArray = Array.isArray(allocationData) ? allocationData : (allocationData.results || []);
        allAllocations = allAllocations.concat(allocationsArray);
        
        console.log(`Fetched ${allocationsArray.length} allocations from this page, total: ${allAllocations.length}`);
        
        // Check if there's a next page
        nextUrl = allocationData.next || null;
      }
      
      console.log(`Total allocations fetched: ${allAllocations.length}`);
      console.log('Looking for exam IDs:', examIds);
      
      // Filter allocations by exam IDs and extract date/time
      allAllocations.forEach((allocation: any) => {
        const allocationExamId = Number(allocation.exam);
        
        console.log(`Checking allocation:`, {
          id: allocation.id,
          exam: allocationExamId,
          start_at: allocation.start_at,
          start_at_type: typeof allocation.start_at,
        });
        
        if (examIds.includes(allocationExamId)) {
          // Extract date and time from start_at
          console.log(`Extracting date/time from start_at for exam ${allocationExamId}:`, allocation.start_at);
          const { date, time, jalaliDate, jalaliTime } = extractDateAndTime(allocation.start_at);
          console.log(`Extracted date: ${date}, time: ${time}, jalaliDate: ${jalaliDate}, jalaliTime: ${jalaliTime}`);
          
          const enrichedAllocation = {
            ...allocation,
            date,
            // Always use UTC time (time) to preserve the exact time entered by user
            // Don't use jalaliTime as it may be converted to local timezone
            time: time, // UTC time, exactly as stored
            jalaliDate,
          };
          
          // If multiple allocations exist for same exam, keep the first one
          if (!allocationsMap.has(allocationExamId)) {
            allocationsMap.set(allocationExamId, enrichedAllocation);
            console.log(`Found allocation for exam ${allocationExamId}:`, enrichedAllocation);
          }
        }
      });
      
      console.log(`Found allocations for ${allocationsMap.size} out of ${examIds.length} exams`);
    } catch (error) {
      console.error('Error fetching allocations:', error);
    }

    // Helper function to format date to Jalali
    const formatDateToJalali = (dateStr: string | undefined, jalaliDate?: string): string => {
      // If jalali date is already available, use it
      if (jalaliDate) {
        // Convert "1403-07-16" to "1403/07/16"
        return jalaliDate.replace(/-/g, '/');
      }
      
      if (!dateStr) return '';
      try {
        // If date is in ISO format (YYYY-MM-DD), convert to Jalali
        if (dateStr.includes('-') && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          const date = parseISO(dateStr);
          return formatJalali(date, 'yyyy/MM/dd');
        }
        // If already in Jalali format, return as is
        return dateStr;
      } catch (e) {
        return dateStr;
      }
    };

    // Helper function to format date (keep ISO for compatibility)
    const formatDate = (dateStr: string | undefined): string => {
      if (!dateStr) return '';
      return dateStr;
    };

    // Helper function to format time
    const formatTime = (timeStr: string | undefined): string => {
      if (!timeStr) return '';
      // If time is in HH:MM:SS format, return only HH:MM
      if (timeStr.includes(':') && timeStr.split(':').length > 2) {
        return timeStr.substring(0, 5);
      }
      return timeStr;
    };

    console.log('Allocations map before processing:', Array.from(allocationsMap.entries()));
    console.log('Total exams to process:', examsArray.length);
    
    // Prepare data for Excel
    const excelData = examsArray.map((exam: any) => {
      // Get allocation data for this exam
      const allocation = allocationsMap.get(exam.id);
      
      // Use date and time from allocation (already extracted from start_at)
      // or fallback to exam data
      const examDate = allocation?.date || exam.date;
      const examTime = allocation?.time || exam.time;
      const examJalaliDate = allocation?.jalaliDate;

      // Get room name from room ID
      let roomName = '';
      const roomId = allocation?.room || (exam.location ? Number(exam.location) : null);
      if (roomId) {
        roomName = roomsMap.get(roomId) || exam.location || '';
      } else if (exam.location) {
        // If location is already a name (string), use it directly
        roomName = exam.location;
      }

      // Log exam data for debugging
      console.log('Processing exam:', {
        id: exam.id,
        title: exam.title,
        hasAllocation: !!allocation,
        exam_location: exam.location,
        allocation_room: allocation?.room,
        roomId,
        roomName,
        exam_date: exam.date,
        exam_time: exam.time,
        allocation_start_at: allocation?.start_at,
        allocation_date: allocation?.date,
        allocation_time: allocation?.time,
        allocation_jalaliDate: allocation?.jalaliDate,
        final_date: examDate,
        final_time: examTime,
        final_jalaliDate: examJalaliDate,
      });

      const jalaliDate = formatDateToJalali(examDate, examJalaliDate);
      const formattedDate = formatDate(examDate);
      const formattedTime = formatTime(examTime);
      
      console.log('Formatted values:', {
        jalaliDate,
        formattedDate,
        formattedTime,
        roomName,
      });
      
      return {
        'عنوان': exam.title || '',
        'کد درس': exam.course_code || '',
        'تاریخ (میلادی)': formattedDate,
        'تاریخ (شمسی)': jalaliDate,
        'ساعت': formattedTime,
        'مدت (دقیقه)': exam.duration_minutes || '',
        'تعداد دانشجویان': exam.expected_students || '',
        'محل برگزاری': roomName,
      };
    });
    
    console.log('Final Excel data sample (first 3 rows):', excelData.slice(0, 3));

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'امتحانات');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return file as response
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="exams-${termId}-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در ایجاد فایل Excel' },
      { status: 500 }
    );
  }
}

