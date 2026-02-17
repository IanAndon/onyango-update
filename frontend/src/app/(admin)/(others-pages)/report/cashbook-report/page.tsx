'use client';

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import { DataTable } from '@/components/layout/DataTable';
import { BookOpen } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CashCloseRow {
  id: number;
  date: string;
  unit: { id: number; code: string; name: string };
  expected_cash: number;
  actual_cash: number;
  variance: number;
  closed_by: string | null;
  created_at: string;
}

export default function CashbookReportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState<string>(firstOfMonth);
  const [dateTo, setDateTo] = useState<string>(today);
  const [unit, setUnit] = useState<string>('');
  const [results, setResults] = useState<CashCloseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/admin/cashbook-report/', API_BASE);
      if (dateFrom) url.searchParams.set('date_from', dateFrom);
      if (dateTo) url.searchParams.set('date_to', dateTo);
      if (unit) url.searchParams.set('unit', unit);

      const res = await axios.get(url.toString(), { withCredentials: true });
      setResults(res.data.results ?? []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load cashbook report.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, unit]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className="space-y-6 text-sm">
      <PageHeader
        title="Cashbook report"
        subtitle="Browse daily cash closes from Shop and Workshop with date and unit filters."
      />

      <ContentCard title="Filters" subtitle="Set date range and unit to see closed cashbooks.">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">From date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-onyango w-auto min-w-[160px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">To date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-onyango w-auto min-w-[160px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="input-onyango w-auto min-w-[140px]"
            >
              <option value="">All units</option>
              <option value="shop">Shop</option>
              <option value="workshop">Workshop</option>
            </select>
          </div>
          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Apply'}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        )}
      </ContentCard>

      <ContentCard
        title="Closed cashbooks"
        subtitle={
          loading
            ? 'Loading…'
            : results.length
              ? `${results.length} close(s) in range`
              : 'No cash closes found for the selected filters.'
        }
      >
        {results.length > 0 ? (
          <DataTable>
            <thead>
              <tr>
                <th>Date</th>
                <th>Unit</th>
                <th>Expected (TZS)</th>
                <th>Actual (TZS)</th>
                <th>Variance (TZS)</th>
                <th>Closed by</th>
                <th>Closed at</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.date).toLocaleDateString()}</td>
                  <td>
                    <span className="font-medium text-gray-900 dark:text-white">{row.unit.name}</span>
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({row.unit.code})</span>
                  </td>
                  <td>{row.expected_cash.toLocaleString()}</td>
                  <td>{row.actual_cash.toLocaleString()}</td>
                  <td>
                    <span
                      className={
                        row.variance === 0
                          ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                          : row.variance > 0
                            ? 'font-semibold text-amber-600 dark:text-amber-400'
                            : 'font-semibold text-rose-600 dark:text-rose-400'
                      }
                    >
                      {row.variance >= 0 ? '+' : ''}
                      {row.variance.toLocaleString()}
                    </span>
                  </td>
                  <td>{row.closed_by ?? '—'}</td>
                  <td className="text-gray-600 dark:text-gray-400">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <BookOpen className="mb-2 h-10 w-10 opacity-50" />
              <p>No closed cashbooks in this range. Try a wider date range or another unit.</p>
            </div>
          )
        )}
      </ContentCard>
    </div>
  );
}
