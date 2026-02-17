'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter, useParams } from 'next/navigation';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';

type CustomerType = 'individual' | 'contractor' | 'company';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('individual');
  const [creditLimit, setCreditLimit] = useState<string>('');
  const [isVip, setIsVip] = useState(false);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function fetchCustomer() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/customers/${id}/`,
          { withCredentials: true }
        );
        if (cancelled) return;
        const c = res.data;
        setName(c.name || '');
        setPhone(c.phone || '');
        setEmail(c.email || '');
        setAddress(c.address || '');
        setCustomerType((c.customer_type as CustomerType) || 'individual');
        setCreditLimit(c.credit_limit != null ? String(c.credit_limit) : '');
        setIsVip(!!c.is_vip);
        setIsBlacklisted(!!c.is_blacklisted);
        setNotes(c.notes || '');
      } catch (e) {
        if (!cancelled) setError('Failed to load customer.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCustomer();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !phone.trim()) {
      setError('Name and phone number are required.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim(),
        email: email || null,
        address: address || '',
        customer_type: customerType,
        is_vip: isVip,
        is_blacklisted: isBlacklisted,
        notes: notes || '',
      };
      if (creditLimit) {
        const parsed = parseFloat(creditLimit);
        payload.credit_limit = isNaN(parsed) ? null : parsed;
      } else {
        payload.credit_limit = null;
      }

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/customers/${id}/`,
        payload,
        { withCredentials: true }
      );
      router.push('/customers');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update customer. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-sm">
      <PageBreadcrumb pageTitle="Edit Customer" />
      <h1 className="text-xl font-bold text-gray-800 dark:text-white">Edit Customer</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5"
      >
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading customer…</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-1 block font-medium text-gray-700 dark:text-white">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-1 block font-medium text-gray-700 dark:text-white">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="email" className="mb-1 block font-medium text-gray-700 dark:text-white">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="customerType" className="mb-1 block font-medium text-gray-700 dark:text-white">
                  Customer type
                </label>
                <select
                  id="customerType"
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="individual">Individual</option>
                  <option value="contractor">Contractor</option>
                  <option value="company">Company</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="creditLimit" className="mb-1 block font-medium text-gray-700 dark:text-white">
                  Credit limit (TZS)
                </label>
                <input
                  id="creditLimit"
                  type="number"
                  min={0}
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  placeholder="Optional"
                />
              </div>

              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={isVip}
                    onChange={(e) => setIsVip(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  VIP customer
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
                  <input
                    type="checkbox"
                    checked={isBlacklisted}
                    onChange={(e) => setIsBlacklisted(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  Blacklisted (no new loans)
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="address" className="mb-1 block font-medium text-gray-700 dark:text-white">
                Address
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="notes" className="mb-1 block font-medium text-gray-700 dark:text-white">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Credit terms, project details, risk notes..."
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => router.push('/customers')}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800/60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

