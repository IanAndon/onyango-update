'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import { DataTable, DataTableHead, DataTableBody } from '@/components/layout/DataTable';

interface Product {
  id: number;
  name: string;
  selling_price: number;
  wholesale_price: number;
}

interface OrderItem {
  id: number;
  product: Product | null;
  quantity: number;
}

interface Order {
  id: number;
  user?: { username: string } | null;
  customer?: { name: string; phone?: string } | null;
  status: string;
  created_at: string;
  payment_method?: string;
  notes?: string;
  order_type: 'retail' | 'wholesale';
  discount_amount?: number;
  items: OrderItem[];
}

const statusStyle: Record<string, string> = {
  pending: 'bg-amber-500/90 text-white',
  updated: 'bg-violet-500 text-white',
  completed: 'bg-emerald-600 text-white',
  confirmed: 'bg-blue-600 text-white',
  rejected: 'bg-rose-600/90 text-white',
  cancelled: 'bg-rose-500 text-white',
};

export default function OrderDetailPage() {
  const { saleId } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/orders/${saleId}/`,
        { withCredentials: true }
      );
      setOrder(res.data);
    } catch {
      setError('Failed to fetch order details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!order) return;

    const totalQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
    const rawTotal = order.items.reduce((acc, i) => {
      if (!i.product) return acc;
      const price =
        order.order_type === 'wholesale'
          ? i.product.wholesale_price
          : i.product.selling_price;
      return acc + price * i.quantity;
    }, 0);
    const discountAmount = order.discount_amount || 0;
    const finalTotal = rawTotal - discountAmount;

    const itemsHtml = order.items
      .map((item) => {
        if (!item.product) return '';
        const price =
          order.order_type === 'wholesale'
            ? item.product.wholesale_price
            : item.product.selling_price;
        const subtotal = price * item.quantity;
        return `
          <tr>
            <td>${item.product.name}</td>
            <td style="text-align:center;">${item.quantity}</td>
            <td style="text-align:right;">${price.toLocaleString()}</td>
            <td style="text-align:right;">${subtotal.toLocaleString()}</td>
          </tr>
        `;
      })
      .join('');

    const printWindow = window.open('', 'PrintReceipt', 'width=400,height=600');
    if (!printWindow) return alert('Popup blocked! Please allow popups for this site.');

    printWindow.document.write(`
<html>
<head>
  <title>Receipt #${order.id}</title>
  <style>
    @page { size: A5; margin: 1cm; }
    body { font-family: 'Courier New', monospace; font-size: 14px; color: #000; margin:0; padding:0; }
    .receipt-container { width: 100%; max-width: 560px; margin:0 auto; padding:20px; }
    h1,h2,h3 { margin:0; text-align:center; }
    .company-info { text-align:center; margin-bottom:10px; }
    .company-info small { display:block; font-size:12px; }
    table { width:100%; border-collapse:collapse; margin-top:15px; }
    th, td { padding:6px 4px; border-bottom:1px dashed #000; font-size:13px; }
    th { border-bottom:2px solid #000; text-align:left; }
    td:nth-child(2),td:nth-child(3),td:nth-child(4) { text-align:right; }
    .totals { margin-top:15px; font-size:14px; }
    .totals div { display:flex; justify-content:space-between; padding:3px 0; }
    .underline { border-top:2px solid #000; margin-top:8px; padding-top:5px; font-weight:bold; }
    .footer { text-align:center; margin-top:30px; font-size:13px; }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="company-info">
      <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/images/logo/onyango-logo-light.png" alt="Onyango Company" style="width:56px;height:56px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 8px;" />
      <h2>Onyango Construction</h2>
      <small>Soweto, Morogoro</small>
      <small>Phone: +255 756 639 852</small>
      <small>Email: info@onyangoconstruction.co.tz</small>
    </div>
    <h3>Receipt #${order.id}</h3>
    <p>
      Date: ${new Date(order.created_at).toLocaleString()}<br/>
      Staff: ${order.user?.username || 'Unknown'}<br/>
      Customer: ${order.customer?.name || 'N/A'}<br/>
      ${order.customer?.phone ? `Phone: ${order.customer.phone}<br/>` : ''}
      Order Type: ${order.order_type.toUpperCase()}<br/>
      Payment Method: ${order.payment_method || 'N/A'}
    </p>
    <table>
      <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="totals">
      <div><span>Total Qty:</span> <span>${totalQty}</span></div>
      <div><span>Subtotal:</span> <span>${rawTotal.toLocaleString()} TZS</span></div>
      <div><span>Discount:</span> <span>- ${discountAmount.toLocaleString()} TZS</span></div>
      <div class="underline"><span>Total to Pay:</span> <span>${finalTotal.toLocaleString()} TZS</span></div>
      <div><span>Amount Paid:</span> <span>${Number(amountPaid).toLocaleString()} TZS</span></div>
    </div>
    <div class="footer"><p>Thank you for your purchase!<br/>Welcome Again.</p></div>
  </div>
</body>
</html>
`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleReject = async () => {
    if (!order) return;
    setRejecting(true);
    setError(null);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/orders/${order.id}/reject/`,
        {},
        { withCredentials: true }
      );
      await fetchOrder();
      router.push('/cashier');
    } catch {
      setError('Failed to reject order.');
    } finally {
      setRejecting(false);
    }
  };

  const handleConfirm = async () => {
    if (!order || amountPaid === '') {
      setError('Please enter the amount paid.');
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/orders/${order.id}/confirm/`,
        { payment_method: 'cash', amount_paid: amountPaid },
        { withCredentials: true }
      );
      await fetchOrder();
      handlePrint();
      router.push('/cashier');
    } catch {
      setError('Failed to confirm order.');
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [saleId]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading order…</p>
      </div>
    );
  }
  if (error && !order) {
    return (
      <div className="space-y-6">
        <PageHeader title="Order" subtitle="Order details" />
        <ContentCard>
          <p className="text-error-600 font-semibold">{error}</p>
          <Link
            href="/cashier"
            className="mt-4 inline-block text-brand-600 hover:underline dark:text-brand-400"
          >
            ← Back to Cashier
          </Link>
        </ContentCard>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="space-y-6">
        <PageHeader title="Order" subtitle="Order details" />
        <ContentCard>
          <p className="text-error-600 font-semibold">Order not found.</p>
          <Link
            href="/cashier"
            className="mt-4 inline-block text-brand-600 hover:underline dark:text-brand-400"
          >
            ← Back to Cashier
          </Link>
        </ContentCard>
      </div>
    );
  }

  const totalQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
  const rawTotal = order.items.reduce((acc, i) => {
    if (!i.product) return acc;
    const price =
      order.order_type === 'wholesale'
        ? i.product.wholesale_price
        : i.product.selling_price;
    return acc + price * i.quantity;
  }, 0);
  const discountAmount = order.discount_amount || 0;
  const finalTotal = rawTotal - discountAmount;
  const isPending = order.status === 'pending' || order.status === 'updated';
  const canReject = order.status === 'pending';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order #${order.id}`}
        subtitle="View and process payment"
        action={
          <Link
            href="/cashier"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            ← Back to Cashier
          </Link>
        }
      />

      {/* Order info card */}
      <ContentCard title="Order information" subtitle={`${order.order_type} • ${new Date(order.created_at).toLocaleString()}`}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Customer
            </p>
            <p className="mt-1 font-medium text-gray-900 dark:text-white">
              {order.customer?.name || '—'}
            </p>
            {order.customer?.phone && (
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                {order.customer.phone}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Staff
            </p>
            <p className="mt-1 font-medium text-gray-900 dark:text-white">
              {order.user?.username || '—'}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Status
            </p>
            <span
              className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                statusStyle[order.status.toLowerCase()] ||
                'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
              }`}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Payment
            </p>
            <p className="mt-1 font-medium text-gray-900 dark:text-white">
              {order.payment_method || '—'}
            </p>
          </div>
        </div>
        {order.notes && (
          <div className="mt-4 rounded-lg border border-gray-100 bg-amber-50/50 p-4 dark:border-gray-800 dark:bg-amber-900/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {order.notes}
            </p>
          </div>
        )}
      </ContentCard>

      {/* Items */}
      <ContentCard title="Items" noPadding>
        <DataTable>
          <DataTableHead>
            <tr>
              <th>Product</th>
              <th className="text-center">Qty</th>
              <th className="text-right">Unit price (TZS)</th>
              <th className="text-right">Subtotal (TZS)</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {order.items.map((item) => {
              if (!item.product) {
                return (
                  <tr key={item.id}>
                    <td colSpan={4} className="text-center text-error-600">
                      Missing product
                    </td>
                  </tr>
                );
              }
              const price =
                order.order_type === 'wholesale'
                  ? item.product.wholesale_price
                  : item.product.selling_price;
              const subtotal = price * item.quantity;
              return (
                <tr key={item.id}>
                  <td className="font-medium">{item.product.name}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{price.toLocaleString()}</td>
                  <td className="text-right font-medium">
                    {subtotal.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </DataTableBody>
        </DataTable>
      </ContentCard>

      {/* Totals + payment + actions */}
      <ContentCard title="Summary & payment">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-wrap gap-6">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total qty </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {totalQty}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">Subtotal </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {rawTotal.toLocaleString()} TZS
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">Discount </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                -{discountAmount.toLocaleString()} TZS
              </span>
            </div>
            <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Total to pay </span>
              <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                {finalTotal.toLocaleString()} TZS
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex items-center gap-4">
              <div className="min-w-[120px] text-sm font-medium">
                {amountPaid.trim() !== '' && !isNaN(Number(amountPaid)) ? (
                  Number(amountPaid) < finalTotal ? (
                    <span className="text-error-600 dark:text-error-400">
                      Debt: {(finalTotal - Number(amountPaid)).toLocaleString()} TZS
                    </span>
                  ) : (
                    <span className="text-success-600 dark:text-success-400">
                      No debt
                    </span>
                  )
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">
                    Enter amount
                  </span>
                )}
              </div>
              <div>
                <label
                  htmlFor="amountPaid"
                  className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Amount paid (TZS)
                </label>
                <input
                  id="amountPaid"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  value={amountPaid}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setAmountPaid('');
                      return;
                    }
                    let numVal = Number(val);
                    if (isNaN(numVal)) return;
                    if (numVal < 0) numVal = 0;
                    setAmountPaid(numVal.toString());
                  }}
                  disabled={!isPending}
                  className="input-onyango h-10 w-40 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {canReject && (
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={rejecting || confirming}
                  className="rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                >
                  {rejecting ? 'Rejecting…' : 'Reject order'}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming || !isPending}
                className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {confirming ? 'Confirming…' : 'Confirm & generate sale'}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={order.status === 'pending'}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Print receipt
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 font-semibold text-error-600 dark:text-error-400">
            {error}
          </p>
        )}
      </ContentCard>
    </div>
  );
}
