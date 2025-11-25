import LoginForm from '@/app/ui/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-white dark:bg-gray-900">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
