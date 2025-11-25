'use client';

import { useState, useEffect } from 'react';
import { Room, getRooms, createRoom, deleteRoom, CreateRoomPayload } from '@/app/lib/rooms-service';
import { PlusIcon, XMarkIcon, HomeIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/ui/button';
import { useAuth } from '@/app/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function RoomsList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('');
  const [newRoomFeatures, setNewRoomFeatures] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Fetch rooms on component mount
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadRooms();
  }, [user, router]);

  async function loadRooms() {
    try {
      setError(null);
      const data = await getRooms();
      
      // Debug the API response
      console.log('API Response:', data);
      
      if (!Array.isArray(data)) {
        console.error('Expected array, got:', typeof data, data);
        setError('Invalid data format received');
        setRooms([]);
        return;
      }
      
      setRooms(data);
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
      setRooms([]); // Ensure rooms is always an array
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate required fields
    const errors: string[] = [];
    if (!newRoomName.trim()) {
      errors.push('نام مکان الزامی است');
    }
    if (!newRoomCapacity || parseInt(newRoomCapacity) <= 0) {
      errors.push('ظرفیت الزامی است و باید بیشتر از صفر باشد');
    }
    
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const payload: CreateRoomPayload = {
        name: newRoomName.trim(),
        capacity: parseInt(newRoomCapacity),
        features: newRoomFeatures.trim() || undefined,
      };

      const newRoom = await createRoom(payload);
      setRooms(prev => [...prev, newRoom]);
      setNewRoomName('');
      setNewRoomCapacity('');
      setNewRoomFeatures('');
    } catch (err: any) {
      // Show backend error message if available
      const errorMessage = err.message || 
                         (err.response?.data?.detail) || 
                         (err.response?.data?.message) ||
                         'Failed to add room';
      setError(errorMessage);
      console.error('Add room error:', err);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('آیا از حذف این مکان اطمینان دارید؟')) return;

    setError(null);
    try {
      await deleteRoom(id);
      setRooms(prev => prev.filter(room => room.id !== id));
    } catch (err) {
      setError('حذف مکان با خطا مواجه شد');
      console.error(err);
    }
  }

  if (loading) {
    return <div className="text-center py-4" dir="rtl">در حال بارگذاری مکان‌ها...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4" dir="rtl">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <HomeIcon className="h-5 w-5" />
          <span>بازگشت به صفحه اصلی</span>
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="نام مکان (مثلاً: سالن ۱۰۱)"
            className="col-span-1 md:col-span-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-750 text-gray-900 dark:text-white py-2 px-4"
            disabled={adding}
            required
          />

          <input
            type="number"
            value={newRoomCapacity}
            onChange={(e) => setNewRoomCapacity(e.target.value)}
            placeholder="ظرفیت"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-750 text-gray-900 dark:text-white py-2 px-4"
            disabled={adding}
            min="1"
            required
          />

          <input
            type="text"
            value={newRoomFeatures}
            onChange={(e) => setNewRoomFeatures(e.target.value)}
            placeholder="ویژگی‌ها (اختیاری)"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-750 text-gray-900 dark:text-white py-2 px-4"
            disabled={adding}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={adding || !newRoomName.trim() || !newRoomCapacity || parseInt(newRoomCapacity) <= 0}>
            {adding ? 'در حال افزودن...' : (
              <>
                <PlusIcon className="h-5 w-5 ml-1" />
                افزودن مکان
              </>
            )}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800/50">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {rooms.map(room => (
          <div
            key={room.id}
            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-gray-900 dark:text-white">{room.name}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">ظرفیت: {room.capacity}</span>
              {room.features && (
                <span className="text-sm text-gray-500">
                  ویژگی‌ها: {typeof room.features === 'string' 
                    ? room.features 
                    : JSON.stringify(room.features)}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(room.id)}
                className="p-1 hover:bg-gray-100 rounded"
                title="حذف مکان"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500 hover:text-red-600" />
              </button>
            </div>
          </div>
        ))}

        {rooms.length === 0 && !error && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
            هنوز مکانی اضافه نشده است. اولین مکان را در بالا اضافه کنید.
          </p>
        )}
      </div>
    </div>
  );
}

