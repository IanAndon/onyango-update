'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import {
  ArrowLeft,
  FileText,
  Banknote,
  Tag,
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  Home,
  Zap,
  Wallet,
  Package,
  Layers,
  Lightbulb,
  Check,
} from 'lucide-react';

const CATEGORY_OPTIONS: { value: string; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'rent', label: 'Rent', icon: <Home className="h-5 w-5" />, description: 'Premises, lease' },
  { value: 'electricity', label: 'Electricity', icon: <Zap className="h-5 w-5" />, description: 'Power, utilities' },
  { value: 'salary', label: 'Salary', icon: <Wallet className="h-5 w-5" />, description: 'Wages, payroll' },
  { value: 'inventory', label: 'Inventory Refill', icon: <Package className="h-5 w-5" />, description: 'Stock, supplies' },
  { value: 'misc', label: 'Miscellaneous', icon: <Layers className="h-5 w-5" />, description: 'Other expenses' },
];

interface Unit {
  id: number;
  code: string;
  name: string;
}

export default function AddExpensePage() {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [unitId, setUnitId] = useState<string>('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager';
  const userUnitName = user?.unit_name ?? null;

  useEffect(() => {
    if (!isAdmin) return;
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/onyango/units/`, { withCredentials: true })
      .then((r) => {
        const list = r.data || [];
        setUnits(list);
        if (list.length > 0 && !unitId) {
          const shop = list.find((u: Unit) => u.code === 'shop');
          if (shop) setUnitId(String(shop.id));
        }
      })
      .catch(() => {});
  }, [isAdmin]);

  const validateForm = () => {
    if (!description.trim()) return setError('Description is required.'), false;
    if (!amount || Number(amount) <= 0) return setError('Amount must be a positive number.'), false;
    if (!category) return setError('Please select a category.'), false;

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD so it appears on the correct day in the list
      const payload: Record<string, unknown> = {
        description: description.trim(),
        amount: parseFloat(amount),
        category,
        date: today,
      };
      if (isAdmin && unitId) payload.unit = parseInt(unitId, 10);
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/expenses/`,
        payload,
        { withCredentials: true }
      );

      setSuccessMsg('Expense added successfully!');
      setDescription('');
      setAmount('');
      setCategory('');
    } catch (err: any) {
      const msg = err.response?.data?.unit || err.response?.data?.error || err.response?.data?.detail || 'Failed to add expense.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-0 w-full max-w-full px-4 sm:px-6">
      <div className="w-full space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/expenses"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Add New Expense
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Record an expense for your unit. Amount in TZS.
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{successMsg}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Details */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
                <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                    <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    Expense details
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    What was spent and how much
                  </p>
                </div>
                <div className="space-y-5 p-6">
                  <div>
                    <label htmlFor="description" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <FileText className="h-4 w-4" />
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="description"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Office supplies, monthly rent"
                      className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="amount" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <Banknote className="h-4 w-4" />
                      Amount (TZS) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="amount"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm tabular-nums text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <Tag className="h-4 w-4" />
                      Category <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {CATEGORY_OPTIONS.map((opt) => {
                        const isSelected = category === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setCategory(opt.value)}
                            className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-3.5 text-center transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-200'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                isSelected ? 'bg-blue-100 text-blue-600 dark:bg-blue-800/50 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                              }`}
                            >
                              {opt.icon}
                            </span>
                            <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                            <span className="text-[10px] leading-tight text-gray-500 dark:text-gray-400">{opt.description}</span>
                            {isSelected && (
                              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Tap a category to select. Used for reports and filtering.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Unit & actions */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
                <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                    <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    Unit
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Which unit this expense belongs to
                  </p>
                </div>
                <div className="p-6">
                  {isAdmin && units.length > 0 ? (
                    <div>
                      <label htmlFor="unit" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Select unit
                      </label>
                      <select
                        id="unit"
                        value={unitId}
                        onChange={(e) => setUnitId(e.target.value)}
                        required
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">— Select unit —</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Choose which unit this expense is recorded under.
                      </p>
                    </div>
                  ) : !isAdmin && userUnitName ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-4 dark:border-gray-700 dark:bg-gray-800/50">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Recording for
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {userUnitName}
                      </p>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        This expense will be recorded under your unit only.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Tips & tricks */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 shadow-sm dark:border-amber-900/50 dark:bg-amber-900/20">
                <div className="border-b border-amber-200/80 px-6 py-4 dark:border-amber-900/50">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-900 dark:text-amber-200">
                    <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    Tips & tricks
                  </h2>
                </div>
                <ul className="space-y-3 px-6 py-4 text-sm text-amber-900/90 dark:text-amber-100/90">
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span><strong>Description:</strong> Be specific (e.g. &quot;March rent – plot 5&quot;) so you can find it later in reports.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span><strong>Amount:</strong> Enter the exact amount in TZS. Use decimals for cents if needed.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span><strong>Category:</strong> Pick the best match; it helps with spending reports and filters on the expenses list.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span><strong>Unit:</strong> Expenses are separate per unit. Your expense is recorded for your unit only (admins can choose the unit).</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>After saving, you can view and filter all expenses from the main Expenses page.</span>
                  </li>
                </ul>
              </div>

              {/* Submit card */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
                <div className="p-6">
                  <button
                    type="submit"
                    disabled={loading || !description.trim() || !amount || Number(amount) <= 0 || !category}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'Saving…' : 'Save Expense'}
                  </button>
                  <Link
                    href="/expenses"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
