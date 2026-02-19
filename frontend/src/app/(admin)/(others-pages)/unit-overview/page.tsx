'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import { DataTable, DataTableHead, DataTableBody } from '@/components/layout/DataTable';
import { DollarSign, Wallet, Package, Wrench, Building2 } from 'lucide-react';

interface UnitData {
  unit: { id: number; code: string; name: string };
  expenses: { count: number; total: number; recent: any[] };
  loans: { count: number; outstanding: number; recent: any[] };
  stock_movements: { count: number; recent: any[] };
  repair_debts?: { count: number; outstanding: number };
}

interface OverviewData {
  units: UnitData[];
  totals: {
    expenses_count: number;
    expenses_total: number;
    loans_count: number;
    loans_outstanding: number;
  };
}

export default function AdminUnitOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeUnit, setActiveUnit] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    async function fetchOverview() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/unit-overview/`,
          { withCredentials: true }
        );
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError('Failed to load unit overview.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchOverview();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading overview…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Unit Overview" subtitle="Expenses, loans, and stock by unit" />
        <ContentCard>
          <p className="text-error-600 font-semibold">{error || 'No data.'}</p>
        </ContentCard>
      </div>
    );
  }

  const units = data.units;
  const selectedUnit = activeUnit === 'all' ? null : units.find((u) => String(u.unit.id) === activeUnit);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unit Overview"
        subtitle="Expenses, debts/loans, and stock movements by unit (admin)"
      />

      {/* Totals summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/20">
              <DollarSign className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total expenses (month)</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {Number(data.totals.expenses_total).toLocaleString()} TZS
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{data.totals.expenses_count} record(s)</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20">
              <Wallet className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loans outstanding</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {Number(data.totals.loans_outstanding).toLocaleString()} TZS
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{data.totals.loans_count} active loan(s)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Unit tabs */}
      <div className="flex flex-wrap gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800/80">
        <button
          type="button"
          onClick={() => setActiveUnit('all')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            activeUnit === 'all'
              ? 'bg-white text-brand-600 shadow-sm dark:bg-gray-800 dark:text-brand-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <Building2 className="h-4 w-4" />
          All units
        </button>
        {units.map((u) => (
          <button
            key={u.unit.id}
            type="button"
            onClick={() => setActiveUnit(String(u.unit.id))}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              activeUnit === String(u.unit.id)
                ? 'bg-white text-brand-600 shadow-sm dark:bg-gray-800 dark:text-brand-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {u.unit.code === 'workshop' ? (
              <Wrench className="h-4 w-4" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            {u.unit.name}
          </button>
        ))}
      </div>

      {/* Unit-specific content */}
      {(selectedUnit || activeUnit === 'all') && (
        <div className="grid gap-6 lg:grid-cols-2">
          {activeUnit === 'all'
            ? units.map((u) => (
                <ContentCard key={u.unit.id} title={u.unit.name} subtitle={`${u.unit.code} unit`}>
                  <UnitSummary unitData={u} />
                </ContentCard>
              ))
            : selectedUnit && (
                <>
                  <ContentCard title={`${selectedUnit.unit.name} — Expenses`} subtitle={`${selectedUnit.expenses.count} record(s), ${Number(selectedUnit.expenses.total).toLocaleString()} TZS`}>
                    {selectedUnit.expenses.recent.length > 0 ? (
                      <DataTable>
                        <DataTableHead>
                          <tr>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Date</th>
                          </tr>
                        </DataTableHead>
                        <DataTableBody>
                          {selectedUnit.expenses.recent.map((e: any) => (
                            <tr key={e.id}>
                              <td>{e.description}</td>
                              <td>{Number(e.amount).toLocaleString()} TZS</td>
                              <td>{new Date(e.date).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </DataTableBody>
                      </DataTable>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No expenses this month.</p>
                    )}
                  </ContentCard>
                  <ContentCard title={`${selectedUnit.unit.name} — Loans`} subtitle={`${selectedUnit.loans.count} active, ${Number(selectedUnit.loans.outstanding).toLocaleString()} TZS outstanding`}>
                    {selectedUnit.loans.recent.length > 0 ? (
                      <DataTable>
                        <DataTableHead>
                          <tr>
                            <th>ID</th>
                            <th>Customer</th>
                            <th>Outstanding</th>
                            <th>Status</th>
                          </tr>
                        </DataTableHead>
                        <DataTableBody>
                          {selectedUnit.loans.recent.map((l: any) => (
                            <tr key={l.id}>
                              <td>#{l.id}</td>
                              <td>{l.customer_name}</td>
                              <td>{(Number(l.final_amount) - Number(l.paid_amount)).toLocaleString()} TZS</td>
                              <td>
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    l.payment_status === 'paid' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                                  }`}
                                >
                                  {l.payment_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </DataTableBody>
                      </DataTable>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No loans.</p>
                    )}
                  </ContentCard>
                  {selectedUnit.unit.code === 'workshop' && selectedUnit.repair_debts && (
                    <ContentCard
                      title="Workshop repair debts"
                      subtitle={`${selectedUnit.repair_debts.count} unpaid/partial, ${Number(selectedUnit.repair_debts.outstanding).toLocaleString()} TZS`}
                    >
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Repair invoices with unpaid or partial payment status.
                      </p>
                    </ContentCard>
                  )}
                  <ContentCard title={`${selectedUnit.unit.name} — Stock movements`} subtitle={`${selectedUnit.stock_movements.count} total`}>
                    {selectedUnit.stock_movements.recent.length > 0 ? (
                      <DataTable>
                        <DataTableHead>
                          <tr>
                            <th>Product</th>
                            <th>Type</th>
                            <th>Qty</th>
                            <th>Date</th>
                          </tr>
                        </DataTableHead>
                        <DataTableBody>
                          {selectedUnit.stock_movements.recent.map((s: any) => (
                            <tr key={s.id}>
                              <td>{s.product?.name || '—'}</td>
                              <td>{s.entry_type || '—'}</td>
                              <td>{s.quantity}</td>
                              <td>{new Date(s.date).toLocaleString()}</td>
                            </tr>
                          ))}
                        </DataTableBody>
                      </DataTable>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No stock movements.</p>
                    )}
                  </ContentCard>
                </>
              )}
        </div>
      )}
    </div>
  );
}

function UnitSummary({ unitData }: { unitData: UnitData }) {
  const u = unitData.unit;
  const exp = unitData.expenses;
  const loans = unitData.loans;
  const stock = unitData.stock_movements;
  const repair = unitData.repair_debts;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Expenses</p>
          <p className="font-bold text-gray-900 dark:text-white">{Number(exp.total).toLocaleString()} TZS</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{exp.count} record(s)</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Loans</p>
          <p className="font-bold text-amber-600 dark:text-amber-400">{Number(loans.outstanding).toLocaleString()} TZS</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{loans.count} active</p>
        </div>
        {repair && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Repair debts</p>
            <p className="font-bold text-rose-600 dark:text-rose-400">{Number(repair.outstanding).toLocaleString()} TZS</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{repair.count} invoice(s)</p>
          </div>
        )}
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Stock moves</p>
          <p className="font-bold text-gray-900 dark:text-white">{stock.count}</p>
        </div>
      </div>
    </div>
  );
}
