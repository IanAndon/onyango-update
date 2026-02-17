'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Phone, Mail, MapPin, Building2, CreditCard, Star, Ban, FileText, Save } from 'lucide-react';

export default function AddCustomerPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone_number, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState<'individual' | 'contractor' | 'company'>('individual');
  const [creditLimit, setCreditLimit] = useState<string>('');
  const [isVip, setIsVip] = useState(false);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !phone_number.trim()) {
      setError('Name and phone number are required.');
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        phone: phone_number.trim(),
        email: email.trim() || null,
        address: address.trim() || null,
        customer_type: customerType,
        is_vip: isVip,
        is_blacklisted: isBlacklisted,
        notes: notes.trim() || null,
      };
      if (creditLimit) {
        const parsed = parseFloat(creditLimit);
        payload.credit_limit = isNaN(parsed) ? null : parsed;
      } else {
        payload.credit_limit = null;
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/customers/`,
        payload,
        { withCredentials: true }
      );

      router.push('/customers');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.response?.data?.message || 'Failed to add customer. Please try again.';
      setError(errorMessage);
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
            href="/customers"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Customer</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create a new customer profile with complete information
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column - Basic Information */}
            <div className="space-y-6">
              {/* Basic Information Card */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
                <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                    <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    Basic Information
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Essential customer details
                  </p>
                </div>
                <div className="space-y-5 p-6">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <User className="h-4 w-4" />
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter customer full name"
                      className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <Phone className="h-4 w-4" />
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone_number}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 0712345678 or +255712345678"
                      className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label htmlFor="address" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <MapPin className="h-4 w-4" />
                      Address
                    </label>
                    <textarea
                      id="address"
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address, city, region..."
                      className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Type & Credit Card */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
                <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                    <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    Business Details
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Customer classification and credit settings
                  </p>
                </div>
                <div className="space-y-5 p-6">
                  {/* Customer Type */}
                  <div>
                    <label htmlFor="customerType" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Customer Type
                    </label>
                    <select
                      id="customerType"
                      value={customerType}
                      onChange={(e) => setCustomerType(e.target.value as any)}
                      className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="individual">Individual</option>
                      <option value="contractor">Contractor</option>
                      <option value="company">Company</option>
                    </select>
                  </div>

                  {/* Credit Limit */}
                  <div>
                    <label htmlFor="creditLimit" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <CreditCard className="h-4 w-4" />
                      Credit Limit (TZS)
                    </label>
                    <input
                      id="creditLimit"
                      type="number"
                      min={0}
                      step="0.01"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="Maximum allowed outstanding debt"
                      className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                    />
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      Leave empty for no credit limit
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Status & Notes */}
            <div className="space-y-6">
              {/* Status Flags */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
                <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                    <Star className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    Status & Flags
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Set customer status and special flags
                  </p>
                </div>
                <div className="space-y-4 p-6">
                  {/* VIP Status */}
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
                    <div className="flex h-5 w-5 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isVip}
                        onChange={(e) => setIsVip(e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 text-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">VIP Customer</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Mark as VIP for special treatment and priority service
                      </p>
                    </div>
                  </label>

                  {/* Blacklisted Status */}
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
                    <div className="flex h-5 w-5 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isBlacklisted}
                        onChange={(e) => setIsBlacklisted(e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-2 focus:ring-red-500/20 dark:border-gray-600"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Ban className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Blacklisted</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Prevent this customer from taking new loans or credit sales
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
                <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                    <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    Additional Notes
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Credit terms, risk notes, project info, or any other relevant information
                  </p>
                </div>
                <div className="p-6">
                  <textarea
                    id="notes"
                    rows={8}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter any additional information about this customer..."
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6 dark:border-gray-800">
            <Link
              href="/customers"
              className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !name.trim() || !phone_number.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
