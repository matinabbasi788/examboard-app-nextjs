export interface Room {
  id: number;
  name: string;
  capacity: number;
  features?: string | object;
  [key: string]: any;
}

export interface CreateRoomPayload {
  name: string;
  capacity: number;
  features?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ROOMS_API = `${API_BASE_URL}/api/rooms/`;

export async function getRooms(): Promise<Room[]> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  const res = await fetch(ROOMS_API, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch rooms');
  }

  const data = await res.json();
  
  // Handle possible response formats
  if (Array.isArray(data)) {
    return data;
  } else if (data.results && Array.isArray(data.results)) {
    // Handle DRF paginated response
    return data.results;
  } else if (typeof data === 'object') {
    // If it's an object with rooms data
    return Object.values(data);
  }
  
  throw new Error('Unexpected API response format');
}

export async function createRoom(payload: CreateRoomPayload): Promise<Room> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  const res = await fetch(ROOMS_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create room: ${res.status} ${text}`);
  }

  return res.json();
}

export async function deleteRoom(id: number): Promise<void> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No access token');

  const res = await fetch(`${ROOMS_API}${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to delete room');
  }
}