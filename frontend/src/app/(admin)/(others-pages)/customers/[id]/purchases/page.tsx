'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'next/navigation';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';

interface ProductBatch {
  id: number;
  batch_code: string;
  expiry_date: string;
}

interface Product {
  id: number;
  name: string;
  category_name: string;
  batches: ProductBatch[];
}

interface Purchase {
  id: number;
  product: Product;
  quantity: number;
  price_per_unit: string; // string from backend
  total_price: string;    // string from backend
  // No direct "date" in response; use created_at of latest batch or show "N/A"
}

export default function CustomerPurchasesPage() {
  const { id } = useParams();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/customers/${id}/purchases/`,
          { withCredentials: true }
        );
        setPurchases(res.data || []);
      } catch (err) {
        console.error('Failed to load purchases:', err);
        setError('Could not load purchases.');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, [id]);

  // Format ISO date string to readable format or fallback
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get latest batch expiry or creation date for display
  const getLatestBatchDate = (batches: ProductBatch[]) => {
    if (!batches.length) return 'N/A';
    // Find latest created_at date in batches or expiry_date if you prefer
    // Your API snippet only has expiry_date so we'll use that
    const latest = batches.reduce((latestDate, batch) => {
      const batchDate = new Date(batch.expiry_date);
      return batchDate > latestDate ? batchDate : latestDate;
    }, new Date(0));
    return formatDate(latest.toISOString());
  };

  return (
    <div className="space-y-6 text-sm">
      <PageBreadcrumb pageTitle="Customer Purchases" />
      <h1 className="text-xl font-bold text-gray-800 dark:text-white">
        Purchase History for Customer ID: <span className="text-green-600">{id}</span>
      </h1>

      {loading && <p className="text-gray-600 dark:text-gray-300">Loading purchases...</p>}
      {error && <p className="text-red-600 font-semibold">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[800px]">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/10">
                <tr>
                  {[
                    'Product Name',
                    'Category',
                    'Qty',
                    'Price per Unit (TZS)',
                    'Total (TZS)',
                    'Latest Batch Expiry',
                  ].map((head) => (
                    <th
                      key={head}
                      className="px-5 py-3 text-xs font-medium text-gray-600 dark:text-gray-300"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {purchases.length > 0 ? (
                  purchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-white/10">
                      <td className="px-5 py-4 text-gray-700 dark:text-white">
                        {purchase.product?.name || 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-gray-700 dark:text-white">
                        {purchase.product?.category_name || 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-gray-700 dark:text-white">{purchase.quantity}</td>
                      <td className="px-5 py-4 text-gray-700 dark:text-white">
                        {parseFloat(purchase.price_per_unit).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-5 py-4 text-gray-700 dark:text-white">
                        {parseFloat(purchase.total_price).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-5 py-4 text-gray-700 dark:text-white">
                        {purchase.product?.batches
                          ? getLatestBatchDate(purchase.product.batches)
                          : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-4 text-center text-gray-500 dark:text-gray-400">
                      No purchases found for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
