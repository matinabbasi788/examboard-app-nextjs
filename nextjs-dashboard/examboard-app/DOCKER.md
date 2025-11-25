# راهنمای Docker برای سیستم مدیریت امتحانات

این راهنما نحوه اجرای پروژه با Docker را توضیح می‌دهد.

## پیش‌نیازها

- Docker (نسخه 20.10 یا بالاتر)
- Docker Compose (نسخه 2.0 یا بالاتر)

## ساختار فایل‌ها

- `Dockerfile`: فایل اصلی برای ساخت image
- `docker-compose.yml`: فایل برای اجرای سرویس‌ها
- `.dockerignore`: فایل‌هایی که در Docker build نادیده گرفته می‌شوند
- `.env.example`: نمونه فایل متغیرهای محیطی

## اجرای پروژه

### روش 1: استفاده از Docker Compose (پیشنهادی)

1. فایل `.env` را ایجاد کنید:
```bash
cp .env.example .env
```

2. متغیرهای محیطی را تنظیم کنید:
```env
NEXT_PUBLIC_API_URL=http://your-backend-api-url:8000
```

3. پروژه را اجرا کنید:
```bash
docker-compose up -d
```

4. برای مشاهده لاگ‌ها:
```bash
docker-compose logs -f
```

5. برای توقف:
```bash
docker-compose down
```

### روش 2: استفاده مستقیم از Docker

1. ساخت image:
```bash
docker build -t exam-management-frontend .
```

2. اجرای container:
```bash
docker run -d \
  --name exam-management-frontend \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://your-backend-api-url:8000 \
  exam-management-frontend
```

## تنظیمات

### متغیرهای محیطی

- `NEXT_PUBLIC_API_URL`: آدرس API backend (پیش‌فرض: `http://localhost:8000`)

### پورت‌ها

- پورت پیش‌فرض: `3000`
- برای تغییر پورت، فایل `docker-compose.yml` را ویرایش کنید

## استقرار در سرور

### 1. انتقال فایل‌ها به سرور

```bash
# استفاده از scp
scp -r nextjs-dashboard user@server:/path/to/destination

# یا استفاده از git
git clone your-repo-url
cd nextjs-dashboard
```

### 2. تنظیم متغیرهای محیطی

```bash
# ایجاد فایل .env
nano .env

# اضافه کردن متغیرها
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### 3. ساخت و اجرای container

```bash
# ساخت image
docker-compose build

# اجرای container
docker-compose up -d
```

### 4. بررسی وضعیت

```bash
# بررسی وضعیت container
docker-compose ps

# مشاهده لاگ‌ها
docker-compose logs -f nextjs-app
```

## عیب‌یابی

### Container اجرا نمی‌شود

```bash
# بررسی لاگ‌ها
docker-compose logs nextjs-app

# بررسی وضعیت
docker-compose ps
```

### مشکل اتصال به API

- مطمئن شوید که `NEXT_PUBLIC_API_URL` به درستی تنظیم شده است
- اگر API در container دیگری است، از نام سرویس در docker-compose استفاده کنید
- برای اتصال به host machine از `host.docker.internal` استفاده کنید (در Docker Desktop)

### مشکل در build

```bash
# پاک کردن cache و rebuild
docker-compose build --no-cache
```

## به‌روزرسانی

```bash
# دریافت آخرین تغییرات
git pull

# rebuild و restart
docker-compose down
docker-compose build
docker-compose up -d
```

## نکات مهم

1. **API URL**: مطمئن شوید که `NEXT_PUBLIC_API_URL` به درستی تنظیم شده است
2. **CORS**: اگر API در دامنه دیگری است، باید CORS در backend تنظیم شود
3. **HTTPS**: برای production، از reverse proxy (مثل Nginx) برای HTTPS استفاده کنید
4. **Backup**: به طور منظم از داده‌ها backup بگیرید

## استفاده با Nginx (اختیاری)

برای استفاده از Nginx به عنوان reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

