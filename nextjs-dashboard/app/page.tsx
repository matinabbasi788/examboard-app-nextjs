'use client';

import { useAuth } from '@/app/lib/auth-context';
import Link from 'next/link';
import { 
  AcademicCapIcon, 
  CalendarIcon, 
  BuildingOfficeIcon,
  DocumentArrowUpIcon,
  ArrowRightIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
  CheckBadgeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function Page() {
  const { user } = useAuth();

  const services = [
    {
      name: 'مدیریت امتحانات',
      href: '/exams',
      icon: AcademicCapIcon,
      description: 'ثبت، ویرایش و حذف امتحانات',
      color: 'from-blue-500 to-blue-600'
    },
    {
      name: 'وارد/صادر کردن امتحانات',
      href: '/exams/import-export',
      icon: DocumentArrowUpIcon,
      description: 'وارد کردن و صادر کردن امتحانات از/به فایل Excel',
      color: 'from-purple-500 to-purple-600'
    },
    {
      name: 'مدیریت ترم‌ها',
      href: '/terms',
      icon: CalendarIcon,
      description: 'مدیریت ترم‌های تحصیلی',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      name: 'مدیریت مکان‌ها',
      href: '/rooms',
      icon: BuildingOfficeIcon,
      description: 'مدیریت مکان‌های برگزاری امتحان',
      color: 'from-orange-500 to-orange-600'
    },
    {
      name: 'گزارش برنامه امتحانات',
      href: '/reports/schedule',
      icon: ClipboardDocumentListIcon,
      description: 'مشاهده لیست کامل امتحانات با فیلترهای پیشرفته',
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      name: 'گزارش ظرفیت فضاها',
      href: '/reports/capacity',
      icon: CheckBadgeIcon,
      description: 'بررسی استفاده از ظرفیت مکان‌ها نسبت به تعداد دانشجو',
      color: 'from-pink-500 to-pink-600'
    },
    {
      name: 'گزارش تداخل‌ها',
      href: '/reports/conflicts',
      icon: ExclamationTriangleIcon,
      description: 'شناسایی تداخل‌های زمان و مکان امتحانات',
      color: 'from-red-500 to-red-600'
    },
    {
      name: 'گزارش استفاده از مکان‌ها',
      href: '/reports/utilization',
      icon: ChartBarIcon,
      description: 'تحلیل بار کاری سالن‌ها و درصد استفاده',
      color: 'from-indigo-500 to-indigo-600'
    },
  ];

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-200 dark:bg-blue-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200 dark:bg-indigo-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
        </div>
        <div className="w-full max-w-md text-center relative z-10">
          <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-4">
            سیستم مدیریت امتحانات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
            برای دسترسی به سرویس‌ها، لطفاً وارد حساب کاربری خود شوید.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 px-8 py-4 text-base font-semibold text-white transition-all hover:shadow-xl hover:shadow-blue-500/30 dark:hover:shadow-blue-500/20 hover:-translate-y-1"
          >
            <span>ورود به سیستم</span>
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col p-6 md:p-8 bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" dir="rtl">
      <div className="mt-8 mb-12">
        <div className="flex items-center gap-2 mb-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            سیستم مدیریت امتحانات
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-lg mt-3">
          خوش آمدید، <span className="font-semibold text-gray-900 dark:text-white">{user.username}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {services.map((service) => {
          const Icon = service.icon;
          const [gradStart, gradEnd] = service.color.split(' ').slice(1, 3);
          return (
            <Link
              key={service.href}
              href={service.href}
              className="group relative rounded-2xl overflow-hidden bg-white dark:bg-gray-800 p-6 transition-all duration-300 hover:shadow-2xl dark:hover:shadow-2xl dark:hover:shadow-gray-950/50 hover:-translate-y-2 border border-gray-100 dark:border-gray-700 hover:border-transparent hover:bg-gradient-to-br dark:hover:bg-gradient-to-br"
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              
              {/* Icon background */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-20 rounded-full -translate-y-8 translate-x-8 transition-all duration-300 blur-3xl`}></div>
              
              <div className="relative z-10">
                <div className={`rounded-xl bg-gradient-to-br ${service.color} p-3 w-fit mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-white transition-all duration-300">
                  {service.name}
                </h3>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed group-hover:text-gray-100 transition-colors duration-300">
                  {service.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 group-hover:border-gray-200 dark:group-hover:border-gray-600 transition-colors">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-white transition-all duration-300">
                    رفتن به صفحه
                  </span>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      
      {/* Bottom accent bar */}
      <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-pulse"></div>
            <span>سیستم فعال و آماده خدمات رسانی می باشد.</span>
          </div>
        </div>
      </div>
    </main>
  );
}
