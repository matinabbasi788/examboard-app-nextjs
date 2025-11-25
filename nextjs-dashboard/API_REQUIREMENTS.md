# Backend API Requirements for Reports

## تقاضا برای سرور API (Django/FastAPI/etc)

گزارش‌های نو به API endpoints زیر وابسته‌اند:

---

## 1. **GET /api/terms/**

**منظور**: لیست تمام ترم‌های دسترس‌پذیری

**پاسخ مورد انتظار**:
```json
{
  "results": [
    {
      "id": 1,
      "name": "پاییز 1403",
      "code": "FA-1403",
      "start_date": {"iso": "2024-09-22", "jalali": "1403-06-01"},
      "end_date": {"iso": "2024-12-21", "jalali": "1403-09-30"},
      "is_published": true,
      "is_archived": false
    }
  ]
}
```

**یا (برای پاسخ ساده)**:
```json
[
  {"id": 1, "name": "پاییز 1403", "code": "FA-1403"}
]
```

---

## 2. **GET /api/exams/?term={term_id}**

**منظور**: لیست امتحانات یک ترم

**پاسخ مورد انتظار**:
```json
{
  "results": [
    {
      "id": 1,
      "title": "ریاضی عمومی ۱",
      "course_code": "MATH101",
      "term": 1,
      "expected_students": 120,
      "duration_minutes": 120,
      "owner": 5
    }
  ]
}
```

**یا (array)**:
```json
[
  {
    "id": 1,
    "title": "ریاضی عمومی ۱",
    "course_code": "MATH101",
    "term": 1,
    "expected_students": 120
  }
]
```

---

## 3. **GET /api/allocations/**

**منظور**: لیست تمام اختصاص‌ها (Allocation = اختصاص امتحان به سالن و زمان)

**پاسخ مورد انتظار**:
```json
{
  "results": [
    {
      "id": 1,
      "exam": 1,
      "room": 5,
      "allocated_seats": 100,
      "start_at": "2024-01-15T09:00:00Z",
      "end_at": "2024-01-15T11:00:00Z",
      
      "created_manually": false,
      "is_manual": false,
      "source": "auto",
      "created_by": null
    }
  ]
}
```

**یا (datetime به صورت object)**:
```json
{
  "start_at": {
    "iso": "2024-01-15T09:00:00Z",
    "jalali": "1402-10-25T09:00:00"
  },
  "end_at": {
    "iso": "2024-01-15T11:00:00Z",
    "jalali": "1402-10-25T11:00:00"
  }
}
```

**یا (fallback fields)**:
```json
{
  "date": "2024-01-15",
  "time": "09:00"
}
```

---

## 4. **GET /api/rooms/**

**منظور**: لیست تمام سالن‌های امتحان

**پاسخ مورد انتظار**:
```json
{
  "results": [
    {
      "id": 1,
      "name": "سالن الف",
      "capacity": 120,
      "category": {
        "id": 1,
        "name": "محاضره"
      },
      "features": "تهویه، پروژکتور، صفحه هوشمند"
    }
  ]
}
```

---

## 5. **GET /api/allocations/logs/** (Optional)

**منظور**: لاگ‌های تغییرات اختصاص (برای گزارش تداخل)

**توضیح**: برای نمایش سیاق تغییرات allocation ها. اگر موجود نیست، سیستم با graceful degradation کار می‌کند.

**پاسخ مورد انتظار**:
```json
[
  {
    "id": 1,
    "allocation": 5,
    "action": "created",
    "timestamp": "2024-01-10T10:30:00Z",
    "user": "admin@example.com"
  }
]
```

---

## معتبرسازی (Authentication)

تمام درخواست‌ها باید Token Authentication دریافت کنند:

```
Authorization: Bearer {access_token}
```

**پاسخ خطا**:
- **401 Unauthorized**: توکن موجود نیست یا منقضی است
- **403 Forbidden**: کاربر اجازه ندارد
- **404 Not Found**: endpoint موجود نیست

---

## Response Format

### الگو 1: Django REST Framework (Pagination)
```json
{
  "count": 10,
  "next": "http://api/endpoint/?page=2",
  "previous": null,
  "results": [...]
}
```
→ سیستم خودکار `results` را استخراج می‌کند

### الگو 2: Array ساده
```json
[...]
```
→ سیستم مستقیم استفاده می‌کند

### الگو 3: Object شامل داده
```json
{
  "data": [...],
  "meta": {...}
}
```
→ سیستم استخراج خودکار را سعی می‌کند

---

## فیلدهای موردنیاز (Required) vs اختیاری (Optional)

### Term
- **الزامی**: `id`, `name`
- **اختیاری**: `code`, `start_date`, `end_date`, `is_published`, `is_archived`

### Exam
- **الزامی**: `id`, `title`, `term`
- **اختیاری**: `course_code`, `expected_students`, `duration_minutes`, `owner`

### Room
- **الزامی**: `id`, `name`, `capacity`
- **اختیاری**: `category`, `features`

### Allocation
- **الزامی**: `id`, `exam`, `room`
- **اختیاری**: `allocated_seats`, `start_at`, `end_at`, `created_manually`, `is_manual`, `source`, `created_by`
- **Fallback**: `date`, `time` (اگر `start_at` موجود نباشد)

---

## مثال کامل cURL

### 1. Login و دریافت Token
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'

# Response:
# {"access": "eyJhbGciOi....", "refresh": "..."}
```

### 2. دریافت ترم‌ها
```bash
TOKEN="eyJhbGciOi...."

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/terms/
```

### 3. دریافت امتحانات ترم 1
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/exams/?term=1
```

### 4. دریافت اختصاص‌ها
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/allocations/
```

### 5. دریافت سالن‌ها
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/rooms/
```

---

## خطاهای متداول در Backend

### ❌ مشکل 1: Token منقضی
```
GET /api/terms/ 401 Unauthorized
→ توکن را تازه کنید یا کاربر دوباره لاگین کند
```

### ❌ مشکل 2: Endpoint موجود نیست
```
GET /api/allocations/ 404 Not Found
→ endpoint را در Django/FastAPI تعریف کنید
```

### ❌ مشکل 3: فیلد موردنیاز موجود نیست
```
مثال: allocation.room = null
→ در database allocation بدون room ذخیره‌شده
→ گزارش ظرفیت آن را نادیده می‌گیرد
```

### ❌ مشکل 4: Datetime فرمت غلط
```
start_at = "15-Jan-2024 09:00"  ❌
start_at = "2024-01-15T09:00:00Z"  ✅
```

---

## تست API (Postman/Insomnia)

1. **New Request → GET**
2. **URL**: `http://localhost:8000/api/terms/`
3. **Headers**:
   - `Authorization: Bearer {token}`
   - `Accept: application/json`
4. **Send** و بررسی Response

---

## Pagination

اگر API pagination دارد:

```json
{
  "count": 100,
  "next": "http://api/endpoint/?page=2",
  "previous": null,
  "results": [...]
}
```

سیستم NextJS خودکار تمام صفحه‌ها را دریافت می‌کند.

---

## خلاصه

**برای گزارش‌ها کار کنند، این 4 endpoint کافی است:**

1. ✅ `/api/terms/` - list terms
2. ✅ `/api/exams/` - list exams (with ?term filter)
3. ✅ `/api/allocations/` - list allocations
4. ✅ `/api/rooms/` - list rooms

**اختیاری**:
5. `/api/allocations/logs/` - change logs (یا fallback)

---

**آماده‌سازی شده در**: 2024-01-20
**نسخه**: 1.0
