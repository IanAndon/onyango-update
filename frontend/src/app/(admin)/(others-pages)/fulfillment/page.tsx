'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getCookie } from 'cookies-next';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import Button from '@/components/ui/button/Button';
import { useAuth } from '@/context/auth-context';
import { Package, CheckCircle, Clock, ChevronDown, ChevronRight, Search } from 'lucide-react';

interface SaleItemType {
  id: number;
  product?: { name?: string; id?: number };
  product_name?: string;
  quantity: number;
  price_per_unit?: string;
  total_price?: string;
}

interface SaleRecord {
  id: number;
  date: string;
  status: string;
  payment_status: string;
  payment_method?: string | null;
  fulfillment_status: string;
  checked_by_username?: string | null;
  checked_at?: string | null;
  final_amount?: string;
  total_amount?: string;
  paid_amount?: string;
  discount_amount?: string;
  customer?: { name?: string } | null;
  user?: { username?: string } | null;
  items?: SaleItemType[];
}

type TabType = 'pending' | 'checked';

const ALLOWED_FULFILLMENT_ROLES = ['admin', 'storekeeper'];

export default function FulfillmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [saleDetails, setSaleDetails] = useState<Record<number, SaleRecord>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user === undefined) return;
    if (!user || !ALLOWED_FULFILLMENT_ROLES.includes(user.role)) {
      router.replace('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (!user || !ALLOWED_FULFILLMENT_ROLES.includes(user.role)) return;
    fetchSales();
  }, [startDate, endDate, user]);

  async function fetchSales() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sales/`,
        {
          withCredentials: true,
          params: { start_date: startDate, end_date: endDate },
        }
      );
      const data = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
      const paidOnly = (data as SaleRecord[]).filter(
        (s) => s.payment_status === 'paid' || s.payment_status === 'partial'
      );
      setSales(paidOnly);
      setExpandedId(null);
    } catch (err) {
      setError('Failed to load sales.');
      setSales([]);
    } finally {
      setLoading(false);
    }
  }

  const pendingSales = sales.filter((s) => s.fulfillment_status !== 'checked');
  const checkedSales = sales.filter((s) => s.fulfillment_status === 'checked');
  const tabSales = activeTab === 'pending' ? pendingSales : checkedSales;

  const searchLower = searchQuery.trim().toLowerCase();
  const displayedSales = searchLower
    ? tabSales.filter((s) => {
        const id = String(s.id);
        const customer = (s.customer?.name ?? 'walk-in').toLowerCase();
        const cashier = (s.user?.username ?? '').toLowerCase();
        const dateStr = new Date(s.date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }).toLowerCase();
        return (
          id.includes(searchLower) ||
          customer.includes(searchLower) ||
          cashier.includes(searchLower) ||
          dateStr.includes(searchLower)
        );
      })
    : tabSales;

  const toggleExpand = async (sale: SaleRecord) => {
    if (expandedId === sale.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sale.id);
    if (saleDetails[sale.id]?.items?.length) return;
    setLoadingDetailId(sale.id);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sales/${sale.id}/`,
        { withCredentials: true }
      );
      setSaleDetails((prev) => ({ ...prev, [sale.id]: res.data }));
    } catch (_) {
      setSaleDetails((prev) => ({ ...prev, [sale.id]: sale }));
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleMarkChecked = async (sale: SaleRecord) => {
    setMarkingId(sale.id);
    setError(null);
    try {
      const csrf = await getCookie('csrftoken');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sales/${sale.id}/mark-checked/`,
        {},
        {
          withCredentials: true,
          headers: { 'X-CSRFToken': csrf || '', 'Content-Type': 'application/json' },
        }
      );
      setExpandedId(null);
      fetchSales();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setError(ax.response?.data?.detail || 'Failed to mark as checked.');
    } finally {
      setMarkingId(null);
    }
  };

  const productName = (item: SaleItemType) =>
    item.product_name ?? item.product?.name ?? '—';

  function SaleExpandedDetail({
    sale,
    detail,
    items,
    isLoadingDetail,
  }: {
    sale: SaleRecord;
    detail: SaleRecord;
    items: SaleItemType[];
    isLoadingDetail: boolean;
  }) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/30 p-3 sm:p-4 space-y-4 text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 bg-white dark:bg-gray-900/50">
          <div>
            <span className="text-gray-500 dark:text-gray-400 block text-[10px] sm:text-xs">Sale ID</span>
            <span className="font-semibold text-xs sm:text-sm">#{detail.id}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block text-[10px] sm:text-xs">Date</span>
            <span className="text-xs sm:text-sm">{new Date(detail.date).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block text-[10px] sm:text-xs">Customer</span>
            <span className="text-xs sm:text-sm">{detail.customer?.name ?? 'Walk-in'}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block text-[10px] sm:text-xs">Cashier</span>
            <span className="text-xs sm:text-sm font-medium">{detail.user?.username ?? '—'}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block text-[10px] sm:text-xs">Subtotal</span>
            <span className="text-xs sm:text-sm">{Number(detail.total_amount ?? 0).toLocaleString()} TZS</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block text-[10px] sm:text-xs">Discount</span>
            <span className="text-xs sm:text-sm text-red-600 dark:text-red-400">
              −{Number(detail.discount_amount ?? 0).toLocaleString()} TZS
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block text-[10px] sm:text-xs">Total</span>
            <span className="text-xs sm:text-sm font-semibold">{Number(detail.final_amount ?? 0).toLocaleString()} TZS</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block text-[10px] sm:text-xs">Store check</span>
            {detail.fulfillment_status === 'checked' ? (
              <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                {detail.checked_by_username ?? '—'}
                {detail.checked_at ? ` · ${new Date(detail.checked_at).toLocaleDateString()}` : ''}
              </span>
            ) : (
              <span className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400">Pending</span>
            )}
          </div>
        </div>
        <div>
          <h4 className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-2">
            <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Order items
          </h4>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800/80">
                <tr>
                  <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-medium">Product</th>
                  <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 font-medium">Qty</th>
                  <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 font-medium">Unit</th>
                  <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {isLoadingDetail ? (
                  <tr><td colSpan={4} className="py-3 text-center text-gray-500">Loading…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={4} className="py-3 text-center text-gray-500">No items</td></tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3">{productName(item)}</td>
                      <td className="text-right py-1.5 sm:py-2 px-2 sm:px-3">{item.quantity}</td>
                      <td className="text-right py-1.5 sm:py-2 px-2 sm:px-3">{item.price_per_unit ?? '—'} TZS</td>
                      <td className="text-right py-1.5 sm:py-2 px-2 sm:px-3 font-medium">{item.total_price ?? '—'} TZS</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {detail.fulfillment_status !== 'checked' && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={() => handleMarkChecked(sale)}
              disabled={markingId === sale.id}
              className="w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              {markingId === sale.id ? 'Saving…' : (
                <><CheckCircle className="h-4 w-4 mr-2 shrink-0" />Mark as checked</>
              )}
            </Button>
          </div>
        )}
        {detail.fulfillment_status === 'checked' && (
          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Checked by {detail.checked_by_username ?? '—'}
            {detail.checked_at ? ` · ${new Date(detail.checked_at).toLocaleString()}` : ''}
          </p>
        )}
      </div>
    );
  }

  function SaleRowContent({
    sale,
    isExpanded,
    detail,
    items,
    isLoadingDetail,
  }: {
    sale: SaleRecord;
    isExpanded: boolean;
    detail: SaleRecord;
    items: SaleItemType[];
    isLoadingDetail: boolean;
  }) {
    return (
      <>
        {/* Row / Card header - same for table and card */}
        <div
          className="flex flex-wrap items-center gap-2 sm:gap-4 py-3 px-3 sm:px-4 border-b border-gray-100 dark:border-gray-700 last:border-0"
          onClick={() => toggleExpand(sale)}
        >
          <span className="text-gray-500 dark:text-gray-400 shrink-0">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="font-semibold text-brand-600 dark:text-brand-400 shrink-0">#{sale.id}</span>
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate min-w-0">
            {new Date(sale.date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
          </span>
          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate min-w-0">
            {sale.customer?.name ?? 'Walk-in'}
          </span>
          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 shrink-0" title="Cashier">
            <span className="text-gray-500 dark:text-gray-400 sm:hidden">Cashier: </span>
            {sale.user?.username ?? '—'}
          </span>
          <span className="text-xs sm:text-sm font-medium ml-auto">
            {Number(sale.final_amount ?? 0).toLocaleString()} TZS
          </span>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold shrink-0 ${
              sale.payment_status === 'paid'
                ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
            }`}
          >
            {sale.payment_status}
          </span>
          <Button
            size="sm"
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(sale);
            }}
          >
            {isExpanded ? 'Hide' : 'Details'}
          </Button>
        </div>

        {isExpanded && (
          <SaleExpandedDetail sale={sale} detail={detail} items={items} isLoadingDetail={isLoadingDetail} />
        )}
      </>
    );
  }

  if (user === undefined) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    );
  }
  if (!user || !ALLOWED_FULFILLMENT_ROLES.includes(user.role)) {
    return null;
  }

  return (
    <div className="min-w-0 max-w-full pb-6 sm:pb-8">
      <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 -mx-3 px-3 sm:-mx-4 sm:px-4 py-3 sm:py-4">
        <PageHeader
          title="Store check"
          subtitle="Verify items and mark sales as checked."
          action={
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search by ID, customer, cashier…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-onyango w-full pl-9 pr-3 text-sm min-h-[40px] py-2"
                />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-onyango w-full min-w-0 sm:w-auto text-sm min-h-[40px] py-2"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-onyango w-full min-w-0 sm:w-auto text-sm min-h-[40px] py-2"
              />
              <Button onClick={fetchSales} disabled={loading} className="min-h-[40px] shrink-0">
                {loading ? '…' : 'Apply'}
              </Button>
            </div>
          }
        />

        {/* Tabs: Pending check | Checked */}
        <div className="flex rounded-xl bg-gray-200 dark:bg-gray-800 p-1 mt-3 sm:mt-4">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all min-h-[44px] touch-manipulation ${
              activeTab === 'pending'
                ? 'bg-white text-amber-700 dark:bg-gray-700 dark:text-amber-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Clock className="h-4 w-4 shrink-0" />
            <span>Pending check</span>
            <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] sm:text-xs font-bold">
              {pendingSales.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checked')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all min-h-[44px] touch-manipulation ${
              activeTab === 'checked'
                ? 'bg-white text-green-700 dark:bg-gray-700 dark:text-green-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>Checked</span>
            <span className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 text-[10px] sm:text-xs font-bold">
              {checkedSales.length}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-4 sm:mt-6 px-0 sm:px-0">
        {error && (
          <p className="mb-4 text-sm font-medium text-red-600 dark:text-red-400 px-3 sm:px-0">{error}</p>
        )}

        <ContentCard
          title={activeTab === 'pending' ? 'Pending verification' : 'Already checked'}
          subtitle={
            loading
              ? 'Loading…'
              : searchQuery.trim()
                ? `${displayedSales.length} of ${tabSales.length} sale(s)`
                : activeTab === 'pending'
                  ? `${displayedSales.length} sale(s) need store check`
                  : `${displayedSales.length} sale(s) verified`
          }
          className="overflow-hidden"
        >
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          ) : displayedSales.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              {activeTab === 'pending'
                ? 'No paid orders pending check for this date range.'
                : 'No checked sales for this date range.'}
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {displayedSales.map((sale) => {
                  const isExpanded = expandedId === sale.id;
                  const detail = saleDetails[sale.id] ?? sale;
                  const items = detail.items ?? [];
                  const isLoadingDetail = loadingDetailId === sale.id;
                  return (
                    <div
                      key={sale.id}
                      className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-3 last:mb-0"
                    >
                      <SaleRowContent
                        sale={sale}
                        isExpanded={isExpanded}
                        detail={detail}
                        items={items}
                        isLoadingDetail={isLoadingDetail}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="table-onyango w-full">
                  <thead>
                    <tr>
                      <th className="w-8"></th>
                      <th>Sale ID</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Cashier</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedSales.map((sale) => {
                      const isExpanded = expandedId === sale.id;
                      const detail = saleDetails[sale.id] ?? sale;
                      const items = detail.items ?? [];
                      const isLoadingDetail = loadingDetailId === sale.id;
                      return (
                        <React.Fragment key={sale.id}>
                          <tr
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            onClick={() => toggleExpand(sale)}
                          >
                            <td className="text-gray-500 dark:text-gray-400">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </td>
                            <td className="font-medium text-brand-600 dark:text-brand-400">#{sale.id}</td>
                            <td>{new Date(sale.date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</td>
                            <td>{sale.customer?.name ?? 'Walk-in'}</td>
                            <td>{sale.user?.username ?? '—'}</td>
                            <td>{Number(sale.final_amount ?? 0).toLocaleString()} TZS</td>
                            <td>
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  sale.payment_status === 'paid'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                                }`}
                              >
                                {sale.payment_status}
                              </span>
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" onClick={() => toggleExpand(sale)}>
                                {isExpanded ? 'Hide details' : 'View details'}
                              </Button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="bg-gray-50 dark:bg-gray-800/30 p-0 align-top">
                                <div className="p-4">
                                  <SaleExpandedDetail
                                    sale={sale}
                                    detail={detail}
                                    items={items}
                                    isLoadingDetail={isLoadingDetail}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </ContentCard>
      </div>
    </div>
  );
}
