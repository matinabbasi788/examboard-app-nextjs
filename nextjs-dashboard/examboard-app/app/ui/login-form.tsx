"use client";

// Note: avoid importing project-specific font helper here to keep this component self-contained
import { UserIcon, KeyIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { Button } from './button';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/auth-context';

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

  const form = e.currentTarget;
  const formData = new FormData(form);
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');

    try {
      // POST to our server-side login proxy which will set an httpOnly cookie
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        // backend may return {detail: '...' } or {error: '...'}
        const message = json?.detail || json?.error || json?.non_field_errors?.[0] || json?.data?.detail || 'Unable to login';
        setError(message);
        setLoading(false);
        return;
      }

      // The server proxy returns { user, data } where data is the backend response
      const backend = json?.data || json;
      const token = backend?.access || backend?.token || backend?.access_token || backend?.refresh?.access || null;

      // Store username locally and token if available. The server sets an httpOnly cookie.
      login(username, token || undefined);

      // Optionally store entire response for debug
      try {
        localStorage.setItem('authResponse', JSON.stringify(json));
      } catch (e) {}

      // Get the return URL from query params or default to home
      const searchParams = new URLSearchParams(window.location.search);
      let returnTo = searchParams.get('return_to') || '';

      // fallback to cookie set by middleware if query param is missing
      if (!returnTo) {
        const match = document.cookie.match(new RegExp('(^| )return_to=([^;]+)'));
        if (match) returnTo = decodeURIComponent(match[2]);
      }

      if (!returnTo) returnTo = '/';

      // clear the return_to cookie (short-lived)
      document.cookie = 'return_to=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      router.push(returnTo);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1 className="mb-3 text-2xl font-semibold">Please log in to continue.</h1>
        <div className="w-full">
          <div>
                  <label className="mb-3 mt-5 block text-xs font-medium text-gray-900" htmlFor="username">
                    Username
            </label>
            <div className="relative">
                    <input
                      className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                      id="username"
                      type="text"
                      name="username"
                      placeholder="Enter your username"
                      required
                    />
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-3 mt-5 block text-xs font-medium text-gray-900" htmlFor="password">
              Password
            </label>
            <div className="relative">
                    <input
                      className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                      id="password"
                      type="password"
                      name="password"
                      placeholder="Enter password (min. 4 characters)"
                      required
                      minLength={4}
                    />
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
        </div>

        <Button className="mt-4 w-full" type="submit" disabled={loading}>
          {loading ? (
            <span className="flex items-center w-full justify-center">Logging in...</span>
          ) : (
            <>
              Log in <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
            </>
          )}
        </Button>

        <div className="flex h-8 items-end space-x-1">
          {error ? (
            <p className="flex items-center gap-1 text-sm text-red-600">
              <ExclamationCircleIcon className="h-4 w-4" /> {error}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
