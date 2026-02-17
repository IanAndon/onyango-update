'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import { DataTable } from '@/components/layout/DataTable';
import { ArrowLeft, Wrench, Banknote, Truck, Receipt } from 'lucide-react';

interface PaymentInRow {
  id: number;
  job_id: number;
  amount: number;
  payment_method?: string | null;
  cashier?: string | null;
  payment_date: string;
}

interface PaymentOutRow {
  id: number;
  transfer_id: number;
  amount: number;
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

interface WorkshopCashbookData {
  unit: { id: number; code: string; name: string };
  date: string;
  payments_in_total: number;
  payments_out_materials_total: number;
  expenses_total: number;
  net_cash: number;
  payments_in: PaymentInRow[];
  payments_out_materials: PaymentOutRow[];
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

export default function WorkshopCashbookPage() {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<WorkshopCashbookData | null>(null);
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
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/finance/workshop-cashbook/`,
        { params: { date }, withCredentials: true }
      );
      setData(res.data);
      if (res.data.close) {
        setActualCash(String(res.data.close.actual_cash));
      } else {
        setActualCash('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load workshop cashbook.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashbook();
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
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/finance/workshop-cash-close/`,
        { date, actual_cash: parseFloat(actualCash) },
        { withCredentials: true }
      );
      setCloseMessage(`Cash close saved. Variance: ${Number(res.data.variance).toLocaleString()} TZS`);
      fetchCashbook();
    } catch (err: any) {
      setCloseMessage(err.response?.data?.error || 'Failed to save cash close.');
    } finally {
      setSavingClose(false);
    }
  };

  const paymentsIn = data?.payments_in || [];
  const paymentsOut = data?.payments_out_materials || [];
  const expenses = data?.expenses || [];

  return (
    <div className="space-y-6 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/onyango/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <PageHeader
            title="Workshop cashbook"
            subtitle="Daily repair income, material payments to shop, and expenses for the workshop."
          />
        </div>
        <Link
          href="/expenses/add"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Receipt className="h-4 w-4" /> Add expense
        </Link>
      </div>

      <ContentCard title="Filters" subtitle="Pick a date to review cash activity and close the day.">
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
          loading ? 'Loading…' : data ? `For ${new Date(data.date).toLocaleDateString()}` : 'No data'
        }
      >
        {data ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-emerald-50 p-4 text-sm dark:bg-emerald-500/10">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                <Banknote className="h-3.5 w-3.5" /> Repair payments in
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {data.payments_in_total.toLocaleString()} TZS
              </p>
              <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-200/80">
                Customer payments for repair jobs today.
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-sm dark:bg-amber-500/10">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                <Truck className="h-3.5 w-3.5" /> Materials paid to shop
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">
                {data.payments_out_materials_total.toLocaleString()} TZS
              </p>
              <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-200/80">
                Paid to shop for materials (transfer settlements).
              </p>
            </div>
            <div className="rounded-xl bg-rose-50 p-4 text-sm dark:bg-rose-500/10">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                <Receipt className="h-3.5 w-3.5" /> Expenses out
              </p>
              <p className="mt-1 text-2xl font-bold text-rose-900 dark:text-rose-100">
                {data.expenses_total.toLocaleString()} TZS
              </p>
              <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-200/80">
                Workshop unit expenses today.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-700/40">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                <Wrench className="h-3.5 w-3.5" /> Net cash (expected)
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {data.net_cash.toLocaleString()} TZS
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Repair in − materials out − expenses.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No cashbook data for this date.</p>
        )}
      </ContentCard>

      <ContentCard
        title="End-of-day cash close"
        subtitle="Record the actual cash counted and compare with system expected."
      >
        {data ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Expected cash from system:{' '}
              <span className="font-semibold">{data.net_cash.toLocaleString()} TZS</span>
            </p>
            {data.close && (
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Last close: {new Date(data.close.created_at).toLocaleString()} by{' '}
                <span className="font-semibold">{data.close.closed_by || 'Unknown'}</span>, variance{' '}
                <span
                  className={
                    data.close.variance === 0
                      ? 'font-semibold text-emerald-600'
                      : data.close.variance > 0
                        ? 'font-semibold text-amber-600'
                        : 'font-semibold text-rose-600'
                  }
                >
                  {Number(data.close.variance).toLocaleString()} TZS
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
          <p className="text-xs text-gray-500 dark:text-gray-400">Load a date with cash activity first.</p>
        )}
      </ContentCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ContentCard
          title="Repair payments in"
          subtitle={paymentsIn.length ? `${paymentsIn.length} payment(s)` : 'No payments'}
        >
          {paymentsIn.length ? (
            <DataTable>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Cashier</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {paymentsIn.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/onyango/repair-jobs/${p.job_id}`}
                        className="text-brand-600 hover:underline dark:text-brand-400"
                      >
                        #{p.job_id}
                      </Link>
                    </td>
                    <td>{p.amount.toLocaleString()} TZS</td>
                    <td>{p.payment_method || '—'}</td>
                    <td>{p.cashier || '—'}</td>
                    <td>{new Date(p.payment_date).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">No repair payments for this day.</p>
          )}
        </ContentCard>

        <ContentCard
          title="Materials paid to shop"
          subtitle={paymentsOut.length ? `${paymentsOut.length} payment(s)` : 'No payments'}
        >
          {paymentsOut.length ? (
            <DataTable>
              <thead>
                <tr>
                  <th>Transfer</th>
                  <th>Amount</th>
                  <th>Cashier</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {paymentsOut.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href="/onyango/transfers"
                        className="text-brand-600 hover:underline dark:text-brand-400"
                      >
                        #{p.transfer_id}
                      </Link>
                    </td>
                    <td>{p.amount.toLocaleString()} TZS</td>
                    <td>{p.cashier || '—'}</td>
                    <td>{new Date(p.payment_date).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">No material payments for this day.</p>
          )}
        </ContentCard>
      </div>

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
  );
}
