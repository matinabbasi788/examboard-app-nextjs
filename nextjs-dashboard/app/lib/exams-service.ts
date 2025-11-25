// Types for exam data
import { Term } from './terms-service';

export interface Exam {
  id: number;
  title: string;
  course_code?: string;
  owner?: number;
  expected_students?: number;
  duration_minutes?: number;
  term: number;
  date?: string; // ISO date string (may come from allocations)
  time?: string; // time in HH:MM format (may come from allocations)
  location?: string;
  [key: string]: any;
}

export interface CreateExamPayload {
  title: string;
  course_code?: string;
  owner?: number;
  expected_students?: number;
  duration_minutes?: number;
  term: number;
  date?: string;
  time?: string;
  location?: string;
}

const EXAMS_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const EXAMS_API_ENDPOINT = `${EXAMS_API}/api/exams/`;

// Mock data for testing
const MOCK_EXAMS: Exam[] = [
  {
    id: 1,
    title: 'ریاضی عمومی ۱',
    course_code: 'MATH101',
    term: 1,
    expected_students: 95,
    duration_minutes: 120,
  },
  {
    id: 2,
    title: 'فیزیک پایه',
    course_code: 'PHYS101',
    term: 1,
    expected_students: 150,
    duration_minutes: 120,
  },
  {
    id: 3,
    title: 'شیمی عمومی',
    course_code: 'CHEM101',
    term: 1,
    expected_students: 40,
    duration_minutes: 120,
  },
  {
    id: 4,
    title: 'انگلیسی عمومی',
    course_code: 'ENG101',
    term: 1,
    expected_students: 20,
    duration_minutes: 120,
  },
];

export async function getExams(termId?: number): Promise<Exam[]> {
  const token = localStorage.getItem('accessToken');
  
  // Filter mock data by term if needed
  let mockData = MOCK_EXAMS;
  if (termId) {
    mockData = MOCK_EXAMS.filter(e => e.term === termId);
  }
  
  if (!token) {
    console.warn('No access token - using mock exams data');
    return mockData;
  }

  try {
    let allExams: Exam[] = [];
    let nextUrl: string | null = termId ? `${EXAMS_API_ENDPOINT}?term=${termId}` : EXAMS_API_ENDPOINT;

    // Fetch all pages if paginated
    while (nextUrl) {
      const res: Response = await fetch(nextUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.warn(`Failed to fetch exams (${res.status}) - using mock data`);
        return mockData;
      }

      const data: any = await res.json();
      
      // Handle possible response formats
      let examsArray: Exam[] = [];
      if (Array.isArray(data)) {
        examsArray = data;
        nextUrl = null; // No pagination for array responses
      } else if (data.results && Array.isArray(data.results)) {
        examsArray = data.results;
        nextUrl = data.next || null; // Check for next page
      } else if (typeof data === 'object') {
        examsArray = Object.values(data);
        nextUrl = null;
      } else {
        console.warn('Unexpected API response format - using mock data');
        return mockData;
      }
      
      allExams = allExams.concat(examsArray);
      
      // If no next page, break
      if (!nextUrl) {
        break;
      }
    }

    return allExams;
  } catch (error) {
    console.error('Error fetching exams:', error);
    return mockData;
  }
}

export async function createExam(payload: CreateExamPayload): Promise<Exam> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  console.log('Sending exam payload:', payload);

  const res = await fetch(EXAMS_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log('Server response:', data);

  if (!res.ok) {
    // اگر سرور خطای جزئیات داشت
    if (data.detail) {
      throw new Error(data.detail);
    }
    // اگر سرور ارور‌های ولیدیشن برگردوند
    if (typeof data === 'object') {
      const errors = Object.entries(data)
        .map(([field, messages]) => `${field}: ${messages}`)
        .join('\n');
      if (errors) {
        throw new Error(errors);
      }
    }
    throw new Error('خطا در ثبت امتحان');
  }

  return data;
}

export async function deleteExam(id: number): Promise<void> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  const res = await fetch(`${EXAMS_API_ENDPOINT}${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to delete exam');
  }
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  warnings?: number;
  exams: Exam[];
  errors: Array<{ exam: string; error: string }>;
}

export async function importExamsFromExcel(file: File, termId: number): Promise<ImportResult> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('termId', termId.toString());

  const res = await fetch('/api/exams/import', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'خطا در وارد کردن فایل Excel' }));
    throw new Error(error.error || 'خطا در وارد کردن فایل Excel');
  }

  return res.json();
}

export async function exportExamsToExcel(termId: number): Promise<Blob> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  const res = await fetch(`/api/exams/export?termId=${termId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'خطا در خروجی گرفتن فایل Excel' }));
    throw new Error(error.error || 'خطا در خروجی گرفتن فایل Excel');
  }

  return res.blob();
}