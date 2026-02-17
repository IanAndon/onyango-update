'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import { DataTable } from '@/components/layout/DataTable';

interface Customer {
  id: number;
  name: string;
  phone_number?: string;
  email?: string;
}

interface StatementSummary {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  sale_count: number;
}

interface StatementSale {
  id: number;
  date: string;
  sale_type: string;
  status: string;
  payment_status: string;
  final_amount: number;
  paid_amount: number;
  outstanding: number;
}

interface StatementResponse {
  customer: {
    id: number;
    name: string;
    phone: string;
    email?: string;
  };
  summary: StatementSummary;
  sales: StatementSale[];
}

export default function CustomerStatementPage() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(todayStr);

  const [data, setData] = useState<StatementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/customers/`,
          { withCredentials: true }
        );
        const formatted = res.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          phone_number: item.phone_number ?? item.phone ?? '',
          email: item.email || '',
        }));
        setCustomers(formatted);
      } catch (err) {
        console.error('Failed to load customers', err);
      }
    };
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone_number || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  const fetchStatement = async () => {
    if (!selectedCustomerId) {
      setError('Select a customer first.');
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const params: Record<string, string> = { customer_id: String(selectedCustomerId) };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await axios.get<StatementResponse>(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/reports/customer-statement/`,
        { params, withCredentials: true }
      );
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load statement.');
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary;
  const sales = data?.sales || [];

  return (
    <div className="space-y-6 text-sm">
      <PageHeader
        title="Customer statement (Shop)"
        subtitle="Per-customer sales, payments, and outstanding balances for the shop."
      />

      <ContentCard title="Filters" subtitle="Choose a customer and date range, then load statement.">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Search customer
            </label>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="input-onyango w-64"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Customer
            </label>
            <select
              className="input-onyango w-64"
              value={selectedCustomerId ?? ''}
              onChange={(e) =>
                setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">— Select customer —</option>
              {filteredCustomers.slice(0, 50).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone_number ? ` • ${c.phone_number}` : ''}
                </option>
              ))}
              {filteredCustomers.length > 50 && (
                <option disabled>… and more (narrow search)</option>
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-onyango w-40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-onyango w-40"
            />
          </div>

          <button
            type="button"
            onClick={fetchStatement}
            disabled={loading}
            className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load statement'}
          </button>

          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      </ContentCard>

      {data && summary && (
        <ContentCard
          title={`Summary for ${data.customer.name}`}
          subtitle={`Total ${summary.sale_count} sale(s) · From ${
            startDate || 'start'
          } to ${endDate || todayStr}`}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Total invoiced
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {summary.total_invoiced.toLocaleString()} TZS
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-700/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
                Total paid
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-900 dark:text-emerald-100">
                {summary.total_paid.toLocaleString()} TZS
              </p>
            </div>
            <div className="rounded-xl bg-rose-50 p-4 dark:bg-rose-700/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-200">
                Outstanding
              </p>
              <p className="mt-1 text-xl font-bold text-rose-900 dark:text-rose-100">
                {summary.total_outstanding.toLocaleString()} TZS
              </p>
            </div>
          </div>
        </ContentCard>
      )}

      <ContentCard
        title="Sales and balances"
        subtitle={sales.length ? `${sales.length} sale(s)` : 'No sales found for this filter.'}
      >
        {sales.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Type</th>
                <th>Status</th>
                <th>Payment status</th>
                <th className="text-right">Invoiced</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td>#{s.id}</td>
                  <td>{new Date(s.date).toLocaleDateString()}</td>
                  <td className="capitalize">{s.sale_type}</td>
                  <td className="capitalize">{s.status}</td>
                  <td className="capitalize">{s.payment_status}</td>
                  <td className="text-right">
                    {s.final_amount.toLocaleString()} TZS
                  </td>
                  <td className="text-right">
                    {s.paid_amount.toLocaleString()} TZS
                  </td>
                  <td className="text-right">
                    {s.outstanding.toLocaleString()} TZS
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No sales for this customer and date range.
          </p>
        )}
      </ContentCard>
    </div>
  );
}

