'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BoxIconLine, DollarLineIcon } from '@/icons';
import PageHeader from '@/components/layout/PageHeader';
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

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#a855f7'];

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="p-3 rounded-lg border bg-white dark:bg-[#111] text-sm shadow-md dark:shadow-black">
        <p className="font-semibold text-gray-800 dark:text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between gap-4 mb-1">
            <span className="text-gray-600 dark:text-gray-300">{entry.name}</span>
            <span className="font-semibold" style={{ color: entry.color }}>
              TZS {Number(entry.value || 0).toLocaleString()}
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
      <div className="p-3 rounded-lg border bg-white dark:bg-[#111] text-sm shadow-md dark:shadow-black">
        <p className="font-semibold text-gray-800 dark:text-white mb-1">{name}</p>
        <p className="text-gray-600 dark:text-gray-300">
          TZS {Number(value || 0).toLocaleString()}
        </p>
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

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate.trim();
      if (endDate) params.end_date = endDate.trim();

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/reports/sales/`,
        { params, withCredentials: true }
      );

      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch report.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const summaryCards = [
    { label: "Sales", value: data?.total_sales || 0, icon: BoxIconLine },
    { label: "Orders", value: data?.sales_count || 0, icon: BoxIconLine },
    { label: "Expenses", value: data?.total_expenses || 0, icon: DollarLineIcon },
    { label: "Discounts", value: data?.total_discounts || 0, icon: DollarLineIcon },
    { label: "Profit", value: data?.profit || 0, icon: DollarLineIcon },
    { label: "Loans", value: data?.total_loans || 0, icon: DollarLineIcon },
  ];

  // Pie chart data: added Loans
  const pieData = [
    { name: 'Discounts', value: data?.total_discounts || 0 },
    { name: 'Profit', value: data?.profit || 0 },
    { name: 'Expenses', value: data?.total_expenses || 0 },
    { name: 'Loans', value: data?.total_loans || 0 },
  ];

  // Bar chart data: added Loans per day
  const barData = (data?.chart?.dates || []).map((date: string, i: number) => ({
    date,
    Sales: data.chart.sales?.[i] || 0,
    Expenses: data.chart.expenses?.[i] || 0,
    Discounts: data.chart.discounts?.[i] || 0,
    Loans: data.chart.loans?.[i] || 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales report"
        subtitle="Revenue, expenses, discounts and loans by date range."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-onyango w-auto min-w-[140px]"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-onyango w-auto min-w-[140px]"
            />
            <button
              onClick={fetchReport}
              className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              Apply
            </button>
          </div>
        }
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
          Loading report…
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-error-50 px-4 py-3 text-error-700 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaryCards.map((card) => (
              <SummaryCard key={card.label} card={card} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="col-span-2 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="h-8 w-1 shrink-0 rounded-full bg-brand-500" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Sales overview</h2>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={barData} barCategoryGap={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#a0a0a0', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#a0a0a0', fontSize: 12 }} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="Sales" fill="#3b82f6" barSize={10} radius={[5, 5, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#ef4444" barSize={10} radius={[5, 5, 0, 0]} />
                  <Bar dataKey="Discounts" fill="#8b5cf6" barSize={10} radius={[5, 5, 0, 0]} />
                  <Bar dataKey="Loans" fill="#10b981" barSize={10} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="h-8 w-1 shrink-0 rounded-full bg-brand-500" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Summary breakdown</h2>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ card }: { card: any }) {
  const Icon = card.icon;
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
            TZS {Number(card.value).toLocaleString()}
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
