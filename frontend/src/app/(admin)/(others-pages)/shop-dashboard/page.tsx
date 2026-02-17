'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShoppingCart, AlertTriangle, Wallet, TrendingUp, Package } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/layout/StatCard';
import ContentCard from '@/components/layout/ContentCard';
import { DataTable } from '@/components/layout/DataTable';

interface UnitOverview {
  units: {
    unit: { id: number; code: string; name: string };
    expenses: { count: number; total: number };
    loans: { count: number; outstanding: number; recent: any[] };
    stock_movements: { count: number };
  }[];
  totals: {
    expenses_count: number;
    expenses_total: number;
    loans_count: number;
    loans_outstanding: number;
  };
}

interface StockReport {
  lowStockProducts: { id: number; name: string; threshold: number; quantity_in_stock: number }[];
  mostSoldItems: { product__id: number; product__name: string; total_sold: number }[];
}

interface CashbookData {
  date: string;
  payments_total: number;
  expenses_total: number;
  net_cash: number;
}

export default function ShopDashboardPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [shopExpensesMonth, setShopExpensesMonth] = useState(0);
  const [shopLoansOutstanding, setShopLoansOutstanding] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [todayNetCash, setTodayNetCash] = useState(0);

  const [topProducts, setTopProducts] = useState<StockReport['mostSoldItems']>([]);
  const [lowStockProducts, setLowStockProducts] = useState<StockReport['lowStockProducts']>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        const [unitRes, stockRes, cashRes] = await Promise.all([
          axios.get<UnitOverview>(`${base}/api/admin/unit-overview/`, { withCredentials: true }),
          axios.get<StockReport>(`${base}/api/reports/stock/`, {
            params: { start_date: todayStr, end_date: todayStr },
            withCredentials: true,
          }),
          axios.get<CashbookData>(`${base}/api/finance/shop-cashbook/`, {
            params: { date: todayStr },
            withCredentials: true,
          }),
        ]);

        const shopUnit = unitRes.data.units.find((u) => u.unit.code === 'shop');
        if (shopUnit) {
          setShopExpensesMonth(shopUnit.expenses.total || 0);
          setShopLoansOutstanding(shopUnit.loans.outstanding || 0);
        }

        setLowStockProducts(stockRes.data.lowStockProducts || []);
        setLowStockCount((stockRes.data.lowStockProducts || []).length);
        setTopProducts((stockRes.data.mostSoldItems || []).slice(0, 5));

        setTodayNetCash(cashRes.data.net_cash || 0);
      } catch (err: any) {
        console.error('Failed to load shop dashboard', err);
        setError(err.response?.data?.error || 'Failed to load shop dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [todayStr]);

  return (
    <div className="space-y-8 text-sm">
      <PageHeader
        title="Shop overview"
        subtitle="Key metrics and health indicators for the hardware shop unit."
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Key metrics (today / this month)
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Net cash today (Shop)"
                value={`TZS ${todayNetCash.toLocaleString()}`}
                icon={<Wallet className="h-6 w-6" />}
                iconBg="success"
                accent
              />
              <StatCard
                label="Shop expenses this month"
                value={`TZS ${shopExpensesMonth.toLocaleString()}`}
                icon={<TrendingUp className="h-6 w-6" />}
                iconBg="warning"
              />
              <StatCard
                label="Outstanding shop loans"
                value={`TZS ${shopLoansOutstanding.toLocaleString()}`}
                icon={<ShoppingCart className="h-6 w-6" />}
                iconBg="brand"
              />
              <StatCard
                label="Low stock items"
                value={String(lowStockCount)}
                icon={<AlertTriangle className="h-6 w-6" />}
                iconBg="warning"
              />
            </div>
          </section>

          {/* Top products & low stock */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ContentCard
              title="Top products sold today"
              subtitle={
                topProducts.length
                  ? `${topProducts.length} product(s)`
                  : 'No sales data yet for today.'
              }
            >
              {topProducts.length ? (
                <DataTable>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Qty sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((item) => (
                      <tr key={item.product__id}>
                        <td>{item.product__name}</td>
                        <td className="text-right">{item.total_sold}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No products sold yet for the selected day.
                </p>
              )}
            </ContentCard>

            <ContentCard
              title="Low stock products"
              subtitle={
                lowStockProducts.length
                  ? `${lowStockProducts.length} product(s) at or below threshold`
                  : 'No low stock alerts.'
              }
            >
              {lowStockProducts.length ? (
                <DataTable>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-center">Threshold</th>
                      <th className="text-center">Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.slice(0, 10).map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td className="text-center">{p.threshold}</td>
                        <td className="text-center">{p.quantity_in_stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  All products are above their low-stock thresholds.
                </p>
              )}
            </ContentCard>
          </div>

          {/* Quick actions */}
          <ContentCard
            title="Quick actions"
            subtitle="Jump directly to frequently used shop screens."
          >
            <div className="flex flex-wrap gap-3">
              <a
                href="/pos"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-brand-600"
              >
                <ShoppingCart className="h-4 w-4" /> Open POS
              </a>
              <a
                href="/sales"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/50"
              >
                <Package className="h-4 w-4" /> View sales
              </a>
              <a
                href="/loans"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/50"
              >
                <Wallet className="h-4 w-4" /> Loaned sales
              </a>
              <a
                href="/stock"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/50"
              >
                <AlertTriangle className="h-4 w-4" /> Stock audit
              </a>
              <a
                href="/report/stock"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/50"
              >
                <Package className="h-4 w-4" /> Stock report
              </a>
              <a
                href="/cashbook"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/50"
              >
                <Wallet className="h-4 w-4" /> Shop cashbook
              </a>
            </div>
          </ContentCard>
        </>
      )}
    </div>
  );
}

