# سیستم مدیریت امتحانات

سیستم مدیریت امتحانات با Next.js، TypeScript و Tailwind CSS

## ویژگی‌ها

- مدیریت امتحانات
- مدیریت ترم‌ها
- مدیریت مکان‌ها
- وارد/صادر کردن امتحانات از/به Excel
- بررسی تداخل امتحانات
- مدیریت ظرفیت مکان‌ها

## راه‌اندازی سریع

برای راهنمای سریع شروع، به [QUICK_START.md](./QUICK_START.md) مراجعه کنید.

## راه‌اندازی محلی

### پیش‌نیازها

- Node.js 20 یا بالاتر
- pnpm
- Backend API (در حال اجرا روی `http://localhost:8000`)

### نصب

```bash
# نصب dependencies
pnpm install

# اجرای development server
pnpm dev
```

برنامه روی `http://localhost:3000` اجرا می‌شود.

## استقرار با Docker

برای راهنمای کامل Docker، به [DOCKER.md](./DOCKER.md) مراجعه کنید.

### راه‌اندازی سریع

1. ایجاد فایل `.env`:
```bash
NEXT_PUBLIC_API_URL=http://your-backend-api-url:8000
```

2. اجرای با Docker Compose:
```bash
docker-compose up -d
```

## متغیرهای محیطی

- `NEXT_PUBLIC_API_URL`: آدرس API backend (پیش‌فرض: `http://localhost:8000`)

## ساختار پروژه

```
nextjs-dashboard/
├── app/
│   ├── api/          # API routes
│   ├── exams/         # صفحات امتحانات
│   ├── terms/         # صفحات ترم‌ها
│   ├── rooms/         # صفحات مکان‌ها
│   ├── lib/           # سرویس‌ها و utilities
│   └── ui/            # کامپوننت‌های UI
├── public/            # فایل‌های استاتیک
├── Dockerfile         # فایل Docker
└── docker-compose.yml # تنظیمات Docker Compose
```

## اسکریپت‌ها

- `pnpm dev`: اجرای development server
- `pnpm build`: ساخت production build
- `pnpm start`: اجرای production server

## مستندات

پروژه شامل مستندات جامع است:

- **[QUICK_START.md](./QUICK_START.md)**: راهنمای شروع سریع
- **[DOCUMENTATION.md](./DOCUMENTATION.md)**: مستندات کامل و جامع
  - راهنمای کامل استفاده
  - مستندات API
  - ساختار کد
  - عیب‌یابی
  - بهترین روش‌ها
- **[DOCKER.md](./DOCKER.md)**: راهنمای Docker
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: راهنمای مشارکت در پروژه
- **[CHANGELOG.md](./CHANGELOG.md)**: تاریخچه تغییرات

## اطلاعات بیشتر

برای اطلاعات بیشتر در مورد Next.js، به [Next.js Documentation](https://nextjs.org/docs) مراجعه کنید.
