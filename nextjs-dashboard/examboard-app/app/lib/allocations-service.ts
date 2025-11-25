export interface DateTimeField {
  iso: string;
  jalali: string;
}

export interface Allocation {
  id: number;
  exam: number;
  room?: number;
  start_at?: string | DateTimeField; // Can be ISO string or object with iso/jalali
  end_at?: string | DateTimeField; // Can be ISO string or object with iso/jalali
  allocated_seats?: number;
  date?: string; // ISO date string (extracted from start_at)
  time?: string; // time in HH:MM format (extracted from start_at)
  jalaliDate?: string; // Jalali date string
  [key: string]: any;
}

export interface CreateAllocationPayload {
  exam: number;
  room?: number;
  start_at?: string; // ISO datetime string
  end_at?: string; // ISO datetime string
  allocated_seats?: number;
}

export interface UpdateAllocationPayload {
  room?: number;
  start_at?: string; // ISO datetime string
  end_at?: string; // ISO datetime string
  allocated_seats?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ALLOCATIONS_API = `${API_BASE_URL}/api/allocations/`;

export async function getAllocations(examId?: number): Promise<Allocation[]> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  const url = examId ? `${ALLOCATIONS_API}?exam=${examId}` : ALLOCATIONS_API;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch allocations');
  }

  const data = await res.json();
  
  // Handle possible response formats
  if (Array.isArray(data)) {
    return data;
  } else if (data.results && Array.isArray(data.results)) {
    return data.results;
  } else if (typeof data === 'object') {
    return Object.values(data);
  }
  
  throw new Error('Unexpected API response format');
}

// Extract date and time from start_at datetime
function extractDateAndTime(startAt: string | DateTimeField | undefined): { date?: string; time?: string; jalaliDate?: string; jalaliTime?: string } {
  if (!startAt) {
    console.log('extractDateAndTime: startAt is empty');
    return {};
  }
  
  try {
    console.log('extractDateAndTime: parsing startAt:', startAt);
    
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
}

// Get allocation for a specific exam by exam ID
export async function getAllocationByExamId(examId: number): Promise<Allocation | null> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  try {
    // First try: Fetch allocation using exam ID as query parameter
    let res = await fetch(`${ALLOCATIONS_API}?exam=${examId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`Response for exam ${examId} via query:`, data);
      const allocationsArray = Array.isArray(data) ? data : (data.results || []);
      console.log(`Allocations array length: ${allocationsArray.length}`);
      
      if (allocationsArray.length > 0) {
        const allocation = allocationsArray[0];
        console.log(`First allocation for exam ${examId}:`, allocation);
        console.log(`Allocation exam field: ${allocation.exam}, type: ${typeof allocation.exam}`);
        console.log(`Looking for examId: ${examId}, type: ${typeof examId}`);
        
        // Verify this allocation belongs to the exam
        const examMatches = allocation.exam === examId || 
                           allocation.exam === String(examId) || 
                           Number(allocation.exam) === examId;
        
        console.log(`Exam matches: ${examMatches}`);
        
        if (examMatches) {
          // Extract date and time from start_at
          console.log(`Extracting date/time from start_at: ${allocation.start_at}`);
          const { date, time } = extractDateAndTime(allocation.start_at);
          console.log(`Extracted date: ${date}, time: ${time}`);
          
          const enrichedAllocation = {
            ...allocation,
            date,
            time,
          };
          
          console.log(`Found allocation for exam ${examId} via query:`, enrichedAllocation);
          return enrichedAllocation;
        } else {
          console.warn(`Allocation exam field (${allocation.exam}) does not match examId (${examId})`);
        }
      } else {
        console.warn(`No allocations found in array for exam ${examId}`);
      }
    } else {
      console.warn(`Failed to fetch allocation for exam ${examId}, status: ${res.status}`);
    }

    // Second try: Fetch allocation directly by ID (assuming allocation ID might equal exam ID)
    res = await fetch(`${ALLOCATIONS_API}${examId}/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const allocation = await res.json();
      console.log(`Response for exam ${examId} via direct ID:`, allocation);
      console.log(`Allocation exam field: ${allocation.exam}, type: ${typeof allocation.exam}`);
      
      // Verify this allocation belongs to the exam
      const examMatches = allocation.exam === examId || 
                         allocation.exam === String(examId) || 
                         Number(allocation.exam) === examId;
      
      console.log(`Exam matches: ${examMatches}`);
      
      if (examMatches) {
        // Extract date and time from start_at
        console.log(`Extracting date/time from start_at: ${allocation.start_at}`);
        const { date, time } = extractDateAndTime(allocation.start_at);
        console.log(`Extracted date: ${date}, time: ${time}`);
        
        const enrichedAllocation = {
          ...allocation,
          date,
          time,
        };
        
        console.log(`Found allocation for exam ${examId} via direct ID:`, enrichedAllocation);
        return enrichedAllocation;
      } else {
        console.warn(`Allocation exam field (${allocation.exam}) does not match examId (${examId})`);
      }
    } else {
      console.warn(`Failed to fetch allocation for exam ${examId} via direct ID, status: ${res.status}`);
    }

    console.warn(`No allocation found for exam ${examId}`);
    return null;
  } catch (error) {
    console.error(`Error fetching allocation for exam ${examId}:`, error);
    return null;
  }
}

// Get allocations for multiple exams by fetching all and filtering
export async function getAllocationsForExams(examIds: number[]): Promise<Map<number, Allocation>> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  const allocationMap = new Map<number, Allocation>();
  
  try {
    console.log('=== getAllocationsForExams called ===');
    console.log('Exam IDs to find:', examIds);
    console.log('Token exists:', !!token);
    
    // Fetch all allocations (with pagination support)
    let allAllocations: any[] = [];
    let nextUrl: string | null = ALLOCATIONS_API;
    
    console.log('Fetching all allocations from:', ALLOCATIONS_API);
    
    // Fetch all pages if paginated
    while (nextUrl) {
      console.log('Fetching from URL:', nextUrl);
      const res: Response = await fetch(nextUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response status:', res.status, res.statusText);

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unable to read error');
        console.error('Failed to fetch allocations, status:', res.status, 'Error:', errorText);
        break;
      }

      const data: any = await res.json();
      console.log('Allocations response structure:', {
        isArray: Array.isArray(data),
        hasResults: !!data.results,
        resultsLength: data.results?.length,
        hasNext: !!data.next,
        count: data.count,
        fullData: data,
      });
      const allocationsArray = Array.isArray(data) ? data : (data.results || []);
      console.log(`Parsed ${allocationsArray.length} allocations from this page`);
      allAllocations = allAllocations.concat(allocationsArray);
      
      console.log(`Fetched ${allocationsArray.length} allocations from this page, total: ${allAllocations.length}`);
      
      // Check if there's a next page
      nextUrl = data.next || null;
      console.log('Next URL:', nextUrl);
    }
    
    console.log(`=== Total allocations fetched: ${allAllocations.length} ===`);
    console.log('Looking for exam IDs:', examIds);
    
    if (allAllocations.length === 0) {
      console.warn('⚠⚠⚠ No allocations found at all! This might mean:');
      console.warn('1. Allocations were never created');
      console.warn('2. API endpoint is wrong');
      console.warn('3. Authentication failed');
      console.warn('4. API returned empty results');
    }
    
    // Filter allocations by exam IDs and extract date/time
    console.log(`=== Processing ${allAllocations.length} allocations ===`);
    allAllocations.forEach((allocation: any, index: number) => {
      // Try multiple ways to match exam ID (handle string/number mismatch)
      const allocationExamIdNum = Number(allocation.exam);
      const allocationExamIdStr = String(allocation.exam);
      
      // Check if this allocation matches any of the exam IDs (handle both string and number)
      const examIdMatches = examIds.some(examId => 
        examId === allocationExamIdNum || 
        examId === Number(allocationExamIdStr) ||
        String(examId) === allocationExamIdStr ||
        Number(examId) === allocationExamIdNum
      );
      
      if (index < 5 || examIdMatches) { // Log first 5 or any matches
        console.log(`Checking allocation ${index + 1}/${allAllocations.length}:`, {
          allocationId: allocation.id,
          allocationExamRaw: allocation.exam,
          allocationExamIdNum: allocationExamIdNum,
          allocationExamIdStr: allocationExamIdStr,
          allocationExamIdType: typeof allocation.exam,
          examIds: examIds,
          examIdsTypes: examIds.map(id => typeof id),
          examIdMatches: examIdMatches,
          start_at: allocation.start_at,
          start_at_type: typeof allocation.start_at,
        });
      }
      
      if (examIdMatches) {
        // Use the numeric exam ID for the map key
        const mapKey = allocationExamIdNum;
        // Extract date and time from start_at
        const { date, time, jalaliDate, jalaliTime } = extractDateAndTime(allocation.start_at);
        const enrichedAllocation = {
          ...allocation,
          date,
          // Always use UTC time (time) to preserve the exact time entered by user
          // Don't use jalaliTime as it may be converted to local timezone
          time: time, // UTC time, exactly as stored
          jalaliDate,
        };
        
        // If multiple allocations exist for same exam, keep the first one
        if (!allocationMap.has(mapKey)) {
          allocationMap.set(mapKey, enrichedAllocation);
          console.log(`✓✓✓ Found allocation for exam ${mapKey}:`, enrichedAllocation);
        } else {
          console.log(`⚠⚠⚠ Skipping duplicate allocation for exam ${mapKey}`);
        }
      } else {
        console.log(`✗✗✗ Allocation exam ID ${allocationExamIdNum} (${allocationExamIdStr}) not in examIds list ${examIds.join(', ')}`);
      }
    });
    
    console.log('=== Final allocation map ===');
    console.log('Map size:', allocationMap.size);
    console.log('Map keys:', Array.from(allocationMap.keys()));
    console.log('Map entries:', Array.from(allocationMap.entries()));
    console.log(`Found allocations for ${allocationMap.size} out of ${examIds.length} exams`);
    
    if (allocationMap.size === 0 && allAllocations.length > 0) {
      console.warn('⚠⚠⚠ WARNING: Allocations exist but none matched the exam IDs!');
      console.warn('This might mean:');
      console.warn('1. Exam IDs in allocations do not match exam IDs in exams');
      console.warn('2. Type mismatch (string vs number)');
      console.warn('3. Exam IDs are different');
      console.warn('Sample allocation exam IDs:', allAllocations.slice(0, 5).map(a => ({ id: a.id, exam: a.exam, examType: typeof a.exam })));
    }
    
    return allocationMap;
  } catch (error) {
    console.error('Error fetching allocations:', error);
    return new Map();
  }
}

// Create a new allocation
export async function createAllocation(payload: CreateAllocationPayload): Promise<Allocation> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  console.log('Creating allocation with payload:', payload);

  const res = await fetch(ALLOCATIONS_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log('Allocation creation response:', data);

  if (!res.ok) {
    if (data.detail) {
      throw new Error(data.detail);
    }
    if (typeof data === 'object') {
      const errors = Object.entries(data)
        .map(([field, messages]) => `${field}: ${messages}`)
        .join('\n');
      if (errors) {
        throw new Error(errors);
      }
    }
    throw new Error('خطا در ایجاد allocation');
  }

  return data;
}

// Update an existing allocation
export async function updateAllocation(allocationId: number, payload: UpdateAllocationPayload): Promise<Allocation> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  console.log('Updating allocation', allocationId, 'with payload:', payload);

  const res = await fetch(`${ALLOCATIONS_API}${allocationId}/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log('Allocation update response:', data);

  if (!res.ok) {
    if (data.detail) {
      throw new Error(data.detail);
    }
    if (typeof data === 'object') {
      const errors = Object.entries(data)
        .map(([field, messages]) => `${field}: ${messages}`)
        .join('\n');
      if (errors) {
        throw new Error(errors);
      }
    }
    throw new Error('خطا در به‌روزرسانی allocation');
  }

  return data;
}

