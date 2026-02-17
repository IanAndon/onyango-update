'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';

interface Product {
  id: number;
  name: string;
  threshold: number;
  quantity_in_stock: number;
  avg_daily_sales?: number;
  suggested_reorder?: number;
}

interface MostSoldItem {
  product__id: number;
  product__name: string;
  total_sold: number;
}

interface StockMovement {
  date: string;
  Restocked: number;
  Sold: number;
}

interface SlowMover {
  id: number;
  name: string;
  threshold: number;
  quantity_in_stock: number;
}

interface TransferredOutItem {
  product__id: number;
  product__name: string;
  total_transferred: number;
}

export default function StockReportPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const [data, setData] = useState<{
    lowStockProducts: Product[];
    mostSoldItems: MostSoldItem[];
    stockMovement: StockMovement[];
    totalStockValue: number;
    slowMovers?: SlowMover[];
    transferredOutSummary?: TransferredOutItem[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/reports/stock/`,
        { params: { start_date: startDate, end_date: endDate }, withCredentials: true }
      );
      setData(res.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load stock report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const lowStockProducts = data?.lowStockProducts || [];
  const mostSoldItems = data?.mostSoldItems || [];
  const stockMovement = data?.stockMovement || [];
  const slowMovers = data?.slowMovers || [];
  const transferredOut = data?.transferredOutSummary || [];

  return (
    <div className="space-y-6 px-4 py-6 text-sm sm:px-6">
      <PageHeader
        title="Shop stock reports"
        subtitle="Analyze low stock, fast and slow movers, and stock transferred to the workshop."
      />

      <ContentCard title="Filters" subtitle="Choose a date range for sales-based insights.">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">From</p>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-onyango w-40"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">To</p>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-onyango w-40"
            />
          </div>
          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Apply'}
          </button>
          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      </ContentCard>

      {data && (
        <ContentCard
          title="Summary"
          subtitle={`Total stock value and quick links for ${startDate} – ${endDate}`}
        >
          <div className="mb-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
            Total stock value:{' '}
            <span className="text-base">
              TZS {data.totalStockValue.toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <CardNav
              label="Low stock"
              count={lowStockProducts.length}
              color="orange"
              target="low-stock"
            />
            <CardNav
              label="Most sold"
              count={mostSoldItems.length}
              color="blue"
              target="most-sold"
            />
            <CardNav
              label="Slow movers"
              count={slowMovers.length}
              color="purple"
              target="slow-movers"
            />
            <CardNav
              label="Transfers out"
              count={transferredOut.length}
              color="green"
              target="transfers-out"
            />
          </div>
        </ContentCard>
      )}

      <div className="space-y-8">
        {/* Top 4 cards grid */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
          {/* Low stock & reorder */}
          <div id="low-stock" className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Low stock &amp; reorder
              </h2>
              <span className="text-[11px] uppercase tracking-wide text-gray-400">
                {lowStockProducts.length} item(s)
              </span>
            </div>
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No low stock products for this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] sm:text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-left font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <th className="p-2">Product</th>
                      <th className="p-2 text-center">Thres.</th>
                      <th className="p-2 text-center">Current</th>
                      <th className="p-2 text-center">Avg/day</th>
                      <th className="p-2 text-center">Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.slice(0, 8).map((product) => (
                      <tr
                        key={product.id}
                        className="even:bg-gray-50 dark:even:bg-gray-900/40"
                      >
                        <td className="p-2 break-words">{product.name}</td>
                        <td className="p-2 text-center">{product.threshold}</td>
                        <td className="p-2 text-center">
                          {product.quantity_in_stock}
                        </td>
                        <td className="p-2 text-center">
                          {product.avg_daily_sales != null
                            ? product.avg_daily_sales.toFixed(2)
                            : '—'}
                        </td>
                        <td className="p-2 text-center">
                          {product.suggested_reorder != null
                            ? product.suggested_reorder.toLocaleString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {lowStockProducts.length > 8 && (
                  <p className="pt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    Showing first 8 low stock products. Narrow your date range to
                    focus further.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Slow movers */}
          <div id="slow-movers" className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Slow movers
              </h2>
              <span className="text-[11px] uppercase tracking-wide text-gray-400">
                {slowMovers.length} item(s)
              </span>
            </div>
            {slowMovers.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No slow movers for this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] sm:text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-left font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <th className="p-2">Product</th>
                      <th className="p-2 text-center">Thres.</th>
                      <th className="p-2 text-center">Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slowMovers.slice(0, 8).map((product) => (
                      <tr
                        key={product.id}
                        className="even:bg-gray-50 dark:even:bg-gray-900/40"
                      >
                        <td className="p-2 break-words">{product.name}</td>
                        <td className="p-2 text-center">{product.threshold}</td>
                        <td className="p-2 text-center">
                          {product.quantity_in_stock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {slowMovers.length > 8 && (
                  <p className="pt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    Showing first 8 slow movers. Narrow your date range to focus
                    further.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Most sold products */}
          <div id="most-sold" className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Most sold products
              </h2>
              <span className="text-[11px] uppercase tracking-wide text-gray-400">
                {mostSoldItems.length} item(s)
              </span>
            </div>
            {mostSoldItems.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No sales data yet for this period.
              </p>
            ) : (
              <div className="w-full min-h-[12rem] sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mostSoldItems.map((item) => ({
                      name: item.product__name,
                      sold: item.total_sold,
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="sold" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Transfers out */}
          <div id="transfers-out" className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Transfers out to workshop
              </h2>
              <span className="text-[11px] uppercase tracking-wide text-gray-400">
                {transferredOut.length} item(s)
              </span>
            </div>
            {transferredOut.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No stock transferred out for this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] sm:text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-left font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <th className="p-2">Product</th>
                      <th className="p-2 text-center">Quantity transferred</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferredOut.slice(0, 8).map((item) => (
                      <tr
                        key={item.product__id}
                        className="even:bg-gray-50 dark:even:bg-gray-900/40"
                      >
                        <td className="p-2 break-words">{item.product__name}</td>
                        <td className="p-2 text-center">{item.total_transferred}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transferredOut.length > 8 && (
                  <p className="pt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    Showing first 8 rows. Narrow your date range to focus further.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Full-width stock movement card below the 2x2 grid */}
        <div id="stock-movement" className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Stock movement over time
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Restocked vs sold quantities for each day.
            </p>
          </div>
          {stockMovement.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No stock movement data yet for this period.
            </p>
          ) : (
            <div className="w-full min-h-[16rem] sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stockMovement}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="Restocked" stackId="a" fill="#10b981" />
                  <Bar dataKey="Sold" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// CardNav
function CardNav({
  label,
  count,
  color,
  target,
}: {
  label: string;
  count: string | number;
  color: 'orange' | 'blue' | 'green' | 'purple';
  target: string;
}) {
  const colorMap = {
    orange: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    green: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    purple: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
  };
  return (
    <button
      type="button"
      onClick={() =>
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      className={`flex flex-col justify-between rounded-2xl p-4 text-left shadow-sm transition hover:shadow-md ${colorMap[color]}`}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide">{label}</h3>
      <p className="mt-2 text-xl font-bold">{count}</p>
    </button>
  );
}
