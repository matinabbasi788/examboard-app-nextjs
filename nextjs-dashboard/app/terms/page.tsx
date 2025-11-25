import { TermsList } from '@/app/ui/terms/terms-list';

export default function TermsPage() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="py-4 md:py-6">
        <h1 dir="rtl" className="text-2xl font-semibold mb-6">مدیریت ترم ها</h1>
        <TermsList />
      </div>
    </main>
  );
}