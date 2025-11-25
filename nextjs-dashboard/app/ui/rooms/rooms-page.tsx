'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Room,
  RoomCategory,
  getRooms,
  createRoom,
  deleteRoom,
  type CreateRoomPayload,
  getRoomCategories,
  createRoomCategory,
  deleteRoomCategory,
  updateRoomCategory,
} from '@/app/lib/rooms-service';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/ui/button';
import Link from 'next/link';
import { HomeIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/app/ui/loading-spinner';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<RoomCategory['id'] | null>(null);
  const [categoryUpdating, setCategoryUpdating] = useState<Record<number, boolean>>({});

  // Form states
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');

  // Load rooms on mount
  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    try {
      setLoading(true);
      setError(null);
      const [roomsData, categoriesData] = await Promise.all([getRooms(), getRoomCategories()]);
      setRooms(roomsData);
      setCategories(categoriesData);
    } catch (err: any) {
      console.error('Error loading rooms data:', err);
      setError('خطا در بارگذاری لیست مکان‌ها و دسته‌بندی‌ها: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshRooms() {
    try {
      const data = await getRooms();
      setRooms(data);
    } catch (err: any) {
      console.error('Error reloading rooms:', err);
      setError('خطا در بروزرسانی لیست مکان‌ها: ' + err.message);
    }
  }


  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault();
    const errors: string[] = [];
    if (!newRoomName.trim()) {
      errors.push('لطفاً نام مکان را وارد کنید');
    }
    if (!newRoomCapacity.trim() || isNaN(parseInt(newRoomCapacity)) || parseInt(newRoomCapacity) <= 0) {
      errors.push('ظرفیت معتبر وارد کنید');
    }

    if (errors.length > 0) {
      setError(errors.join(' | '));
      return;
    }

    try {
      setAdding(true);
      setError(null);

      const payload: CreateRoomPayload = {
        name: newRoomName.trim(),
        capacity: parseInt(newRoomCapacity),
        features: newRoomDescription.trim() || undefined,
      };

      await createRoom(payload);

      // Reset form
      setNewRoomName('');
      setNewRoomCapacity('');
      setNewRoomDescription('');

      // Refresh rooms list
      await refreshRooms();
    } catch (err: any) {
      console.error('Error adding room:', err);
      setError('خطا در اضافه کردن مکان: ' + err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteRoom(roomId: number) {
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید این مکان را حذف کنید؟')) {
      return;
    }

    try {
      await deleteRoom(roomId);

      await refreshRooms();
    } catch (err: any) {
      console.error('Error deleting room:', err);
      setError('خطا در حذف مکان: ' + err.message);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) {
      setError('نام دسته‌بندی را وارد کنید');
      return;
    }
    try {
      setCreatingCategory(true);
      setError(null);
      const created = await createRoomCategory(name);
      setCategories((prev) => [...prev, created]);
      setNewCategoryName('');
    } catch (err: any) {
      console.error('Error creating category:', err);
      setError('خطا در ایجاد دسته‌بندی: ' + err.message);
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleDeleteCategory(categoryId: RoomCategory['id']) {
    if (!window.confirm('این دسته حذف شود؟')) {
      return;
    }
    try {
      setDeletingCategoryId(categoryId);
      setError(null);
      await deleteRoomCategory(categoryId);
      setCategories((prev) => prev.filter((cat) => String(cat.id) !== String(categoryId)));
      setRooms((prev) =>
        prev.map((room) => {
          const currentId = resolveRoomCategoryId(room);
          if (currentId !== null && String(currentId) === String(categoryId)) {
            return { ...room, category: null, category_id: null, category_name: null };
          }
          return room;
        }),
      );
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setError('خطا در حذف دسته‌بندی: ' + err.message);
    } finally {
      setDeletingCategoryId(null);
    }
  }

  async function handleAssignCategory(roomId: number, selectedValue: string) {
    const normalizedId =
      selectedValue === ''
        ? null
        : categories.find((cat) => String(cat.id) === selectedValue)?.id ?? selectedValue;

    setCategoryUpdating((prev) => ({ ...prev, [roomId]: true }));
    try {
      setError(null);
      const updatedRoom = await updateRoomCategory(roomId, normalizedId);
      setRooms((prev) => prev.map((room) => (room.id === roomId ? updatedRoom : room)));
    } catch (err: any) {
      console.error('Error updating room category:', err);
      setError('خطا در به‌روزرسانی دسته مکان: ' + err.message);
    } finally {
      setCategoryUpdating((prev) => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
    }
  }

  const resolveRoomCategoryId = (room: Room): RoomCategory['id'] | null => {
    const categoryValue = room.category;
    if (categoryValue && typeof categoryValue === 'object') {
      if ('id' in categoryValue) {
        return (categoryValue as RoomCategory).id;
      }
    } else if (categoryValue !== undefined && categoryValue !== null) {
      return categoryValue as RoomCategory['id'];
    }
    if (room.category_id !== undefined && room.category_id !== null) {
      return room.category_id as RoomCategory['id'];
    }
    return null;
  };

  const resolveRoomCategoryName = (room: Room): string | null => {
    const categoryValue = room.category;
    if (categoryValue && typeof categoryValue === 'object' && 'name' in categoryValue) {
      return (categoryValue as RoomCategory).name ?? null;
    }
    const categoryId = resolveRoomCategoryId(room);
    if (categoryId !== null) {
      const match = categories.find((cat) => String(cat.id) === String(categoryId));
      if (match) {
        return match.name;
      }
    }
    if (typeof room.category_name === 'string') {
      return room.category_name;
    }
    return null;
  };

  const groupedRooms = useMemo(() => {
    const groups = categories.map((category) => ({
      category,
      rooms: rooms.filter((room) => {
        const roomCategoryId = resolveRoomCategoryId(room);
        return roomCategoryId !== null && String(roomCategoryId) === String(category.id);
      }),
    }));
    const uncategorized = rooms.filter((room) => resolveRoomCategoryId(room) === null);
    return { groups, uncategorized };
  }, [rooms, categories]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 min-h-screen bg-white dark:bg-gray-900" dir='rtl'>
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          <HomeIcon className="h-5 w-5" />
          <span>بازگشت به صفحه اصلی</span>
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">مدیریت مکان‌ها</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <section className="mb-8 space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">مدیریت دسته‌بندی‌ها</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {categories.length} دسته ثبت شده
          </span>
        </div>
        <form onSubmit={handleAddCategory} className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="نام دسته (مثلاً: دانشکده کامپیوتر)"
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
          />
          <Button type="submit" disabled={creatingCategory || !newCategoryName.trim()}>
            اضافه کردن دسته
          </Button>
        </form>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            هنوز دسته‌ای تعریف نشده است. برای شروع یک نام وارد کنید.
          </p>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => {
              const count = rooms.filter(
                (room) =>
                  resolveRoomCategoryId(room) !== null &&
                  String(resolveRoomCategoryId(room)) === String(category.id),
              ).length;
              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{category.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {count} مکان در این دسته
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-sm text-red-600 hover:text-red-500 dark:text-red-400 disabled:opacity-60"
                    disabled={deletingCategoryId !== null && String(deletingCategoryId) === String(category.id)}
                  >
                    حذف
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <form onSubmit={handleAddRoom} className="mb-8 space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">اضافه کردن مکان جدید</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="نام مکان"
            className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
            disabled={adding}
            required
          />

          <input
            type="number"
            value={newRoomCapacity}
            onChange={(e) => setNewRoomCapacity(e.target.value)}
            placeholder="ظرفیت"
            className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
            disabled={adding}
            min="0"
          />

          <input
            type="text"
            value={newRoomDescription}
            onChange={(e) => setNewRoomDescription(e.target.value)}
            placeholder="توضیحات (اختیاری)"
            className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4"
            disabled={adding}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={adding || !newRoomName.trim()}>
            {adding ? 'در حال اضافه کردن...' : (
              <>
                <PlusIcon className="h-5 w-5 mr-1" />
                اضافه کردن مکان
              </>
            )}
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">لیست مکان‌ها</h2>
        {rooms.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            هیچ مکانی ثبت نشده است.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rooms.map(room => {
              const roomCategoryId = resolveRoomCategoryId(room);
              const roomCategoryName = resolveRoomCategoryName(room);
              return (
                <div
                  key={room.id}
                  className="flex items-start justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{room.name}</h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1 mt-2">
                        {room.capacity && <div>ظرفیت: {room.capacity} نفر</div>}
                        {(() => {
                          const detail =
                            typeof room.description === 'string' && room.description.trim()
                              ? room.description
                              : typeof room.features === 'string'
                                ? room.features
                                : null;
                          if (!detail) return null;
                          return <div className="text-gray-600 dark:text-gray-300">{detail}</div>;
                        })()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium">دسته فعلی:</span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                          {roomCategoryName || 'بدون دسته'}
                        </span>
                      </div>
                      <select
                        value={roomCategoryId !== null ? String(roomCategoryId) : ''}
                        onChange={(e) => handleAssignCategory(room.id, e.target.value)}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-8 disabled:opacity-60"
                        disabled={!!categoryUpdating[room.id]}
                      >
                        <option value="">بدون دسته</option>
                        {categories.map((category) => (
                          <option key={category.id} value={String(category.id)}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRoom(room.id)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ml-4 flex-shrink-0"
                    title="حذف مکان"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-10 space-y-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">نمای کلی دسته‌بندی‌ها</h2>
        {groupedRooms.groups.length === 0 && groupedRooms.uncategorized.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">داده‌ای برای نمایش وجود ندارد.</p>
        ) : (
          <>
            {groupedRooms.groups.map(({ category, rooms: categoryRooms }) => (
              <div key={category.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{category.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{categoryRooms.length} مکان</p>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-sm text-red-600 hover:text-red-500 dark:text-red-400 disabled:opacity-60"
                    disabled={deletingCategoryId !== null && String(deletingCategoryId) === String(category.id)}
                  >
                    حذف دسته
                  </button>
                </div>
                {categoryRooms.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-4 py-3">مکانی در این دسته ثبت نشده است.</p>
                ) : (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {categoryRooms.map((room) => (
                      <li key={room.id} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 flex items-center justify-between">
                        <span>{room.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">ظرفیت: {room.capacity ?? 'نامشخص'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {groupedRooms.uncategorized.length > 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-4 py-3">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">مکان‌های بدون دسته</h3>
                <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-300">
                  {groupedRooms.uncategorized.map((room) => (
                    <span key={room.id} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                      {room.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}