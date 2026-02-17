'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, ShoppingCart, Minus, Plus, Trash2, Receipt, User, X, History } from 'lucide-react';
import { DataTable, DataTableHead, DataTableBody } from '@/components/layout/DataTable';

interface Product {
  id: number;
  name: string;
  category_name: string;
  selling_price: number;
  quantity_in_stock: number;
}

interface CartItem {
  product_id: number;
  name: string;
  selling_price: number;
  quantity: number;
  quantity_in_stock: number;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  customer_type?: 'individual' | 'contractor' | 'company';
  credit_limit?: string | number | null;
  is_vip?: boolean;
  is_blacklisted?: boolean;
}

interface SaleRecord {
  id: number;
  date: string;
  status: string;
  payment_status: string;
  sale_type: string;
  final_amount?: string;
  paid_amount?: string;
  payment_method?: string;
  customer?: { name: string; phone?: string } | null;
  user?: { username: string } | null;
}

export default function POSPage() {
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);

  // Payments History tab state
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [historyDateTo, setHistoryDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const savedState = localStorage.getItem('posState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setCart(state.cart || []);
        setDiscountAmount(state.discountAmount || 0);
        setNotes(state.notes || '');
        setSelectedCustomerId(state.selectedCustomerId || '');
        setPaymentMethod(state.paymentMethod || 'cash');
        setAmountPaid(state.amountPaid ?? 0);
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    const state = { cart, discountAmount, notes, selectedCustomerId, paymentMethod, amountPaid };
    localStorage.setItem('posState', JSON.stringify(state));
  }, [cart, discountAmount, notes, selectedCustomerId, paymentMethod, amountPaid]);

  useEffect(() => {
    async function fetchAllData() {
      try {
        const [prodRes, custRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/products/`, { withCredentials: true }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/`, { withCredentials: true }),
        ]);
        setProducts(
          prodRes.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            category_name: p.category_name,
            selling_price: parseFloat(p.selling_price),
            quantity_in_stock: p.quantity_in_stock,
          }))
        );
        setCustomers(custRes.data);
      } catch {
        setError('Failed to load products or customers.');
      }
    }
    fetchAllData();
  }, []);

  const filteredProducts = products
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      (c.phone || '').toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId)
    : null;

  // Fetch payments history
  useEffect(() => {
    if (activeTab !== 'history') return;
    let cancelled = false;
    async function fetchHistory() {
      setHistoryLoading(true);
      try {
        const params: Record<string, string> = {
          start_date: historyDateFrom,
          end_date: historyDateTo,
        };
        if (historySearch.trim()) params.search = historySearch.trim();
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/sales/`, {
          withCredentials: true,
          params,
        });
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        if (!cancelled) setSales(data);
      } catch {
        if (!cancelled) setSales([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }
    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [activeTab, historyDateFrom, historyDateTo, historySearch]);

  const paymentStatusColors: Record<string, string> = {
    paid: 'bg-emerald-600 text-white',
    partial: 'bg-amber-500 text-white',
    not_paid: 'bg-rose-600/90 text-white',
    refunded: 'bg-gray-400 text-white',
  };

  const addToCart = (product: Product) => {
    if (product.quantity_in_stock === 0) {
      setError(`"${product.name}" is out of stock.`);
      return;
    }
    setError(null);
    setCart((curr) => {
      const found = curr.find((item) => item.product_id === product.id);
      if (found) {
        if (found.quantity >= product.quantity_in_stock) {
          setError(`Max stock for "${product.name}" is ${product.quantity_in_stock}.`);
          return curr;
        }
        return curr.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...curr,
        {
          product_id: product.id,
          name: product.name,
          selling_price: product.selling_price,
          quantity: 1,
          quantity_in_stock: product.quantity_in_stock,
        },
      ];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((curr) =>
      curr.map((item) => {
        if (item.product_id !== productId) return item;
        const newQty = Math.max(1, Math.min(item.quantity_in_stock, item.quantity + delta));
        return { ...item, quantity: newQty };
      })
    );
  };

  const setQuantity = (productId: number, qty: number) => {
    const num = parseInt(String(qty), 10);
    if (isNaN(num) || num < 1) return;
    setCart((curr) =>
      curr.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: Math.min(item.quantity_in_stock, num) }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((curr) => curr.filter((item) => item.product_id !== productId));
  };

  const totalPrice = cart.reduce((acc, item) => acc + item.selling_price * item.quantity, 0);
  const discountedTotal = Math.max(0, totalPrice - discountAmount);

  const printInvoice = (
    sale: { id: number },
    cartItems: CartItem[],
    customer: Customer | undefined,
    discount: number,
    method: string,
    paidAmount?: number
  ) => {
    const rawTotal = cartItems.reduce((acc, i) => acc + i.selling_price * i.quantity, 0);
    const finalTotal = rawTotal - discount;
    const itemsHtml = cartItems
      .map(
        (item) => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:right;">${item.selling_price.toLocaleString()} TZS</td>
        <td style="text-align:right;">${(item.selling_price * item.quantity).toLocaleString()} TZS</td>
      </tr>
    `
      )
      .join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Receipt #${sale.id}</title>
      <style>
        body{font-family:'Segoe UI',sans-serif;font-size:12px;max-width:800px;margin:0 auto;padding:20px;color:#333;background:#fff;}
        .header{text-align:center;padding-bottom:10px;border-bottom:2px solid #00BFFF;}
        .header h1{font-size:26px;font-weight:bold;margin:0;}
        .header .brand{color:#00BFFF;}
        .header .dark{color:#000;}
        .company-info{text-align:center;margin-top:5px;font-size:12px;}
        h2{text-align:center;margin-top:30px;font-size:20px;}
        .meta{margin:20px 0;font-size:14px;}
        table{width:100%;border-collapse:collapse;margin-top:15px;}
        table thead{background:#f0f0f0;}
        table th,table td{border:1px solid #ccc;padding:8px;}
        table th{background:#00BFFF;color:white;text-align:center;}
        .totals{float:right;width:300px;margin-top:20px;font-size:12px;}
        .totals div{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #ddd;}
        .totals .grand{font-weight:bold;font-size:14px;border-top:2px solid #00BFFF;padding:8px 0;}
        .footer{clear:both;margin-top:40px;text-align:center;font-size:12px;color:#666;}
      </style></head><body>
        <div class="header">
          <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/images/logo/onyango-logo-light.png" alt="Onyango Construction Co. LTD" style="width:72px;height:72px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 10px;" />
          <h1><span class="brand">Onyango</span> <span class="dark">Construction Co. LTD</span></h1>
          <div class="company-info">
            <p>P.O. Box 131</p>
            <p>Phone: 0788885926 / 0654623712</p>
            <p>Email: Sales@onyangoconstruction.co.tz</p>
            <p>Website: www.onyangoconstruction.co.tz</p>
            <p>TIN: 162297872</p>
          </div>
        </div>
        <h2>Receipt #${sale.id}</h2>
        <div class="meta">
          <p>Date: ${new Date().toLocaleString()}</p>
          <p>Customer: ${customer?.name || 'Walk-in'}</p>
          ${customer?.phone ? `<p>Phone: ${customer.phone}</p>` : ''}
          <p>Payment: ${method.toUpperCase()}</p>
        </div>
        <table>
          <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="totals">
          <div><span>Subtotal:</span><span>${rawTotal.toLocaleString()} TZS</span></div>
          <div><span>Discount:</span><span>- ${discount.toLocaleString()} TZS</span></div>
          <div class="grand"><span>Total:</span><span>${finalTotal.toLocaleString()} TZS</span></div>
          ${paidAmount !== undefined ? `<div><span>Amount paid:</span><span>${paidAmount.toLocaleString()} TZS</span></div>` : ''}
          ${paidAmount !== undefined && paidAmount < finalTotal ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #ddd;"><span>Balance due (loan):</span><span>${(finalTotal - paidAmount).toLocaleString()} TZS</span></div>` : ''}
        </div>
        <div class="footer">Thank you for your purchase. Onyango Construction Co. LTD.</div>
        <script>window.onload=function(){setTimeout(function(){window.print();window.close();},500);};</script>
      </body></html>
    `);
    win.document.close();
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return setError('Cart is empty.');
    // Use actual amount entered: 0 = not-paid loan, < total = partial loan, >= total = paid. Loan/debt requires customer.
    const amt = Number(amountPaid) || 0;
    if (amt < 0 || amt > discountedTotal) return setError('Amount paid must be between 0 and total.');
    if (amt < discountedTotal && !selectedCustomerId) {
      return setError(
        amt === 0
          ? 'Select a customer for loan/debt. Walk-in cannot have 0 paid (not-paid loan).'
          : 'Select a customer for partial payment or loan. Walk-in must pay full amount.'
      );
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload: any = {
        items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        payment_method: paymentMethod,
        amount_paid: amt,
        discount_amount: discountAmount,
        notes: notes.trim(),
        order_type: 'retail',
      };
      if (selectedCustomerId) payload.customer_id = selectedCustomerId;

      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/pos/complete-sale/`, payload, {
        withCredentials: true,
      });
      setSuccessMsg(
        amt >= discountedTotal
          ? `Sale #${res.data.id} completed (paid).`
          : amt === 0
            ? `Sale #${res.data.id} recorded as not-paid loan (debt: ${discountedTotal.toLocaleString()} TZS).`
            : `Sale #${res.data.id} recorded as partial payment (debt: ${(discountedTotal - amt).toLocaleString()} TZS).`
      );
      printInvoice(
        { id: res.data.id },
        cart,
        customers.find((c) => c.id === selectedCustomerId),
        discountAmount,
        paymentMethod,
        amt
      );
      setCart([]);
      setNotes('');
      setDiscountAmount(0);
      setAmountPaid(0);
      setSelectedCustomerId('');
      localStorage.removeItem('posState');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.error;
      const errList = err.response?.data;
      const firstErr = Array.isArray(errList) ? errList[0] : typeof errList === 'object' && errList ? Object.values(errList).flat().find(Boolean) : null;
      setError(msg || firstErr || 'Sale failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-w-0 max-w-full space-y-3 sm:space-y-4 overflow-x-hidden">
      {/* Tabs - compact on small screens, clear touch targets */}
      <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800/80">
        <button
          type="button"
          onClick={() => setActiveTab('pos')}
          className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-5 py-3 sm:py-2.5 text-sm font-semibold transition-all min-h-[44px] ${
            activeTab === 'pos'
              ? 'bg-white text-brand-600 shadow-sm dark:bg-gray-800 dark:text-brand-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <ShoppingCart className="h-4 w-4 shrink-0" />
          <span>POS</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-5 py-3 sm:py-2.5 text-sm font-semibold transition-all min-h-[44px] ${
            activeTab === 'history'
              ? 'bg-white text-brand-600 shadow-sm dark:bg-gray-800 dark:text-brand-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <History className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Payments History</span>
          <span className="sm:hidden">History</span>
        </button>
      </div>

      {/* POS Tab */}
      {activeTab === 'pos' && (
    <div className="flex min-h-0 flex-col lg:flex-row lg:gap-4 lg:h-[calc(100vh-11rem)] lg:min-h-[480px]">
      {/* Left: Products */}
      <div className="flex flex-1 flex-col min-h-0 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/60 lg:min-w-0">
        <div className="border-b border-gray-100 px-3 py-2.5 sm:px-4 sm:py-3 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-6 sm:h-8 w-1 shrink-0 rounded-full bg-brand-500" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Products</h2>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 shrink-0 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-onyango pl-9 w-full min-h-[44px] text-base sm:text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 xs:gap-2 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const outOfStock = product.quantity_in_stock === 0;
              const lowStock = product.quantity_in_stock > 0 && product.quantity_in_stock <= 5;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={outOfStock || loading}
                  className={`
                    flex flex-col items-start rounded-xl border p-2.5 sm:p-3 text-left transition min-h-[72px] sm:min-h-0 touch-manipulation
                    ${outOfStock
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800/50'
                      : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-md active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10'
                    }
                  `}
                >
                  <span className="line-clamp-2 text-sm sm:text-sm font-medium text-gray-900 dark:text-white leading-tight">
                    {product.name}
                  </span>
                  <span className="mt-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
                    {product.selling_price.toLocaleString()} TZS
                  </span>
                  <span
                    className={`mt-0.5 text-xs ${lowStock ? 'text-warning-600 dark:text-warning-400' : 'text-gray-500 dark:text-gray-400'} ${outOfStock ? 'text-error-600 dark:text-error-400' : ''}`}
                  >
                    Stock: {product.quantity_in_stock}
                  </span>
                </button>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No products found.
            </p>
          )}
        </div>
      </div>

      {/* Right: Cart + Customer - sticky checkout on mobile; cart list scrollable */}
      <div className="flex w-full flex-col min-h-0 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/60 lg:w-[380px] lg:shrink-0 lg:overflow-hidden max-h-[70vh] lg:max-h-none">
        <div className="border-b border-gray-100 px-2 py-1.5 sm:px-3 sm:py-2 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShoppingCart className="h-4 w-4 text-brand-500 shrink-0" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Cart</h2>
            {cart.length > 0 && (
              <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {cart.length}
              </span>
            )}
          </div>
        </div>

        {/* Customer - compact */}
        <div className="border-b border-gray-100 px-2 py-1.5 sm:px-3 sm:py-2 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
            <User className="h-3.5 w-3.5 text-gray-500 shrink-0" />
            Customer
          </div>
          <div className="mt-1.5 space-y-1">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search name or phone..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="input-onyango pl-7 w-full text-xs min-h-[36px] py-1.5"
              />
            </div>
            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded border border-brand-200 bg-brand-50/50 px-2 py-1.5 dark:border-brand-800 dark:bg-brand-500/10">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate flex items-center gap-1">
                    {selectedCustomer.name}
                    {selectedCustomer.is_vip && <span className="rounded bg-amber-500/90 px-1 text-[9px] font-semibold text-white">VIP</span>}
                    {selectedCustomer.is_blacklisted && <span className="rounded bg-red-600/90 px-1 text-[9px] font-semibold text-white">BL</span>}
                  </p>
                  {selectedCustomer.phone && <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{selectedCustomer.phone}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedCustomerId(''); setCustomerSearchQuery(''); }}
                  className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  aria-label="Clear customer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
                className="input-onyango w-full text-xs min-h-[36px] py-1.5"
              >
                <option value="">— Walk-in (no customer) —</option>
                {filteredCustomers.slice(0, 50).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` • ${c.phone}` : ''}
                    {c.is_vip ? ' • VIP' : ''}
                    {c.is_blacklisted ? ' • BLACKLISTED' : ''}
                  </option>
                ))}
                {filteredCustomers.length > 50 && (
                  <option disabled>… and {filteredCustomers.length - 50} more (narrow search)</option>
                )}
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          {/* Scrollable cart list - materials added visible here */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 sm:p-3 pb-52 lg:pb-3 overscroll-contain">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <ShoppingCart className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Cart empty</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Tap products to add</p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {cart.map((item) => (
                  <li
                    key={item.product_id}
                    className="rounded-lg border border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800/60 p-2 flex items-center gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {item.selling_price.toLocaleString()} × {item.quantity} = <span className="font-semibold text-brand-600 dark:text-brand-400">{(item.selling_price * item.quantity).toLocaleString()} TZS</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-900/50 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product_id, -1)}
                        disabled={loading || item.quantity <= 1}
                        className="flex h-6 w-6 items-center justify-center text-gray-600 dark:text-gray-400 disabled:opacity-40"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={item.quantity_in_stock}
                        value={item.quantity}
                        onChange={(e) => setQuantity(item.product_id, parseInt(e.target.value, 10) || 1)}
                        className="h-6 w-7 border-0 bg-transparent text-center text-[11px] font-semibold text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product_id, 1)}
                        disabled={loading || item.quantity >= item.quantity_in_stock}
                        className="flex h-6 w-6 items-center justify-center text-gray-600 dark:text-gray-400 disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product_id)}
                      disabled={loading}
                      className="shrink-0 rounded p-0.5 text-gray-400 hover:text-error-600 dark:hover:text-error-400"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Checkout section - sticky on mobile; compact so cart stays visible */}
          <div className="sticky bottom-0 left-0 right-0 z-10 border-t border-gray-100 bg-white px-2 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-900 dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)] sm:px-3 sm:py-3 lg:static lg:shadow-none dark:lg:shadow-none">
            {cart.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Discount</label>
                    <input
                      type="number"
                      min={0}
                      max={totalPrice}
                      value={discountAmount}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (isNaN(v) || v < 0) setDiscountAmount(0);
                        else setDiscountAmount(Math.min(totalPrice, v));
                      }}
                      className="input-onyango text-xs w-full min-h-[32px] py-1 px-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Payment</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="input-onyango w-full text-xs min-h-[32px] py-1 px-2"
                    >
                      <option value="cash">Cash</option>
                      <option value="mobile_money">M-Pesa</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                </div>
                <div className="mt-1.5">
                  <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Amount paid</label>
                  <div className="flex gap-1 mt-0.5">
                    <input
                      type="number"
                      min={0}
                      max={discountedTotal}
                      step={0.01}
                      value={amountPaid === 0 ? '' : amountPaid}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') { setAmountPaid(0); return; }
                        const v = parseFloat(raw);
                        if (isNaN(v) || v < 0) setAmountPaid(0);
                        else setAmountPaid(Math.min(discountedTotal, v));
                      }}
                      className="input-onyango flex-1 text-xs min-h-[32px] py-1 px-2"
                      placeholder="0 or total"
                    />
                    <button
                      type="button"
                      onClick={() => setAmountPaid(discountedTotal)}
                      className="text-[10px] font-medium text-brand-600 dark:text-brand-400 px-2 py-1 rounded border border-brand-300 dark:border-brand-600 shrink-0"
                    >
                      Full
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Total: <span className="font-semibold">{discountedTotal.toLocaleString()} TZS</span></p>
                </div>
                <div className="mt-1.5 hidden sm:block">
                  <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={1}
                    placeholder="Notes..."
                    className="input-onyango mt-0.5 w-full resize-none text-xs min-h-[28px] py-1 px-2"
                  />
                </div>
                  {amountPaid < discountedTotal && amountPaid > 0 && selectedCustomerId && (
                    <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">Debt: {(discountedTotal - amountPaid).toLocaleString()} TZS</p>
                  )}
                  {amountPaid === 0 && cart.length > 0 && !selectedCustomerId && (
                    <p className="mt-0.5 text-[10px] text-error-600 dark:text-error-400">Select customer for loan</p>
                  )}
                  {amountPaid < discountedTotal && amountPaid > 0 && !selectedCustomerId && (
                    <p className="mt-0.5 text-[10px] text-error-600 dark:text-error-400">Select customer for partial</p>
                  )}
                <div className="mt-1.5 flex justify-between items-center rounded-lg bg-gray-50 dark:bg-gray-800/50 px-2 py-1.5 text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Total</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">{discountedTotal.toLocaleString()} TZS</span>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={handleCompleteSale}
              disabled={loading || cart.length === 0}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white shadow transition hover:bg-brand-600 disabled:opacity-50 min-h-[36px]"
            >
              <Receipt className="h-3.5 w-3.5 shrink-0" />
              {loading ? 'Processing…' : 'Complete Sale'}
            </button>
            {error && <p className="mt-1 text-center text-[10px] font-medium text-error-600 dark:text-error-400 break-words">{error}</p>}
            {successMsg && <p className="mt-1 text-center text-[10px] font-medium text-success-600 dark:text-success-400">{successMsg}</p>}
          </div>
        </div>
      </div>
    </div>
      )}

      {/* Payments History Tab - responsive filters + table/cards */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/60 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-3 py-3 dark:border-gray-800 sm:flex-row sm:flex-wrap sm:items-center sm:px-6 sm:py-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by customer or payment method..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="input-onyango pl-9 w-full min-h-[44px] text-base sm:text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
                <label className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 shrink-0">From</label>
                <input
                  type="date"
                  value={historyDateFrom}
                  onChange={(e) => setHistoryDateFrom(e.target.value)}
                  className="input-onyango h-10 flex-1 min-w-0 rounded-lg text-sm sm:w-auto"
                />
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
                <label className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 shrink-0">To</label>
                <input
                  type="date"
                  value={historyDateTo}
                  onChange={(e) => setHistoryDateTo(e.target.value)}
                  className="input-onyango h-10 flex-1 min-w-0 rounded-lg text-sm sm:w-auto"
                />
              </div>
            </div>
          </div>
          <div className="min-w-0 overflow-x-auto">
            {historyLoading ? (
              <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                Loading…
              </div>
            ) : sales.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                No payments found for this date range.
              </div>
            ) : (
              <>
                {/* Mobile: card list - everything visible without horizontal scroll */}
                <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                  {sales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-brand-600 dark:text-brand-400">#{sale.id}</span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${
                            paymentStatusColors[sale.payment_status] || 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                          }`}
                        >
                          {sale.payment_status?.replace('_', ' ') || sale.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(sale.date).toLocaleString()}
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Customer: </span>
                        <span className="text-gray-900 dark:text-white">{sale.customer?.name || 'Walk-in'}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm">
                        <span><span className="text-gray-500 dark:text-gray-400">Amount:</span> <span className="font-medium text-gray-900 dark:text-white">{Number(sale.final_amount || 0).toLocaleString()} TZS</span></span>
                        <span><span className="text-gray-500 dark:text-gray-400">Paid:</span> <span className="text-gray-900 dark:text-white">{Number(sale.paid_amount || 0).toLocaleString()} TZS</span></span>
                        <span><span className="text-gray-500 dark:text-gray-400">Method:</span> <span className="text-gray-900 dark:text-white">{sale.payment_method || '—'}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop: table with horizontal scroll if needed */}
                <div className="hidden md:block overflow-x-auto">
                  <DataTable>
                    <DataTableHead>
                      <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Status</th>
                        <th>Method</th>
                      </tr>
                    </DataTableHead>
                    <DataTableBody>
                      {sales.map((sale) => (
                        <tr key={sale.id}>
                          <td className="font-medium text-brand-600 dark:text-brand-400">#{sale.id}</td>
                          <td className="text-gray-600 dark:text-gray-400">
                            {new Date(sale.date).toLocaleString()}
                          </td>
                          <td>{sale.customer?.name || 'Walk-in'}</td>
                          <td className="font-medium">
                            {Number(sale.final_amount || 0).toLocaleString()} TZS
                          </td>
                          <td>{Number(sale.paid_amount || 0).toLocaleString()} TZS</td>
                          <td>
                            <span
                              className={`inline-flex rounded-full px-3 py-0.5 text-xs font-semibold ${
                                paymentStatusColors[sale.payment_status] || 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                              }`}
                            >
                              {sale.payment_status?.replace('_', ' ') || sale.status}
                            </span>
                          </td>
                          <td>{sale.payment_method || '—'}</td>
                        </tr>
                      ))}
                    </DataTableBody>
                  </DataTable>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
