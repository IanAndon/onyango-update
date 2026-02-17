'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import { DataTable } from '@/components/layout/DataTable';

interface Customer {
  id: number;
  name: string;
  phone_number: string;
  email?: string;
  total_purchases?: number;
  customer_type?: 'individual' | 'contractor' | 'company';
  is_vip?: boolean;
  is_blacklisted?: boolean;
}

// Helper to render stars
function renderStars(rating: number) {
  const maxStars = 5;
  const filledStars = Math.min(Math.floor(rating), maxStars);
  const emptyStars = maxStars - filledStars;

  return (
    <>
      {'★'.repeat(filledStars)}
      <span className="text-gray-300 dark:text-gray-600">{'☆'.repeat(emptyStars)}</span>
    </>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/customers/`,
        { withCredentials: true }
      );

      const formatted = res.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        phone_number: item.phone_number ?? item.phone ?? '',
        email: item.email || '',
        total_purchases: item.total_purchases || 0,
        customer_type: item.customer_type,
        is_vip: item.is_vip,
        is_blacklisted: item.is_blacklisted,
      }));

      formatted.sort((a: Customer, b: Customer) => b.id - a.id);

      setCustomers(formatted);
    } catch (err) {
      setError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((cust) => {
    return (
      cust.name.toLowerCase().includes(search.toLowerCase()) ||
      cust.phone_number.includes(search) ||
      (cust.email && cust.email.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const getStarRating = (total: number) => {
    if (total >= 1_000_000) return 5;
    if (total >= 500_000) return 4;
    if (total >= 100_000) return 3;
    if (total >= 10_000) return 2;
    if (total > 0) return 1;
    return 0;
  };

  const handleViewPurchases = (customerId: number) => {
    window.location.href = `/customers/${customerId}/purchases`;
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedCustomer) return;
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/customers/${selectedCustomer.id}/`,
        { withCredentials: true }
      );
      setCustomers((prev) => prev.filter((cust) => cust.id !== selectedCustomer.id));
      setShowModal(false);
      setSelectedCustomer(null);
    } catch (err) {
      alert('Failed to delete the customer.');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 text-sm">
      <PageHeader
        title="Customers"
        subtitle="Manage customer records and view purchase history."
      />

      <ContentCard
        title="Customer list"
        subtitle={loading ? 'Loading…' : error ? 'Error loading' : `${filteredCustomers.length} customer(s)`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="input-onyango max-w-md"
            />
            <Link
              href="/customers/add"
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Add Customer
            </Link>
          </div>
          {error && (
            <p className="rounded-xl bg-error-50 px-4 py-2 text-sm font-medium text-error-700 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </p>
          )}
          <DataTable>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Rating</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => {
                  const stars = getStarRating(cust.total_purchases ?? 0);
                  return (
                    <tr key={cust.id}>
                      <td>{cust.id}</td>
                      <td className="font-medium">{cust.name}</td>
                      <td>{cust.phone_number}</td>
                      <td>{cust.email || '—'}</td>
                      <td className="text-lg font-semibold text-warning-500">
                        {renderStars(stars)}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 text-[10px] font-semibold">
                          {cust.customer_type && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                              {cust.customer_type}
                            </span>
                          )}
                          {cust.is_vip && (
                            <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-white">
                              VIP
                            </span>
                          )}
                          {cust.is_blacklisted && (
                            <span className="rounded-full bg-red-600/90 px-2 py-0.5 text-white">
                              BLACKLISTED
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/customers/${cust.id}/purchases`}
                            className="rounded-lg border border-brand-500/30 px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          >
                            View purchases
                          </Link>
                          <Link
                            href={`/customers/${cust.id}/edit`}
                            className="rounded-lg border border-gray-500/30 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/60"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(cust)}
                            className="rounded-lg border border-error-500/30 px-2.5 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 dark:text-gray-400">
                    No matching customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </div>
      </ContentCard>

      {showModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="border-l-4 border-error-500 pl-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Confirm deletion</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to delete <strong>{selectedCustomer.name}</strong>? This cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-xl bg-error-500 px-4 py-2 text-sm font-semibold text-white hover:bg-error-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
