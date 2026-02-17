'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import { DataTable } from '@/components/layout/DataTable';

interface PaymentRow {
  id: number;
  sale_id: number;
  amount: number;
  payment_method?: string | null;
  cashier?: string | null;
  payment_date: string;
}

interface ExpenseRow {
  id: number;
  description: string;
  amount: number;
  category: string;
  recorded_by?: string | null;
}

interface CashbookData {
  unit: { id: number; code: string; name: string };
  date: string;
  payments_total: number;
  expenses_total: number;
  net_cash: number;
  payments: PaymentRow[];
  expenses: ExpenseRow[];
  close: {
    date: string;
    expected_cash: number;
    actual_cash: number;
    variance: number;
    closed_by?: string | null;
    created_at: string;
  } | null;
}

export default function ShopCashbookPage() {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<CashbookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actualCash, setActualCash] = useState<string>('');
  const [savingClose, setSavingClose] = useState(false);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);

  const fetchCashbook = async () => {
    setLoading(true);
    setError(null);
    setCloseMessage(null);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/finance/shop-cashbook/`,
        {
          params: { date },
          withCredentials: true,
        }
      );
      setData(res.data);
      if (res.data.close) {
        setActualCash(String(res.data.close.actual_cash));
      } else {
        setActualCash('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load cashbook.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashbook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleSaveClose = async () => {
    if (!actualCash.trim()) {
      setCloseMessage('Enter the actual cash counted.');
      return;
    }
    setSavingClose(true);
    setCloseMessage(null);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/finance/shop-cash-close/`,
        { date, actual_cash: parseFloat(actualCash) },
        { withCredentials: true }
      );
      setCloseMessage(`Cash close saved. Variance: ${res.data.variance.toLocaleString()} TZS`);
      fetchCashbook();
    } catch (err: any) {
      setCloseMessage(err.response?.data?.error || 'Failed to save cash close.');
    } finally {
      setSavingClose(false);
    }
  };

  const payments = data?.payments || [];
  const expenses = data?.expenses || [];

  return (
    <div className="space-y-6 text-sm">
      <PageHeader
        title="Shop cashbook"
        subtitle="Daily cash in/out and end-of-day reconciliation for the shop unit."
      />

      <ContentCard
        title="Filters"
        subtitle="Pick a date to review cash activity and close the day."
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-onyango w-auto min-w-[160px]"
          />
          {error && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      </ContentCard>

      <ContentCard
        title="Summary"
        subtitle={
          loading
            ? 'Loading…'
            : data
            ? `For ${new Date(data.date).toLocaleDateString()}`
            : 'No data'
        }
      >
        {data ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-emerald-50 p-4 text-sm dark:bg-emerald-500/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Payments in
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {data.payments_total.toLocaleString()} TZS
              </p>
              <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-200/80">
                Includes sales and loan repayments for Shop.
              </p>
            </div>
            <div className="rounded-xl bg-rose-50 p-4 text-sm dark:bg-rose-500/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                Expenses out
              </p>
              <p className="mt-1 text-2xl font-bold text-rose-900 dark:text-rose-100">
                {data.expenses_total.toLocaleString()} TZS
              </p>
              <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-200/80">
                Only expenses recorded under the Shop unit.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-700/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                Net cash (expected)
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {data.net_cash.toLocaleString()} TZS
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Payments – expenses for this day.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No cashbook data for this date.
          </p>
        )}
      </ContentCard>

      {/* Cash close */}
      <ContentCard title="End-of-day cash close" subtitle="Record the actual cash counted and compare with system expected.">
        {data ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Expected cash from system:{" "}
              <span className="font-semibold">
                {data.net_cash.toLocaleString()} TZS
              </span>
            </p>
            {data.close && (
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Last close: {new Date(data.close.created_at).toLocaleString()} by{" "}
                <span className="font-semibold">
                  {data.close.closed_by || 'Unknown'}
                </span>
                , variance{" "}
                <span
                  className={
                    data.close.variance === 0
                      ? 'font-semibold text-emerald-600'
                      : data.close.variance > 0
                      ? 'font-semibold text-amber-600'
                      : 'font-semibold text-rose-600'
                  }
                >
                  {data.close.variance.toLocaleString()} TZS
                </span>
              </p>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                  Actual cash counted (TZS)
                </label>
                <input
                  type="number"
                  min={0}
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="input-onyango w-40"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveClose}
                disabled={savingClose}
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {savingClose ? 'Saving…' : 'Save cash close'}
              </button>
            </div>
            {closeMessage && (
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{closeMessage}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Load a date with cash activity first.
          </p>
        )}
      </ContentCard>

      {/* Detailed tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ContentCard
          title="Payments"
          subtitle={payments.length ? `${payments.length} payment(s)` : 'No payments'}
        >
          {payments.length ? (
            <DataTable>
              <thead>
                <tr>
                  <th>Sale</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Cashier</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.sale_id}</td>
                    <td>{p.amount.toLocaleString()} TZS</td>
                    <td>{p.payment_method || '—'}</td>
                    <td>{p.cashier || '—'}</td>
                    <td>{new Date(p.payment_date).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">No payments for this day.</p>
          )}
        </ContentCard>

        <ContentCard
          title="Expenses"
          subtitle={expenses.length ? `${expenses.length} expense(s)` : 'No expenses'}
        >
          {expenses.length ? (
            <DataTable>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.description}</td>
                    <td>{e.category}</td>
                    <td>{e.amount.toLocaleString()} TZS</td>
                    <td>{e.recorded_by || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">No expenses for this day.</p>
          )}
        </ContentCard>
      </div>
    </div>
  );
}

