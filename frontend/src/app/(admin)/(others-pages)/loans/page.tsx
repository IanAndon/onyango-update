'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import { getCookie } from 'cookies-next';
import { useAuth } from '@/context/auth-context';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import StatCard from '@/components/layout/StatCard';
import { DataTable } from '@/components/layout/DataTable';
import { Wallet, AlertCircle, CheckCircle, TrendingUp, Package, Clock } from 'lucide-react';

interface Unit {
  id: number;
  code: string;
  name: string;
}

interface LoanSale {
  id: number;
  customer_name: string;
  user_name: string;
  total_amount: string;
  paid_amount: string;
  final_amount: string;
  payment_status: string;
  date: string;
}

interface SaleItem {
  id: number;
  product_name: string;
  quantity: number;
  price_per_unit: string;
  total_price: string;
}

interface PaymentRecord {
  id: number;
  amount_paid: string;
  payment_date: string;
  payment_method: string | null;
  cashier_username: string | null;
}

interface LoanSummary {
  unpaid_count: number;
  partial_count: number;
  paid_count: number;
  total_outstanding: number;
}

export default function LoansPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanSale[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitFilter, setUnitFilter] = useState<string>('');
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<LoanSale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager';

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/onyango/units/`, { withCredentials: true })
        .then((r) => setUnits(r.data || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchLoans();
      fetchSummary();
    }
  }, [startDate, endDate, unitFilter]);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { start_date: startDate, end_date: endDate };
      if (search) params.search = search;
      if (isAdmin && unitFilter) params.unit = unitFilter;
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/loans/`, {
        params,
        withCredentials: true,
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setLoans(data);
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params: Record<string, string> = { start_date: startDate, end_date: endDate };
      if (isAdmin && unitFilter) params.unit = unitFilter;
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/loans/summary/`, {
        params,
        withCredentials: true,
      });
      setSummary(res.data);
    } catch (err) {
      console.error('Error fetching loan summary:', err);
    }
  };

  const openLoanDetails = async (loan: LoanSale) => {
    setSelectedLoan(loan);
    setSaleItems([]);
    setPaymentRecords([]);
    try {
      const [saleRes, paymentsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/sales/${loan.id}/`, { withCredentials: true }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/`, { withCredentials: true, params: { sale: loan.id } }),
      ]);
      const items = saleRes.data?.items || [];
      setSaleItems(
        items.map((item: { id?: number; product?: { name?: string }; product_name?: string; quantity: number; price_per_unit?: string; total_price?: string }) => ({
          id: item.id,
          product_name: item.product_name ?? item.product?.name ?? '',
          quantity: item.quantity,
          price_per_unit: item.price_per_unit ?? '',
          total_price: item.total_price ?? '',
        }))
      );
      const payData = Array.isArray(paymentsRes.data) ? paymentsRes.data : paymentsRes.data?.results ?? [];
      setPaymentRecords(
        (payData as PaymentRecord[]).sort(
          (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        )
      );
    } catch (err) {
      console.error('Failed to fetch sale details or payments:', err);
      setSaleItems([]);
      setPaymentRecords([]);
    }
  };

  const handlePayment = async () => {
    if (!selectedLoan || !paymentAmount) return;
    try {
      setPaying(true);
      let csrfToken = await getCookie('csrftoken');
      csrfToken = csrfToken || '';

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/loans/${selectedLoan.id}/pay/`,
        { amount: parseFloat(paymentAmount) },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
        }
      );

      const updatedLoan = {
        ...selectedLoan,
        paid_amount: (parseFloat(selectedLoan.paid_amount) + parseFloat(paymentAmount)).toFixed(2),
      };

      const receiptData = {
        ...updatedLoan,
        items: saleItems,
        paid_now: paymentAmount,
        date: new Date().toLocaleString(),
      };

      printReceipt(receiptData);

      const updatedPaid = (parseFloat(selectedLoan.paid_amount) + parseFloat(paymentAmount)).toFixed(2);
      setSelectedLoan({ ...selectedLoan, paid_amount: updatedPaid });
      setPaymentAmount('');
      try {
        const paymentsRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/`, { withCredentials: true, params: { sale: selectedLoan.id } });
        const payData = Array.isArray(paymentsRes.data) ? paymentsRes.data : paymentsRes.data?.results ?? [];
        setPaymentRecords(
          (payData as PaymentRecord[]).sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
        );
      } catch (_) {
        setPaymentRecords((prev) => [
          { id: 0, amount_paid: paymentAmount, payment_date: new Date().toISOString(), payment_method: null, cashier_username: user?.username ?? null },
          ...prev,
        ]);
      }
      fetchLoans();
      fetchSummary();
    } catch (err) {
      console.error('Payment failed:', err);
      alert('Payment failed. Check logs.');
    } finally {
      setPaying(false);
    }
  };

  const printReceipt = (receiptData: any) => {
    // same as before, omitted for brevity
  };

  const filteredLoans = loans.filter((loan) => {
    if (statusFilter && loan.payment_status !== statusFilter) return false;
    return loan.customer_name?.toLowerCase().includes(search.toLowerCase()) || loan.user_name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 text-sm">
      <PageHeader
        title="Loaned Sales"
        subtitle="View and record loan payments by date range."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && units.length > 0 && (
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="input-onyango w-auto min-w-[160px]"
              >
                <option value="">All units</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
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
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or cashier..."
              className="input-onyango max-w-[200px]"
            />
            <Button onClick={() => { fetchLoans(); fetchSummary(); }} disabled={loading}>
              Apply
            </Button>
          </div>
        }
      />

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div onClick={() => setStatusFilter('not_paid')} className="cursor-pointer">
            <StatCard
              label="Unpaid loans"
              value={summary.unpaid_count}
              icon={<AlertCircle className="h-6 w-6" />}
              iconBg="gray"
            />
          </div>
          <div onClick={() => setStatusFilter('partial')} className="cursor-pointer">
            <StatCard
              label="Partially paid"
              value={summary.partial_count}
              icon={<Wallet className="h-6 w-6" />}
              iconBg="warning"
            />
          </div>
          <div onClick={() => setStatusFilter('paid')} className="cursor-pointer">
            <StatCard
              label="Fully paid"
              value={summary.paid_count}
              icon={<CheckCircle className="h-6 w-6" />}
              iconBg="success"
            />
          </div>
          <div onClick={() => setStatusFilter(null)} className="cursor-pointer">
            <StatCard
              label="Total outstanding"
              value={`${Number(summary.total_outstanding).toLocaleString()} TZS`}
              icon={<TrendingUp className="h-6 w-6" />}
              accent
            />
          </div>
        </div>
      )}

      <ContentCard title="Loan list" subtitle={loading ? 'Loading…' : `${filteredLoans.length} sale(s)`}>
        <DataTable>
          <thead>
            <tr>
              <th>Sale ID</th>
              <th>Customer</th>
              <th>Cashier</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Remaining</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 dark:text-gray-400">Loading…</td>
              </tr>
            ) : filteredLoans.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 dark:text-gray-400">No loan sales found.</td>
              </tr>
            ) : (
              filteredLoans.map((loan) => (
                <tr key={loan.id} className="cursor-pointer" onClick={() => openLoanDetails(loan)}>
                  <td>#{loan.id}</td>
                  <td>{loan.customer_name || 'N/A'}</td>
                  <td>{loan.user_name}</td>
                  <td>TZS {loan.final_amount}</td>
                  <td>TZS {loan.paid_amount}</td>
                  <td>{(parseFloat(loan.final_amount) - parseFloat(loan.paid_amount)).toFixed(2)}</td>
                  <td>
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                        loan.payment_status === 'partial'
                          ? 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400'
                          : loan.payment_status === 'paid'
                          ? 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400'
                          : 'bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-400'
                      }`}
                    >
                      {loan.payment_status}
                    </span>
                  </td>
                  <td>
                    {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(loan.date))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </ContentCard>

      {/* Loan Detail Modal: progress bar, products, payment history */}
      <Modal isOpen={!!selectedLoan} onClose={() => setSelectedLoan(null)} className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-6">
        {selectedLoan && (
          <div className="space-y-4 overflow-y-auto min-h-0">
            <div className="border-l-4 border-brand-500 pl-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Loan Sale #{selectedLoan.id}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Customer: {selectedLoan.customer_name || 'N/A'} · Cashier: {selectedLoan.user_name} · {new Date(selectedLoan.date).toLocaleDateString()}
              </p>
            </div>

            {/* Status progress bar */}
            <div>
              <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                <span>Payment progress</span>
                <span>
                  {Number(selectedLoan.paid_amount).toLocaleString()} / {Number(selectedLoan.final_amount).toLocaleString()} TZS
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (parseFloat(selectedLoan.paid_amount) / parseFloat(selectedLoan.final_amount)) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white">
                Remaining: <span className="text-brand-600 dark:text-brand-400">{(parseFloat(selectedLoan.final_amount) - parseFloat(selectedLoan.paid_amount)).toFixed(2)} TZS</span>
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  ({selectedLoan.payment_status})
                </span>
              </p>
            </div>

            {/* Products */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-white mb-2">
                <Package className="h-4 w-4" />
                Products
              </h3>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/80">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Product</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Qty</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Unit price</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {saleItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-3 px-3 text-center text-gray-500 dark:text-gray-400">Loading…</td>
                      </tr>
                    ) : (
                      saleItems.map((item) => (
                        <tr key={item.id} className="text-gray-700 dark:text-gray-300">
                          <td className="py-2 px-3">{item.product_name}</td>
                          <td className="text-right py-2 px-3">{item.quantity}</td>
                          <td className="text-right py-2 px-3">{item.price_per_unit} TZS</td>
                          <td className="text-right py-2 px-3 font-medium">{item.total_price} TZS</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment history */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-white mb-2">
                <Clock className="h-4 w-4" />
                Payment history
              </h3>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {paymentRecords.length === 0 ? (
                  <p className="py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-400">No payments recorded yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {paymentRecords.map((p, idx) => (
                      <li key={p.id ? p.id : `new-${idx}-${p.payment_date}`} className="flex items-center justify-between py-2.5 px-4 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white">{Number(p.amount_paid).toLocaleString()} TZS</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-2">
                            {new Date(p.payment_date).toLocaleString()} · {p.payment_method || '—'}
                            {p.cashier_username ? ` · ${p.cashier_username}` : ''}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Record payment */}
            <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-white">Record payment (TZS)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Amount"
                  className="input-onyango flex-1"
                />
                <Button onClick={handlePayment} disabled={paying || !paymentAmount}>
                  {paying ? 'Processing…' : 'Record payment'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
