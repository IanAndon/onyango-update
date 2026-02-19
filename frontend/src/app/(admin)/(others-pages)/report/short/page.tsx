"use client";

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Calendar, Download, RefreshCw } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function formatTZS(value: number): string {
  return Number(value).toLocaleString("en-TZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function ShortReportPage() {
  const [report, setReport] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start", startDate);
      if (endDate) params.append("end", endDate);
      const url = `${API_BASE}/api/reports/short/` + (params.toString() ? `?${params.toString()}` : "");
      const res = await axios.get(url, { withCredentials: true });
      setReport(res.data.report || []);
      setTotals(res.data.totals || null);
      if (!startDate && res.data.start_date) setStartDate(res.data.start_date);
      if (!endDate && res.data.end_date) setEndDate(res.data.end_date);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Failed to load report");
      setReport([]);
      setTotals(null);
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
    const win = window.open("", "", "width=900,height=650");
    if (!win) return;
    win.document.write(`
      <html><head><title>Sales Short Report</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:20px;color:#111;}
        table{width:100%;border-collapse:collapse;margin-top:1rem;}
        th,td{border:1px solid #e5e7eb;padding:10px 12px;text-align:left;}
        th{background:#f3f4f6;font-weight:600;}
        td.nums{text-align:right;}
        tr.total{background:#eff6ff;font-weight:700;}
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div className="min-h-screen bg-gray-50/80 dark:bg-gray-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              Sales Short Report
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Daily summary: sales, discounts, refunds, expenses, loans and profit
            </p>
          </div>
        </div>

        {/* Filters card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60 sm:p-5">
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">End</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
              />
            </div>
            <button
              onClick={fetchReport}
              disabled={!isValidRange || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading…" : "Apply"}
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || report.length === 0}
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

        {/* Table card */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm" ref={printRef}>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/80">
                  <th className="px-4 py-3.5 text-left font-semibold text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="px-4 py-3.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                    Sales
                  </th>
                  <th className="px-4 py-3.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                    Discount
                  </th>
                  <th className="px-4 py-3.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                    Refunds
                  </th>
                  <th className="px-4 py-3.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                    Expenses
                  </th>
                  <th className="px-4 py-3.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                    Loans
                  </th>
                  <th className="px-4 py-3.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                    Profit
                  </th>
                  <th className="px-4 py-3.5 text-center font-semibold text-gray-700 dark:text-gray-300">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {report.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                    >
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Loading…
                        </span>
                      ) : (
                        "No sales data for this date range."
                      )}
                    </td>
                  </tr>
                ) : (
                  <>
                    {report.map(
                      ({
                        date,
                        total_sales,
                        total_discount,
                        total_refunds,
                        total_expenses,
                        loans,
                        profit,
                        sales_count,
                      }) => (
                        <tr
                          key={date}
                          className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                            {date}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200">
                            {formatTZS(total_sales)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">
                            {formatTZS(total_discount)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-amber-600 dark:text-amber-400">
                            {formatTZS(total_refunds)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">
                            {formatTZS(total_expenses)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">
                            {formatTZS(loans)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium">
                            <span
                              className={
                                Number(profit) >= 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400"
                              }
                            >
                              {formatTZS(profit)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums text-gray-600 dark:text-gray-400">
                            {sales_count}
                          </td>
                        </tr>
                      )
                    )}
                    {totals && (
                      <tr className="border-t-2 border-gray-200 bg-brand-50/50 font-semibold dark:border-gray-700 dark:bg-brand-900/20">
                        <td className="px-4 py-3.5 text-gray-900 dark:text-white">TOTAL</td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-gray-900 dark:text-white">
                          {formatTZS(totals.total_sales)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                          {formatTZS(totals.total_discount)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-amber-600 dark:text-amber-400">
                          {formatTZS(totals.total_refunds)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                          {formatTZS(totals.total_expenses)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                          {formatTZS(totals.total_loans)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          <span
                            className={
                              Number(totals.total_profit) >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {formatTZS(totals.total_profit)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center tabular-nums text-gray-700 dark:text-gray-300">
                          {totals.sales_count}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {report.length > 0 && totals && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Profit = Gross margin (revenue − cost) − Discount − Refunds − Expenses − Unpaid (loans). Refunded sales are excluded from margin.
          </p>
        )}
      </div>
    </div>
  );
}
