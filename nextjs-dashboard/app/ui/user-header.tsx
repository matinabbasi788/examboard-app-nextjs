'use client';

import { useAuth } from '@/app/lib/auth-context';
import { UserIcon } from '@heroicons/react/24/outline';

export function UserHeader() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="absolute right-4 top-4 flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <UserIcon className="h-5 w-5" />
        <span>{user.username}</span>
      </div>
      <button
        onClick={logout}
        className="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        Log out
      </button>
    </div>
  );
}