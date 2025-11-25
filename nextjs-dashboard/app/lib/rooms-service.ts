export interface RoomCategory {
  id: number | string;
  name: string;
  description?: string;
  color?: string;
  [key: string]: any;
}

export interface Room {
  id: number;
  name: string;
  capacity: number;
  features?: string | object;
  category?: RoomCategory | number | string | null;
  category_id?: number | string | null;
  category_name?: string | null;
  [key: string]: any;
}

export interface CreateRoomPayload {
  name: string;
  capacity: number;
  features?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ROOMS_API = `${API_BASE_URL}/api/rooms/`;
const ROOM_CATEGORIES_API = `${API_BASE_URL}/api/room-categories/`;

// Mock data for testing
const MOCK_ROOMS: Room[] = [
  {
    id: 1,
    name: 'سالن الف',
    capacity: 120,
  },
  {
    id: 2,
    name: 'سالن ب',
    capacity: 100,
  },
  {
    id: 3,
    name: 'سالن ج',
    capacity: 80,
  },
  {
    id: 4,
    name: 'سالن د',
    capacity: 100,
  },
  {
    id: 5,
    name: 'سالن ه',
    capacity: 50,
  },
];

function getTokenOrThrow() {
  const token = localStorage.getItem('accessToken');
  return token || null; // Return null instead of throwing
}

export async function getRooms(): Promise<Room[]> {
  const token = getTokenOrThrow();

  if (!token) {
    console.warn('No access token - using mock rooms data');
    return MOCK_ROOMS;
  }

  try {
    const res = await fetch(ROOMS_API, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.warn(`Failed to fetch rooms (${res.status}) - using mock data`);
      return MOCK_ROOMS;
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
    
    console.warn('Unexpected API response format - using mock data');
    return MOCK_ROOMS;
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return MOCK_ROOMS;
  }
}

export async function createRoom(payload: CreateRoomPayload): Promise<Room> {
  const token = getTokenOrThrow();

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
  const token = getTokenOrThrow();

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

export async function getRoomCategories(): Promise<RoomCategory[]> {
  const token = getTokenOrThrow();

  const res = await fetch(ROOM_CATEGORIES_API, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch room categories');
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  } else if (data.results && Array.isArray(data.results)) {
    return data.results;
  } else if (typeof data === 'object') {
    return Object.values(data);
  }

  throw new Error('Unexpected categories response format');
}

export async function createRoomCategory(name: string): Promise<RoomCategory> {
  const token = getTokenOrThrow();

  const res = await fetch(ROOM_CATEGORIES_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create category: ${res.status} ${text}`);
  }

  return res.json();
}

export async function deleteRoomCategory(id: number | string): Promise<void> {
  const token = getTokenOrThrow();

  const res = await fetch(`${ROOM_CATEGORIES_API}${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to delete category');
  }
}

export async function updateRoomCategory(
  roomId: number,
  categoryId: number | string | null,
): Promise<Room> {
  const token = getTokenOrThrow();

  const res = await fetch(`${ROOMS_API}${roomId}/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category: categoryId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update room category: ${res.status} ${text}`);
  }

  return res.json();
}