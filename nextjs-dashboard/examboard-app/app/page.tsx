'use client';

import { useAuth } from '@/app/lib/auth-context';
import Link from 'next/link';
import { 
  AcademicCapIcon, 
  CalendarIcon, 
  BuildingOfficeIcon,
  DocumentArrowUpIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

export default function Page() {
  const { user } = useAuth();

  const services = [
    {
      name: 'مدیریت امتحانات',
      href: '/exams',
      icon: AcademicCapIcon,
      description: 'ثبت، ویرایش و حذف امتحانات'
    },
    {
      name: 'وارد/صادر کردن امتحانات',
      href: '/exams/import-export',
      icon: DocumentArrowUpIcon,
      description: 'وارد کردن و صادر کردن امتحانات از/به فایل Excel'
    },
    {
      name: 'مدیریت ترم‌ها',
      href: '/terms',
      icon: CalendarIcon,
      description: 'مدیریت ترم‌های تحصیلی'
    },
    {
      name: 'مدیریت مکان‌ها',
      href: '/rooms',
      icon: BuildingOfficeIcon,
      description: 'مدیریت مکان‌های برگزاری امتحان'
    },
  ];

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            سیستم مدیریت امتحانات
          </h1>
          <p className="text-gray-600 mb-8">
            برای دسترسی به سرویس‌ها، لطفاً وارد حساب کاربری خود شوید.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-400"
          >
            <span>ورود به سیستم</span>
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          سیستم مدیریت امتحانات
        </h1>
        <p className="text-gray-600">
          خوش آمدید، {user.username}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <Link
              key={service.href}
              href={service.href}
              className="group rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-500 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-blue-50 p-3 group-hover:bg-blue-100 transition-colors">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {service.description}
                  </p>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
