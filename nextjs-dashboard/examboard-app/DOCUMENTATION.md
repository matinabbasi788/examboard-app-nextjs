# مستندات کامل سیستم مدیریت امتحانات

## فهرست مطالب

1. [معرفی پروژه](#معرفی-پروژه)
2. [ویژگی‌ها](#ویژگی‌ها)
3. [ساختار پروژه](#ساختار-پروژه)
4. [نصب و راه‌اندازی](#نصب-و-راه‌اندازی)
5. [استقرار با Docker](#استقرار-با-docker)
6. [راهنمای استفاده](#راهنمای-استفاده)
7. [API Documentation](#api-documentation)
8. [ساختار کد](#ساختار-کد)
9. [متغیرهای محیطی](#متغیرهای-محیطی)
10. [عیب‌یابی](#عیب‌یابی)
11. [به‌روزرسانی](#به‌روزرسانی)

---

## معرفی پروژه

سیستم مدیریت امتحانات یک برنامه وب مدرن است که با استفاده از **Next.js 14** (App Router)، **TypeScript**، و **Tailwind CSS** ساخته شده است. این سیستم امکان مدیریت کامل امتحانات، ترم‌ها، مکان‌ها و بررسی تداخل‌ها را فراهم می‌کند.

### تکنولوژی‌های استفاده شده

- **Frontend Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm
- **Date Handling**: date-fns-jalali (برای تاریخ شمسی)
- **Excel Processing**: xlsx
- **Icons**: Heroicons
- **Containerization**: Docker

---

## ویژگی‌ها

### 1. مدیریت امتحانات (`/exams`)
- ✅ ثبت امتحان جدید با جزئیات کامل
- ✅ نمایش لیست امتحانات با pagination
- ✅ حذف امتحان
- ✅ بررسی خودکار تداخل زمان و مکان
- ✅ مدیریت ظرفیت مکان‌ها
- ✅ نمایش وضعیت allocation (زمان و مکان)
- ✅ ویرایش allocation امتحانات
- ✅ نمایش جزئیات تداخل‌ها

### 2. وارد/صادر کردن امتحانات (`/exams/import-export`)
- ✅ وارد کردن امتحانات از فایل Excel
- ✅ صادر کردن امتحانات به فایل Excel
- ✅ پشتیبانی از فرمت‌های مختلف Excel
- ✅ پیش‌نمایش داده‌های وارد شده
- ✅ اعتبارسنجی داده‌ها قبل از ثبت
- ✅ پشتیبانی از تاریخ شمسی (جلالی)

### 3. مدیریت ترم‌ها (`/terms`)
- ✅ ایجاد ترم جدید
- ✅ نمایش لیست ترم‌ها
- ✅ حذف ترم
- ✅ آرشیو کردن/بازگردانی ترم‌ها
- ✅ مدیریت تاریخ شروع و پایان

### 4. مدیریت مکان‌ها (`/rooms`)
- ✅ ثبت مکان جدید با ظرفیت و ویژگی‌ها
- ✅ نمایش لیست مکان‌ها
- ✅ حذف مکان
- ✅ نمایش ظرفیت و ویژگی‌های هر مکان

### 5. سیستم احراز هویت
- ✅ لاگین با JWT
- ✅ مدیریت session
- ✅ محافظت از routes با middleware
- ✅ نمایش اطلاعات کاربر

---

## ساختار پروژه

```
nextjs-dashboard/
├── app/
│   ├── api/                    # API Routes (Next.js)
│   │   ├── exams/
│   │   │   ├── import/         # وارد کردن Excel
│   │   │   └── export/         # صادر کردن Excel
│   │   ├── login/              # لاگین
│   │   └── logout/             # خروج
│   ├── exams/                  # صفحات امتحانات
│   │   ├── page.tsx            # صفحه اصلی امتحانات
│   │   └── import-export/      # صفحه وارد/صادر
│   ├── terms/                  # صفحات ترم‌ها
│   ├── rooms/                  # صفحات مکان‌ها
│   ├── login/                  # صفحه لاگین
│   ├── lib/                    # سرویس‌ها و utilities
│   │   ├── exams-service.ts    # API calls برای امتحانات
│   │   ├── terms-service.ts    # API calls برای ترم‌ها
│   │   ├── rooms-service.ts    # API calls برای مکان‌ها
│   │   ├── allocations-service.ts  # API calls برای allocations
│   │   ├── auth-context.tsx    # Context برای authentication
│   │   └── utils.ts            # توابع کمکی
│   ├── ui/                     # کامپوننت‌های UI
│   │   ├── exams/
│   │   │   ├── exams-page.tsx  # کامپوننت اصلی امتحانات
│   │   │   └── exam-import-export-page.tsx
│   │   ├── terms/
│   │   │   └── terms-list.tsx
│   │   ├── rooms/
│   │   │   └── rooms-list.tsx
│   │   ├── jalali-date-picker.tsx  # Date picker شمسی
│   │   └── ...
│   ├── layout.tsx               # Layout اصلی
│   ├── page.tsx                # صفحه home
│   └── middleware.ts            # Middleware برای auth
├── public/                      # فایل‌های استاتیک
├── Dockerfile                   # فایل Docker
├── docker-compose.yml          # تنظیمات Docker Compose
├── next.config.ts              # تنظیمات Next.js
├── tailwind.config.ts          # تنظیمات Tailwind
├── tsconfig.json               # تنظیمات TypeScript
└── package.json                # Dependencies
```

---

## نصب و راه‌اندازی

### پیش‌نیازها

- **Node.js**: نسخه 20 یا بالاتر
- **pnpm**: نسخه 8 یا بالاتر
- **Backend API**: باید در حال اجرا باشد (پیش‌فرض: `http://localhost:8000`)

### نصب Dependencies

```bash
# نصب pnpm (اگر نصب نیست)
npm install -g pnpm

# نصب dependencies
cd nextjs-dashboard
pnpm install
```

### تنظیم متغیرهای محیطی

فایل `.env.local` را در ریشه پروژه ایجاد کنید:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### اجرای Development Server

```bash
pnpm dev
```

برنامه روی `http://localhost:3000` اجرا می‌شود.

### ساخت Production Build

```bash
# ساخت
pnpm build

# اجرا
pnpm start
```

---

## استقرار با Docker

### روش 1: Docker Compose (پیشنهادی)

1. **ایجاد فایل `.env`**:
```bash
NEXT_PUBLIC_API_URL=http://your-backend-api-url:8000
```

2. **ساخت و اجرا**:
```bash
docker-compose build
docker-compose up -d
```

3. **بررسی وضعیت**:
```bash
docker-compose ps
docker-compose logs -f
```

### روش 2: Docker مستقیم

```bash
# ساخت image
docker build -t exam-management-frontend .

# اجرای container
docker run -d \
  --name exam-management-frontend \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://your-backend-api-url:8000 \
  exam-management-frontend
```

برای جزئیات بیشتر، به [DOCKER.md](./DOCKER.md) مراجعه کنید.

---

## راهنمای استفاده

### صفحه اصلی (`/`)

صفحه اصلی شامل:
- نمایش پیام خوش‌آمدگویی (اگر لاگین نکرده باشید)
- لینک به صفحه لاگین
- کارت‌های دسترسی به سرویس‌های مختلف (اگر لاگین کرده باشید)

### مدیریت امتحانات (`/exams`)

#### ثبت امتحان جدید

1. یک ترم را از dropdown انتخاب کنید
2. فرم را پر کنید:
   - **عنوان**: نام امتحان
   - **کد درس**: کد درس (اختیاری)
   - **تاریخ**: تاریخ امتحان (شمسی)
   - **ساعت**: ساعت شروع
   - **مدت**: مدت زمان به دقیقه
   - **تعداد دانشجویان**: تعداد دانشجویان
   - **مکان**: انتخاب مکان از dropdown
3. روی "ثبت امتحان" کلیک کنید

**نکات مهم**:
- سیستم به طور خودکار تداخل زمان و مکان را بررسی می‌کند
- ظرفیت باقیمانده هر مکان در dropdown نمایش داده می‌شود
- اگر تداخلی وجود داشته باشد، خطا نمایش داده می‌شود

#### ویرایش Allocation

1. روی آیکون ✏️ کنار هر امتحان کلیک کنید
2. در modal باز شده، اطلاعات را ویرایش کنید
3. روی "ذخیره" کلیک کنید

#### مشاهده جزئیات تداخل

1. اگر امتحان تداخل دارد، badge قرمز نمایش داده می‌شود
2. روی badge کلیک کنید تا جزئیات تداخل‌ها نمایش داده شود

### وارد/صادر کردن امتحانات (`/exams/import-export`)

#### وارد کردن از Excel

1. یک ترم را انتخاب کنید
2. فایل Excel را انتخاب کنید
3. پیش‌نمایش داده‌ها را بررسی کنید
4. روی "وارد کردن" کلیک کنید

**فرمت Excel مورد قبول**:

| ستون | نام فارسی | نام انگلیسی | توضیحات |
|------|-----------|-------------|----------|
| عنوان | عنوان / نام درس | title | الزامی |
| کد درس | کد درس / كد درس | course_code | اختیاری |
| تاریخ | تاریخ (میلادی) / تاریخ (شمسی) | date | اختیاری |
| زمان امتحان | زمان امتحان | exam_datetime | فرمت: `1404/10/18 از 10:30 تا 12:00` |
| ساعت | ساعت | time | اختیاری |
| مدت | مدت (دقیقه) | duration_minutes | اختیاری |
| تعداد دانشجویان | تعداد دانشجویان / تعداد ثبت نامي | expected_students | اختیاری |
| محل برگزاری | محل برگزاری / مکان | location | اختیاری |

**نکات**:
- اگر "زمان امتحان" وجود داشته باشد، تاریخ و ساعت از آن استخراج می‌شود
- اگر "محل برگزاری" خالی باشد، امتحان بدون مکان ثبت می‌شود و می‌توانید بعداً در صفحه `/exams` مکان اختصاص دهید

#### صادر کردن به Excel

1. یک ترم را انتخاب کنید
2. روی "خروجی گرفتن Excel" کلیک کنید
3. فایل Excel دانلود می‌شود

**ستون‌های فایل خروجی**:
- عنوان
- کد درس
- تاریخ (میلادی)
- تاریخ (شمسی)
- ساعت
- مدت (دقیقه)
- تعداد دانشجویان
- محل برگزاری

### مدیریت ترم‌ها (`/terms`)

1. فرم را پر کنید:
   - **نام**: نام ترم (مثلاً: پاییز ۱۴۰۳)
   - **کد**: کد ترم (مثلاً: 1403-FA)
   - **تاریخ شروع**: تاریخ شروع ترم (شمسی)
   - **تاریخ پایان**: تاریخ پایان ترم (شمسی)
   - **منتشر شده**: آیا ترم منتشر شده است؟
   - **آرشیو شده**: آیا ترم آرشیو شده است؟
2. روی "افزودن ترم" کلیک کنید

**عملیات**:
- حذف: روی آیکون ❌ کلیک کنید
- آرشیو/بازگردانی: روی آیکون آرشیو کلیک کنید

### مدیریت مکان‌ها (`/rooms`)

1. فرم را پر کنید:
   - **نام**: نام مکان (مثلاً: سالن ۱۰۱)
   - **ظرفیت**: ظرفیت مکان (الزامی)
   - **ویژگی‌ها**: ویژگی‌های مکان (اختیاری)
2. روی "افزودن مکان" کلیک کنید

**نکات**:
- ظرفیت باید عدد مثبت باشد
- ویژگی‌ها می‌تواند یک رشته یا JSON باشد

---

## API Documentation

### Backend API Endpoints

پروژه به یک Backend API متصل است که باید در آدرس مشخص شده در `NEXT_PUBLIC_API_URL` در حال اجرا باشد.

#### Authentication

**POST** `/api/auth/jwt/create/`
- ورودی: `{ username: string, password: string }`
- خروجی: `{ access: string }` (JWT token)

#### Exams

**GET** `/api/exams/`
- Query params: `?term={termId}` (اختیاری)
- Headers: `Authorization: Bearer {token}`
- خروجی: لیست امتحانات (ممکن است paginated باشد)

**POST** `/api/exams/`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- Body: `CreateExamPayload`
- خروجی: Exam object

**DELETE** `/api/exams/{id}/`
- Headers: `Authorization: Bearer {token}`

#### Terms

**GET** `/api/terms/`
- Headers: `Authorization: Bearer {token}`
- خروجی: لیست ترم‌ها

**POST** `/api/terms/`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- Body: `CreateTermPayload`
- خروجی: Term object

**DELETE** `/api/terms/{id}/`
- Headers: `Authorization: Bearer {token}`

**PATCH** `/api/terms/{id}/archive/`
- Headers: `Authorization: Bearer {token}`
- Body: `{ is_archived: boolean }`

#### Rooms

**GET** `/api/rooms/`
- Headers: `Authorization: Bearer {token}`
- خروجی: لیست مکان‌ها

**POST** `/api/rooms/`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- Body: `{ name: string, capacity: number, features: string }`
- خروجی: Room object

**DELETE** `/api/rooms/{id}/`
- Headers: `Authorization: Bearer {token}`

#### Allocations

**GET** `/api/allocations/`
- Headers: `Authorization: Bearer {token}`
- Query params: `?exam={examId}` (اختیاری)
- خروجی: لیست allocations (ممکن است paginated باشد)

**POST** `/api/allocations/`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- Body: `{ exam: number, room: number, start_at: string, end_at: string, allocated_seats: number }`
- خروجی: Allocation object

**PATCH** `/api/allocations/{id}/`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- Body: `UpdateAllocationPayload` (partial)
- خروجی: Allocation object

### Next.js API Routes

#### POST `/api/exams/import`

وارد کردن امتحانات از فایل Excel.

**Request**:
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `file`: File (Excel file)
  - `termId`: number

**Response**:
```json
{
  "success": true,
  "imported": 10,
  "failed": 0,
  "exams": [...],
  "errors": []
}
```

#### GET `/api/exams/export`

صادر کردن امتحانات به فایل Excel.

**Request**:
- Method: GET
- Query params: `?termId={termId}`

**Response**: Excel file (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

#### POST `/api/login`

لاگین کاربر.

**Request**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response**:
```json
{
  "user": { "username": "string" },
  "data": { "access": "string" }
}
```

Cookie: `accessToken` (httpOnly)

#### POST `/api/logout`

خروج کاربر.

**Response**: 200 OK

---

## ساختار کد

### Services (`app/lib/`)

#### `exams-service.ts`

توابع برای تعامل با API امتحانات:

- `getExams(termId?: number)`: دریافت لیست امتحانات
- `createExam(payload)`: ایجاد امتحان جدید
- `deleteExam(id)`: حذف امتحان
- `importExamsFromExcel(file, termId)`: وارد کردن از Excel
- `exportExamsToExcel(termId)`: صادر کردن به Excel

#### `allocations-service.ts`

توابع برای تعامل با API allocations:

- `getAllocations(examId?)`: دریافت لیست allocations
- `getAllocationsForExams(examIds)`: دریافت allocations برای چند exam
- `createAllocation(payload)`: ایجاد allocation جدید
- `updateAllocation(id, payload)`: به‌روزرسانی allocation
- `extractDateAndTime(startAt)`: استخراج تاریخ و زمان از ISO string

#### `terms-service.ts`

توابع برای تعامل با API ترم‌ها:

- `getTerms()`: دریافت لیست ترم‌ها
- `createTerm(payload)`: ایجاد ترم جدید
- `deleteTerm(id)`: حذف ترم
- `toggleTermArchive(id)`: تغییر وضعیت آرشیو

#### `rooms-service.ts`

توابع برای تعامل با API مکان‌ها:

- `getRooms()`: دریافت لیست مکان‌ها
- `createRoom(payload)`: ایجاد مکان جدید
- `deleteRoom(id)`: حذف مکان

#### `auth-context.tsx`

Context برای مدیریت authentication:

- `AuthProvider`: Provider component
- `useAuth()`: Hook برای دسترسی به auth state
- `login(username, token?)`: لاگین کاربر
- `logout()`: خروج کاربر

### Components (`app/ui/`)

#### `exams/exams-page.tsx`

کامپوننت اصلی صفحه امتحانات:

**State Management**:
- `terms`, `rooms`, `exams`: داده‌های اصلی
- `allocationsMap`: Map از exam ID به allocation
- `selectedTermId`: ترم انتخاب شده
- `currentPage`, `itemsPerPage`: pagination
- `editingAllocation`: state برای modal ویرایش

**Functions**:
- `loadExams()`: بارگذاری امتحانات
- `handleSubmit()`: ثبت امتحان جدید
- `handleDelete()`: حذف امتحان
- `checkTimeOverlap()`: بررسی تداخل زمان
- `getAvailableCapacity()`: محاسبه ظرفیت باقیمانده
- `checkExamConflicts()`: بررسی تداخل‌ها
- `getExamStatus()`: دریافت وضعیت امتحان
- `handleEditAllocation()`: باز کردن modal ویرایش
- `handleUpdateAllocation()`: ذخیره تغییرات allocation

#### `exams/exam-import-export-page.tsx`

کامپوننت صفحه وارد/صادر:

**Features**:
- انتخاب فایل Excel
- پیش‌نمایش داده‌ها
- وارد کردن داده‌ها
- صادر کردن به Excel
- نمایش لیست امتحانات با pagination

#### `jalali-date-picker.tsx`

Date picker برای تاریخ شمسی:

- استفاده از `date-fns-jalali`
- فرمت: `YYYY/MM/DD`
- Validation

### API Routes (`app/api/`)

#### `exams/import/route.ts`

**عملکرد**:
1. دریافت فایل Excel از FormData
2. Parse کردن فایل با `xlsx`
3. تبدیل داده‌ها به فرمت Exam
4. ایجاد exam در backend
5. ایجاد allocation (اگر اطلاعات کافی باشد)

**پشتیبانی از فرمت‌ها**:
- تاریخ میلادی (ISO)
- تاریخ شمسی (جلالی)
- زمان امتحان ترکیبی: `1404/10/18 از 10:30 تا 12:00`
- تبدیل نام مکان به ID

#### `exams/export/route.ts`

**عملکرد**:
1. دریافت exams از backend
2. دریافت allocations
3. دریافت rooms
4. تبدیل داده‌ها به فرمت Excel
5. ایجاد فایل Excel با `xlsx`
6. Return کردن فایل

**ستون‌های خروجی**:
- عنوان، کد درس، تاریخ (میلادی و شمسی)، ساعت، مدت، تعداد دانشجویان، محل برگزاری

---

## متغیرهای محیطی

### `NEXT_PUBLIC_API_URL`

آدرس Backend API.

**مثال**:
```env
# Development
NEXT_PUBLIC_API_URL=http://localhost:8000

# Production
NEXT_PUBLIC_API_URL=https://api.example.com
```

**نکات**:
- باید با `NEXT_PUBLIC_` شروع شود تا در client-side در دسترس باشد
- بدون trailing slash
- برای production باید از HTTPS استفاده شود

---

## عیب‌یابی

### مشکل: API calls fail

**علل احتمالی**:
1. Backend API در حال اجرا نیست
2. `NEXT_PUBLIC_API_URL` به درستی تنظیم نشده
3. CORS در backend تنظیم نشده

**راه‌حل**:
1. بررسی کنید که backend در حال اجرا است
2. `NEXT_PUBLIC_API_URL` را در `.env.local` بررسی کنید
3. Console browser را برای خطاهای CORS بررسی کنید

### مشکل: تاریخ و زمان نمایش داده نمی‌شود

**علل احتمالی**:
1. Allocation ایجاد نشده است
2. مشکل در parsing تاریخ/زمان

**راه‌حل**:
1. بررسی کنید که allocation برای exam ایجاد شده است
2. Console logs را بررسی کنید
3. فرمت تاریخ/زمان را بررسی کنید

### مشکل: تداخل تشخیص داده نمی‌شود

**علل احتمالی**:
1. تاریخ/زمان به درستی parse نشده
2. مشکل در منطق بررسی تداخل

**راه‌حل**:
1. Console logs را بررسی کنید
2. فرمت تاریخ/زمان را بررسی کنید
3. منطق `checkTimeOverlap` را بررسی کنید

### مشکل: Docker build fail می‌شود

**علل احتمالی**:
1. مشکل در Dockerfile
2. مشکل در dependencies

**راه‌حل**:
```bash
# پاک کردن cache و rebuild
docker-compose build --no-cache

# بررسی logs
docker-compose logs
```

### مشکل: Excel import کار نمی‌کند

**علل احتمالی**:
1. فرمت فایل Excel صحیح نیست
2. ستون‌ها به درستی شناسایی نمی‌شوند

**راه‌حل**:
1. فرمت فایل را با نمونه مقایسه کنید
2. Console logs را برای header matching بررسی کنید
3. مطمئن شوید که ستون‌های الزامی وجود دارند

---

## به‌روزرسانی

### به‌روزرسانی Dependencies

```bash
# بررسی outdated packages
pnpm outdated

# به‌روزرسانی
pnpm update

# به‌روزرسانی major versions (با احتیاط)
pnpm update --latest
```

### به‌روزرسانی کد

```bash
# دریافت آخرین تغییرات
git pull

# نصب dependencies جدید
pnpm install

# Rebuild
pnpm build
```

### به‌روزرسانی Docker

```bash
# دریافت آخرین تغییرات
git pull

# Rebuild و restart
docker-compose down
docker-compose build
docker-compose up -d
```

---

## بهترین روش‌ها (Best Practices)

### 1. امنیت

- ✅ استفاده از HTTPS در production
- ✅ ذخیره token در httpOnly cookie
- ✅ Validation در client و server
- ✅ Sanitize کردن input ها

### 2. Performance

- ✅ استفاده از pagination برای لیست‌های بزرگ
- ✅ Lazy loading برای کامپوننت‌های بزرگ
- ✅ Caching برای داده‌های استاتیک
- ✅ Optimize کردن images

### 3. Code Quality

- ✅ استفاده از TypeScript
- ✅ تقسیم کد به modules کوچک
- ✅ استفاده از reusable components
- ✅ Document کردن functions

### 4. UX

- ✅ نمایش loading states
- ✅ نمایش error messages واضح
- ✅ Validation در real-time
- ✅ Confirmation برای عملیات حساس

---

## پشتیبانی

برای گزارش باگ یا درخواست ویژگی جدید، لطفاً issue در repository ایجاد کنید.

---

## مجوز (License)

[متن مجوز را اینجا قرار دهید]

---

**آخرین به‌روزرسانی**: [تاریخ]

