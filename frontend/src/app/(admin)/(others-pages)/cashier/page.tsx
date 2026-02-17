'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import { DataTable, DataTableHead, DataTableBody } from '@/components/layout/DataTable';

interface Order {
  id: number;
  user?: { username: string } | null;
  customer?: { name: string } | null;
  created_at: string;
  status: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/90 text-white',
  confirmed: 'bg-blue-600 text-white',
  cancelled: 'bg-rose-500 text-white',
  completed: 'bg-emerald-600 text-white',
  refunded: 'bg-gray-400 text-white',
  updated: 'bg-violet-500 text-white',
  rejected: 'bg-rose-600/90 text-white',
};

const ORDERS_PER_PAGE = 20;
const PENDING_STATUSES = ['pending', 'updated'];
const HISTORY_STATUSES = ['completed', 'confirmed'];

type TabId = 'pending' | 'history';

export default function CashierOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const observer = useRef<IntersectionObserver | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const page = useRef(1);
  const initiated = useRef(false);

  const filteredOrders = orders.filter((o) =>
    activeTab === 'pending'
      ? PENDING_STATUSES.includes(o.status.toLowerCase())
      : HISTORY_STATUSES.includes(o.status.toLowerCase())
  );

  const fetchMoreOrders = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const dateQuery = filterDate ? `&date=${filterDate}` : '';
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/?page=${page.current}&page_size=${ORDERS_PER_PAGE}${dateQuery}`,
        { withCredentials: true }
      );
      const newOrders = res.data.results || res.data;
      const existingIds = new Set(orders.map((o) => o.id));
      const filteredNew = newOrders.filter((o: Order) => !existingIds.has(o.id));
      if (filteredNew.length > 0) {
        setOrders((prev) => [...prev, ...filteredNew]);
        page.current += 1;
      }
      if (!res.data.next || filteredNew.length < ORDERS_PER_PAGE) setHasMore(false);
    } catch {
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, orders, filterDate]);

  useEffect(() => {
    if (!loaderRef.current) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !initiated.current) {
          initiated.current = true;
          fetchMoreOrders();
        } else if (entries[0].isIntersecting && initiated.current) fetchMoreOrders();
      },
      { rootMargin: '100px' }
    );
    observer.current.observe(loaderRef.current);
    return () => observer.current?.disconnect();
  }, [fetchMoreOrders]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDate(e.target.value);
    page.current = 1;
    setOrders([]);
    setHasMore(true);
    initiated.current = false;
  };

  const handleRefresh = () => {
    page.current = 1;
    setOrders([]);
    setHasMore(true);
    initiated.current = false;
  };

  const handleRowClick = (orderId: number) => router.push(`/cashier/${orderId}`);

  const handleReject = async (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation();
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}/reject/`,
        {},
        { withCredentials: true }
      );
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'rejected' } : o))
      );
    } catch {
      alert('Failed to reject order.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cashier"
        subtitle="Pending orders and payment history"
      />

      <ContentCard noPadding>
        {/* Tabs + filters */}
        <div className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 py-4 sm:px-6">
            <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800/80">
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === 'pending'
                    ? 'bg-white text-brand-600 shadow-sm dark:bg-gray-800 dark:text-brand-400'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                Pending Orders
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-brand-600 shadow-sm dark:bg-gray-800 dark:text-brand-400'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                Payments History
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={filterDate}
                onChange={handleDateChange}
                className="input-onyango h-10 rounded-lg border border-gray-200 bg-gray-50/80 px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white"
                aria-label="Filter by date"
              />
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                aria-label="Refresh orders"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="px-4 py-3 text-error-600 font-semibold sm:px-6">{error}</p>
        )}

        <DataTable>
          <DataTableHead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Staff</th>
              <th>Date</th>
              <th>Status</th>
              {activeTab === 'pending' && <th className="text-right">Actions</th>}
            </tr>
          </DataTableHead>
          <DataTableBody>
            {filteredOrders.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={activeTab === 'pending' ? 6 : 5}
                  className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  {activeTab === 'pending'
                    ? 'No pending orders for this date.'
                    : 'No payment history for this date.'}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => handleRowClick(order.id)}
                  className="cursor-pointer"
                >
                  <td className="font-medium text-brand-600 dark:text-brand-400">
                    #{order.id}
                  </td>
                  <td>{order.customer?.name || '—'}</td>
                  <td>{order.user?.username || '—'}</td>
                  <td className="text-gray-600 dark:text-gray-400">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        statusColors[order.status.toLowerCase()] ||
                        'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                      }`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  {activeTab === 'pending' && (
                    <td className="text-right">
                      {order.status.toLowerCase() === 'pending' && (
                        <button
                          type="button"
                          onClick={(e) => handleReject(e, order.id)}
                          className="rounded-lg bg-rose-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </DataTableBody>
        </DataTable>

        <div
          ref={loaderRef}
          className="border-t border-gray-100 py-5 text-center dark:border-gray-800"
        >
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              Loading…
            </p>
          ) : !hasMore && orders.length > 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No more orders.
            </p>
          ) : null}
        </div>
      </ContentCard>
    </div>
  );
}
