// Types for our terms data
// Types for our terms data
export interface DateField {
  iso: string;
  jalali?: string;
}

export interface Term {
  id: number;
  name: string;
  code?: string;
  start_date?: DateField;
  end_date?: DateField;
  is_published?: boolean;
  is_archived?: boolean;
  [key: string]: any;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TERMS_API = `${API_BASE_URL}/api/terms/`;

export async function getTerms(): Promise<Term[]> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  const res = await fetch(TERMS_API, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch terms');
  }

  const data = await res.json();
  
  // Handle possible response formats
  if (Array.isArray(data)) {
    return data;
  } else if (data.results && Array.isArray(data.results)) {
    // Handle DRF paginated response
    return data.results;
  } else if (typeof data === 'object') {
    // If it's an object with terms data
    return Object.values(data);
  }
  
  throw new Error('Unexpected API response format');
}

export async function toggleTermArchive(termId: number, archived: boolean): Promise<void> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  const res = await fetch(`${TERMS_API}${termId}/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      is_archived: archived
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to update term archive status');
  }
}

export interface CreateTermPayload {
  name: string;
  code?: string;
  start_date?: string;    // Format: "YYYY-MM-DD"
  end_date?: string;      // Format: "YYYY-MM-DD"
  is_published?: boolean;
  is_archived?: boolean;
}

export async function createTerm(payload: CreateTermPayload): Promise<Term> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  const res = await fetch(TERMS_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create term: ${res.status} ${text}`);
  }

  return res.json();
}

export async function deleteTerm(id: number): Promise<void> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  const res = await fetch(`${TERMS_API}${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to delete term');
  }
}