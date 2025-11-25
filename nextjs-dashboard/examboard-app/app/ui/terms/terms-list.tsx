'use client';

import { useState, useEffect } from 'react';
import { Term, getTerms, createTerm, deleteTerm, toggleTermArchive, CreateTermPayload } from '@/app/lib/terms-service';
import JalaliDatePicker from '@/app/ui/jalali-date-picker';
import { parse as parseJalali, formatISO } from 'date-fns-jalali';
import { PlusIcon, XMarkIcon, ArchiveBoxIcon, ArchiveBoxXMarkIcon, HomeIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/ui/button';
import { useAuth } from '@/app/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function TermsList() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [newTermName, setNewTermName] = useState('');
  const [newTermCode, setNewTermCode] = useState('');
  const [newStartDate, setNewStartDate] = useState(''); // store Jalali string (YYYY/MM/DD)
  const [newEndDate, setNewEndDate] = useState(''); // Jalali string
  const [newIsPublished, setNewIsPublished] = useState(true);
  const [newIsArchived, setNewIsArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Fetch terms on component mount
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadTerms();
  }, [user, router]);

  async function loadTerms() {
    try {
      setError(null);
      const data = await getTerms();
      
      // Debug the API response
      console.log('API Response:', data);
      
      if (!Array.isArray(data)) {
        console.error('Expected array, got:', typeof data, data);
        setError('Invalid data format received');
        setTerms([]);
        return;
      }
      
      setTerms(data);
    } catch (err) {
      console.error('Error loading terms:', err);
      setError(err instanceof Error ? err.message : 'Failed to load terms');
      setTerms([]); // Ensure terms is always an array
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate required fields
    const errors: string[] = [];
    if (!newTermName.trim()) errors.push('Name is required');
    if (!newTermCode.trim()) errors.push('Code is required');
    if (!newStartDate) errors.push('Start date is required');
    if (!newEndDate) errors.push('End date is required');
    
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    setAdding(true);
    setError(null);

    try {
      // Convert Jalali inputs to ISO format using date-fns-jalali
      let startDate: string | undefined = undefined;
      let endDate: string | undefined = undefined;

      if (newStartDate) {
        try {
          // Parse Jalali date string (e.g., "1403/06/11") and convert to JavaScript Date
          const date = parseJalali(newStartDate, 'yyyy/MM/dd', new Date());
          // Format as ISO date (YYYY-MM-DD)
          startDate = formatISO(date, { representation: 'date' });
        } catch (e) {
          throw new Error('Invalid start date format. Use YYYY/MM/DD');
        }
      }

      if (newEndDate) {
        try {
          const date = parseJalali(newEndDate, 'yyyy/MM/dd', new Date());
          endDate = formatISO(date, { representation: 'date' });
        } catch (e) {
          throw new Error('Invalid end date format. Use YYYY/MM/DD');
        }
      }

      // Add console.log to verify conversion
      console.log('Converting dates:', {
        startJalali: newStartDate,
        startISO: startDate,
        endJalali: newEndDate,
        endISO: endDate
      });

      const payload: CreateTermPayload = {
        name: newTermName.trim(),
        code: newTermCode.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        is_published: newIsPublished,
        is_archived: newIsArchived,
      };

      const newTerm = await createTerm(payload);
      setTerms(prev => [...prev, newTerm]);
      setNewTermName('');
      setNewTermCode('');
      setNewStartDate('');
      setNewEndDate('');
      setNewIsPublished(true);
      setNewIsArchived(false);
    } catch (err: any) {
      // Show backend error message if available
      const errorMessage = err.message || 
                         (err.response?.data?.detail) || 
                         (err.response?.data?.message) ||
                         'Failed to add term';
      setError(errorMessage);
      console.error('Add term error:', err);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this term?')) return;

    setError(null);
    try {
      await deleteTerm(id);
      setTerms(prev => prev.filter(term => term.id !== id));
    } catch (err) {
      setError('Failed to delete term');
      console.error(err);
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading terms...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <HomeIcon className="h-5 w-5" />
          <span>بازگشت به صفحه اصلی</span>
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            value={newTermName}
            onChange={(e) => setNewTermName(e.target.value)}
            placeholder="Name (e.g. پاییز ۱۴۰۳)"
            className="col-span-1 md:col-span-2 rounded-lg border border-gray-200 py-2 px-4"
            disabled={adding}
            required
          />

          <input
            type="text"
            value={newTermCode}
            onChange={(e) => setNewTermCode(e.target.value)}
            placeholder="Code (e.g. 1403-FA)"
            className="rounded-lg border border-gray-200 py-2 px-4"
            disabled={adding}
          />

          <JalaliDatePicker
            value={newStartDate}
            onChange={setNewStartDate}
            disabled={adding}
            placeholder="Start date (Jalali YYYY/MM/DD)"
          />

          <JalaliDatePicker
            value={newEndDate}
            onChange={setNewEndDate}
            disabled={adding}
            placeholder="End date (Jalali YYYY/MM/DD)"
          />

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={newIsPublished} onChange={(e) => setNewIsPublished(e.target.checked)} />
            <span className="text-sm">Published</span>
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={newIsArchived} onChange={(e) => setNewIsArchived(e.target.checked)} />
            <span className="text-sm">Archived</span>
          </label>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={adding || !newTermName.trim()}>
            {adding ? 'Adding...' : (
              <>
                <PlusIcon className="h-5 w-5 mr-1" />
                Add Term
              </>
            )}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {terms.map(term => (
          <div
            key={term.id}
            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300"
          >
            <div className="flex items-center">
              <span>{term.name}</span>
              {term.is_archived && (
                <span className="ml-2 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">Archived</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await toggleTermArchive(term.id, !term.is_archived);
                    const updatedTerms = await getTerms();
                    setTerms(updatedTerms);
                  } catch (err) {
                    console.error(err);
                    setError('Failed to update term archive status');
                  }
                }}
                className="p-1 hover:bg-gray-100 rounded"
                title={term.is_archived ? "Unarchive term" : "Archive term"}
              >
                {term.is_archived ? (
                  <ArchiveBoxXMarkIcon className="h-5 w-5 text-gray-500 hover:text-blue-600" />
                ) : (
                  <ArchiveBoxIcon className="h-5 w-5 text-gray-500 hover:text-blue-600" />
                )}
              </button>
              <button
                onClick={() => handleDelete(term.id)}
                className="p-1 hover:bg-gray-100 rounded"
                title="Delete term"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500 hover:text-red-600" />
              </button>
            </div>
          </div>
        ))}

        {terms.length === 0 && !error && (
          <p className="text-center text-gray-500 py-4">
            No terms added yet. Add your first term above.
          </p>
        )}
      </div>
    </div>
  );
}