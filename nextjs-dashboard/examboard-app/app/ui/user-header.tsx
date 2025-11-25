'use client';

import { useAuth } from '@/app/lib/auth-context';
import { UserIcon } from '@heroicons/react/24/outline';

export function UserHeader() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed right-4 top-4 flex items-center gap-6 z-40">
      <div className="flex items-center gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-500">خوش آمدید</p>
          <p className="font-semibold text-gray-900 dark:text-white">{user.username}</p>
        </div>
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
          <UserIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </div>
      </div>
      <button
        onClick={logout}
        className="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
      >
        Log out
      </button>
    </div>
  );
}