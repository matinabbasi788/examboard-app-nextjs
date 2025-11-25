import { RoomsList } from '@/app/ui/rooms/rooms-list';

export default function RoomsPage() {
  return (
    <main className="min-h-screen p-4 md:p-6 bg-white dark:bg-gray-900">
      <div className="py-4 md:py-6">
        <h1 dir="rtl" className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">مدیریت مکان‌ها</h1>
        <RoomsList />
      </div>
    </main>
  );
}

