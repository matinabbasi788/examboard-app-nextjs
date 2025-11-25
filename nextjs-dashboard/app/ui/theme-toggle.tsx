'use client';

import { useTheme } from '@/app/lib/theme-provider';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';

export function ThemeToggle() {
  const { isDark, toggleTheme, mounted } = useTheme();

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 left-4 z-[9999] rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
      title={isDark ? 'روشن' : 'تاریک'}
      aria-label="تبدیل تم"
    >
      {isDark ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
}