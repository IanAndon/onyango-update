'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/auth-context';
import {
  PackageCheck,
  PackageX,
  ArrowUpDown,
  Trash2,
  Pencil,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import { DataTable } from '@/components/layout/DataTable';

interface Unit {
  id: number;
  code: string;
  name: string;
}

interface StockEntry {
  id: number;
  product: {
    name: string;
    total_stock?: number;
    category_name?: string;
  };
  batch?: {
    batch_code: string;
    expiry_date?: string;
  } | null;
  entry_type: 'added' | 'updated' | 'deleted' | 'quantity_updated' | 'sold' | 'returned';
  quantity: number;
  date: string;
  recorded_by: {
    username: string;
    first_name: string;
    last_name: string;
  } | null;
}

const entryIcons: Record<string, React.ReactNode> = {
  added: <PackageCheck className="text-green-500" size={16} />,
  updated: <Pencil className="text-blue-500" size={16} />,
  deleted: <Trash2 className="text-red-500" size={16} />,
  quantity_updated: <ArrowUpDown className="text-yellow-500" size={16} />,
  sold: <PackageX className="text-purple-500" size={16} />,
  returned: <ArrowUpDown className="text-green-600" size={16} />,
};

export default function StockAuditPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitFilter, setUnitFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager';

  useEffect(() => {
    if (isAdmin) {
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/onyango/units/`, { withCredentials: true })
        .then((r) => setUnits(r.data || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  const fetchStockEntries = async (date?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        start_date: date || dateFilter,
        end_date: date || dateFilter,
      };
      if (isAdmin && unitFilter) params.unit = unitFilter;
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/stock-entries/`,
        { withCredentials: true, params }
      );
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setEntries(data);
    } catch (err) {
      console.error('Error fetching stock audits', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockEntries(dateFilter);
  }, [dateFilter, unitFilter]);

  const filteredEntries = entries.filter((entry) =>
    entry.product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-sm">
      <PageHeader
        title="Stock audit trail"
        subtitle="View inventory movements by date and product."
        action={
          <div className="flex flex-wrap gap-2">
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
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input-onyango w-auto min-w-[140px]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name..."
              className="input-onyango max-w-[220px]"
            />
          </div>
        }
      />

      <ContentCard
        title="Entries"
        subtitle={loading ? 'Loading…' : `${filteredEntries.length} entr(y/ies)`}
      >
        <DataTable>
          <thead>
            <tr>
              <th>Type</th>
              <th>Product</th>
              <th>Category</th>
              <th>Batch</th>
              <th>Quantity</th>
              <th>Total stock</th>
              <th>Recorded by</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 dark:text-gray-400">Loading…</td>
              </tr>
            ) : filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 dark:text-gray-400">No matching entries found.</td>
              </tr>
            ) : (
              filteredEntries.map((entry) => {
                const fullName = entry.recorded_by
                  ? `${entry.recorded_by.first_name} ${entry.recorded_by.last_name}`.trim() || entry.recorded_by.username
                  : 'N/A';
                const batchCode = entry.batch?.batch_code ?? '—';
                return (
                  <tr key={entry.id}>
                    <td className="flex items-center gap-2 capitalize">
                      {entryIcons[entry.entry_type]}
                      <span className="inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-white/10">
                        {entry.entry_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="font-medium">{entry.product.name}</td>
                    <td>{entry.product.category_name || '—'}</td>
                    <td>{batchCode}</td>
                    <td>{entry.quantity}</td>
                    <td>{entry.product.total_stock ?? '—'}</td>
                    <td>{fullName}</td>
                    <td title={entry.date}>
                      {new Date(entry.date).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </DataTable>
      </ContentCard>
    </div>
  );
}
