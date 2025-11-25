# Changelog

تمام تغییرات قابل توجه این پروژه در این فایل مستند می‌شود.

فرمت بر اساس [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
و این پروژه از [Semantic Versioning](https://semver.org/spec/v2.0.0.html) پیروی می‌کند.

## [Unreleased]

### Added
- مستندات کامل پروژه (DOCUMENTATION.md)
- راهنمای شروع سریع (QUICK_START.md)
- پشتیبانی از Docker و Docker Compose
- تبدیل API URLs به متغیرهای محیطی
- دکمه برگشت به صفحه اصلی در تمام صفحات
- نمایش جزئیات تداخل‌ها با modal
- ویرایش allocation امتحانات
- Pagination برای صفحات exams و import-export
- پشتیبانی از فرمت Excel جدید با "زمان امتحان"
- پشتیبانی از تاریخ شمسی (جلالی) در export
- بررسی خودکار تداخل زمان و مکان
- مدیریت ظرفیت مکان‌ها با در نظر گیری تداخل‌ها

### Changed
- بهبود UI/UX صفحات
- بهبود error handling
- بهبود validation
- بهینه‌سازی performance با pagination

### Fixed
- مشکل timezone در نمایش زمان
- مشکل نمایش تاریخ و زمان در export
- مشکل ایجاد allocation هنگام import از Excel
- مشکل header matching در Excel import
- مشکل نمایش location در export

## [1.0.0] - 2024-01-XX

### Added
- سیستم مدیریت امتحانات
- سیستم مدیریت ترم‌ها
- سیستم مدیریت مکان‌ها
- وارد/صادر کردن امتحانات از/به Excel
- سیستم احراز هویت با JWT
- بررسی تداخل امتحانات
- مدیریت allocation امتحانات
- پشتیبانی از تاریخ شمسی (جلالی)
- UI با Tailwind CSS
- Responsive design

---

## دستورالعمل‌های نگارش

### Added
برای ویژگی‌های جدید

### Changed
برای تغییرات در عملکرد موجود

### Deprecated
برای ویژگی‌هایی که به زودی حذف می‌شوند

### Removed
برای ویژگی‌های حذف شده

### Fixed
برای رفع باگ‌ها

### Security
برای رفع آسیب‌پذیری‌های امنیتی

