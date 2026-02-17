'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Plus, Search, Receipt, Calendar, User, Building2, Filter } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';

interface Unit {
  id: number;
  code: string;
  name: string;
}

interface RecordedBy {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

interface ExpenseItem {
  id: number;
  amount: number;
  date: string;
  category: string;
  description: string;
  unit_name?: string;
  recorded_by?: RecordedBy | null;
  updated_at?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent',
  electricity: 'Electricity',
  salary: 'Salary',
  inventory: 'Inventory Refill',
  misc: 'Miscellaneous',
};

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatRecordedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitFilter, setUnitFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState(getTodayDateString());

  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager';

  useEffect(() => {
    if (isAdmin) {
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/onyango/units/`, { withCredentials: true })
        .then((r) => setUnits(r.data || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { start_date: startDate, end_date: endDate };
      if (isAdmin && unitFilter) params.unit = unitFilter;
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/expenses/`,
        { params, withCredentials: true }
      );
      const rawList = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
      const formatted = rawList.map((item: any) => ({
        id: item.id,
        amount: parseFloat(item.amount),
        date: item.date,
        category: item.category,
        description: item.description,
        unit_name: item.unit_name,
        recorded_by: item.recorded_by ?? null,
        updated_at: item.updated_at ?? null,
      }));
      formatted.sort((a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(formatted);
    } catch (err) {
      setError('Failed to load expenses.');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [startDate, endDate, unitFilter]);

  const filteredExpenses = expenses.filter((exp) => {
    const categoryLabel = CATEGORY_LABELS[exp.category] || exp.category;
    return (
      categoryLabel.toLowerCase().includes(search.toLowerCase()) ||
      exp.description.toLowerCase().includes(search.toLowerCase())
    );
  });

  const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const unitContextLabel = !isAdmin && user?.unit_name
    ? `${user.unit_name} expenses`
    : 'Expenses';

  const displayName = (r: RecordedBy | null | undefined) => {
    if (!r) return '—';
    if (r.first_name || r.last_name) return [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
    return r.username || '—';
  };

  return (
    <div className="min-h-screen bg-gray-50/80 dark:bg-gray-950/80">
      <div className="mx-auto max-w-[1600px] w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <PageHeader
                title={unitContextLabel}
                subtitle={isAdmin ? 'Track and filter expense records by date and unit.' : `Track ${user?.unit_name ?? 'your unit'} expense records by date and category.`}
              />
            </div>
          </div>
          <Link
            href="/expenses/add"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </Link>
        </div>

        {/* Summary + Filters card */}
        <ContentCard
          title=""
          subtitle=""
          noPadding
        >
          <div className="p-6">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by description or category..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
                />
              </div>
              {isAdmin && units.length > 0 && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <select
                    value={unitFilter}
                    onChange={(e) => setUnitFilter(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 min-w-[160px]"
                  >
                    <option value="">All units</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
                />
              </div>
            </div>

            {error && (
              <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </p>
            )}

            {/* Summary strip */}
            <div className="mb-6 flex flex-wrap items-center gap-6 rounded-xl bg-gray-100/80 px-5 py-4 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {loading ? 'Loading…' : `${filteredExpenses.length} record(s)`}
                </span>
              </div>
              {filteredExpenses.length > 0 && (
                <div className="border-l border-gray-300 pl-6 dark:border-gray-600">
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Total</span>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TZS
                  </p>
                </div>
              )}
            </div>
          </div>
        </ContentCard>

        {/* Table card */}
        <ContentCard
          title="Expense records"
          subtitle={loading ? 'Loading…' : ''}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">Description</th>
                  <th className="pb-3 pr-4 font-semibold text-gray-700 dark:text-gray-300 text-right whitespace-nowrap">Amount (TZS)</th>
                  <th className="pb-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                  {isAdmin && (
                    <th className="pb-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">Unit</th>
                  )}
                  <th className="pb-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  <th className="pb-3 font-semibold text-gray-700 dark:text-gray-300">Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((exp) => (
                    <tr
                      key={exp.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="py-4 pr-4 font-medium text-gray-900 dark:text-white">
                        {exp.description}
                      </td>
                      <td className="py-4 pr-4 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                        {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 pr-4">
                        <span className="inline-flex items-center rounded-lg bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          {CATEGORY_LABELS[exp.category] || exp.category}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-4 pr-4 text-gray-600 dark:text-gray-400">
                          {exp.unit_name || '—'}
                        </td>
                      )}
                      <td className="py-4 pr-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(exp.date)}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                            <User className="h-3.5 w-3.5 text-gray-400" />
                            {displayName(exp.recorded_by)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatRecordedAt(exp.updated_at)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={isAdmin ? 6 : 5}
                      className="py-12 text-center text-gray-500 dark:text-gray-400"
                    >
                      {loading ? 'Loading…' : 'No matching expenses found.'}
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredExpenses.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50/80 font-semibold dark:border-gray-700 dark:bg-gray-800/40">
                    <td className="py-3 pr-4" colSpan={2}>Total</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-gray-900 dark:text-white">
                      {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td colSpan={isAdmin ? 3 : 2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </ContentCard>
      </div>
    </div>
  );
}
