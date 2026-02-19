'use client';

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Calendar, Download, RefreshCw, TrendingUp, ShoppingCart, Banknote, Receipt, Tag, Wallet } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

function formatTZS(value: number): string {
  return Number(value).toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
        <p className="mb-2 font-semibold text-gray-800 dark:text-white">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">{entry.name}</span>
            <span className="font-medium tabular-nums" style={{ color: entry.color }}>
              TZS {formatTZS(Number(entry.value || 0))}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const { name, value, percent, fill } = payload[0];
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
        <p className="font-semibold text-gray-800 dark:text-white">{name}</p>
        <p className="text-gray-600 dark:text-gray-400">TZS {formatTZS(Number(value || 0))}</p>
        <p style={{ color: fill }}>{(percent * 100).toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export default function ReportPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate.trim();
      if (endDate) params.end_date = endDate.trim();
      const res = await axios.get(`${API_BASE}/api/reports/sales/`, {
        params,
        withCredentials: true,
      });
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to fetch report.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const isValidRange = startDate && endDate && endDate >= startDate;

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <html><head><title>Sales Report</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:24px;color:#111;}
        .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px;}
        .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;}
        .card label{font-size:12px;color:#6b7280;}
        .card .val{font-size:18px;font-weight:700;}
        table{width:100%;border-collapse:collapse;}
        th,td{border:1px solid #e5e7eb;padding:10px 12px;text-align:left;}
        th{background:#f3f4f6;}
        td.nums{text-align:right;}
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const barData = (data?.chart?.dates || []).map((date: string, i: number) => ({
    date: date.slice(5),
    Sales: data.chart.sales?.[i] ?? 0,
    Expenses: data.chart.expenses?.[i] ?? 0,
    Discounts: data.chart.discounts?.[i] ?? 0,
    Refunds: data.chart.refunds?.[i] ?? 0,
    Loans: data.chart.loans?.[i] ?? 0,
  }));

  const pieData = data
    ? [
        { name: 'Sales (net)', value: Math.max(0, (data.total_sales ?? 0) - (data.total_refunds ?? 0)) },
        { name: 'Expenses', value: data.total_expenses ?? 0 },
        { name: 'Discounts', value: data.total_discounts ?? 0 },
        { name: 'Refunds', value: data.total_refunds ?? 0 },
        { name: 'Loans (unpaid)', value: data.total_loans ?? 0 },
      ].filter((d) => d.value > 0)
    : [];

  const profit = data?.profit ?? 0;
  const isProfitPositive = Number(profit) >= 0;

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6" ref={printRef}>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              Sales Report
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Revenue, expenses, discounts, refunds and profit by date range
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60 sm:p-5">
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">End</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <button
              onClick={fetchReport}
              disabled={!isValidRange || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading…' : 'Apply'}
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || !data}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/80"
            >
              <Download className="h-4 w-4" />
              Download / Print
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-gray-900/60">
            <span className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Loading report…
            </span>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              <SummaryCard
                label="Sales"
                value={data.total_sales ?? 0}
                icon={TrendingUp}
                sub="paid"
              />
              <SummaryCard label="Orders" value={data.sales_count ?? 0} icon={ShoppingCart} isCount />
              <SummaryCard label="Expenses" value={data.total_expenses ?? 0} icon={Banknote} />
              <SummaryCard label="Discounts" value={data.total_discounts ?? 0} icon={Tag} />
              <SummaryCard label="Refunds" value={data.total_refunds ?? 0} icon={Receipt} />
              <SummaryCard label="Loans" value={data.total_loans ?? 0} icon={Wallet} sub="unpaid" />
              <SummaryCard
                label="Profit"
                value={data.profit ?? 0}
                icon={TrendingUp}
                positive={isProfitPositive}
              />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60 lg:col-span-2">
                <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700/80">
                  <span className="h-8 w-1 shrink-0 rounded-full bg-brand-500" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Sales overview</h2>
                </div>
                <div className="p-4 sm:p-5">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={barData} barCategoryGap={12} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-gray-500" />
                      <YAxis tick={{ fontSize: 11 }} className="text-gray-500" tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar dataKey="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Discounts" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Refunds" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Loans" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700/80">
                  <span className="h-8 w-1 shrink-0 rounded-full bg-brand-500" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Breakdown</h2>
                </div>
                <div className="p-4">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[280px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                      No data to show
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {!loading && data && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Profit = Gross margin (revenue − cost) − Discount − Refunds − Expenses − Unpaid (loans). Refunded sales are excluded.
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  sub,
  isCount,
  positive,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
  isCount?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {label}
            {sub && <span className="ml-0.5 text-gray-400">({sub})</span>}
          </p>
          <p
            className={`mt-1 text-lg font-bold tabular-nums sm:text-xl ${
              positive === true
                ? 'text-emerald-600 dark:text-emerald-400'
                : positive === false
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-white'
            }`}
          >
            {isCount ? value.toLocaleString() : `TZS ${formatTZS(value)}`}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
