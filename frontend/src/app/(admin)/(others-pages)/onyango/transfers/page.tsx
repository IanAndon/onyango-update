"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Package2, Truck } from "lucide-react";
import api from "@/utils/api";
import { useAuth } from "@/context/auth-context";

interface TransferOrder {
  id: number;
  from_unit_name: string;
  to_unit_name: string;
  status: string;
  total_amount: string;
  settled_amount: string;
  transfer_date: string;
  material_request?: number | null;
  lines?: {
    id: number;
    product: number;
    product_name: string;
    quantity: number;
    transfer_price: string;
  }[];
}

interface TransferSettlement {
  id: number;
  transfer_id: number;
  amount: number;
  payment_method: string | null;
  cashier: string | null;
  payment_date: string;
  type: "material_payment";
  cleared: boolean;
}

export default function TransfersPage() {
  const { user } = useAuth();
  const unitCode = (user?.unit_code ?? "").toString().toLowerCase();
  const isShop = unitCode === "shop";

  const [transfers, setTransfers] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  // tabs: 'pending' (outstanding), 'pending_clearance' (no outstanding but some settlements not cleared), 'cleared' (fully cleared)
  const [activeTab, setActiveTab] = useState<"pending" | "pending_clearance" | "cleared">("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [settlements, setSettlements] = useState<Record<number, TransferSettlement[]>>({});
  const [clearingId, setClearingId] = useState<number | null>(null);

  useEffect(() => {
    api
      .get(`api/onyango/transfer-orders/?date=${filterDate}`)
      .then((res) => {
        setTransfers(Array.isArray(res) ? res : res?.results ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterDate]);

  const loadSettlementsFor = async (transferId: number) => {
    if (!isShop) return;
    try {
      const res = await api.get(`api/onyango/transfer-settlements/?transfer_order=${transferId}`);
      const list = (Array.isArray(res) ? res : res?.results ?? []) as TransferSettlement[];
      setSettlements((prev) => ({ ...prev, [transferId]: list }));
    } catch (err) {
      console.error("Failed to load settlements", err);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    partially_settled: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    closed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };

  const computed = useMemo(() => {
    const withFlags = transfers.map((t) => {
      const total = Number(t.total_amount) || 0;
      const settled = Number(t.settled_amount) || 0;
      const outstanding = total - settled;
      // we infer clearance later from settlements map; here we only classify by money status
      return { ...t, total, settled, outstanding };
    });
    const totalAllOutstanding = withFlags.reduce(
      (sum, t) => sum + t.outstanding,
      0
    );
    return { withFlags, totalAllOutstanding };
  }, [transfers]);

  // derive filtered lists per tab, using settlements when we have them (for clearance status)
  const visibleTransfers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return computed.withFlags.filter((t) => {
      if (term) {
        const idMatch = String(t.id).includes(term);
        const mrMatch =
          typeof t.material_request === "number" &&
          String(t.material_request).includes(term);
        const fromToMatch =
          t.from_unit_name.toLowerCase().includes(term) ||
          t.to_unit_name.toLowerCase().includes(term);
        if (!idMatch && !mrMatch && !fromToMatch) {
          return false;
        }
      }
      const outstanding = t.outstanding > 0;
      const sList = settlements[t.id] || [];
      const hasSettlements = sList.length > 0;
      const anyUncleared = hasSettlements && sList.some((s) => !s.cleared);
      const allCleared = hasSettlements && sList.every((s) => s.cleared);

      if (activeTab === "pending") {
        // Money still owed to shop
        return outstanding;
      }
      if (activeTab === "pending_clearance") {
        // Fully paid in system (no outstanding) but some settlements not marked cleared
        return !outstanding && anyUncleared;
      }
      // activeTab === "cleared": fully paid + all settlements cleared (or no settlements but no outstanding)
      if (outstanding) return false;
      if (!hasSettlements) return true;
      return allCleared;
    });
  }, [activeTab, computed.withFlags, settlements]);

  const totalOutstandingVisible = visibleTransfers.reduce(
    (sum, t) => sum + t.outstanding,
    0
  );

  const title = isShop ? "Workshop payments" : "Transfer orders";
  const subtitle = isShop
    ? "Debts from workshop material requests (shop → workshop transfers)."
    : "Shop → Workshop material transfers.";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
            <Truck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              {title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Outstanding to shop:</span>
            <span className="font-semibold">
              TZS {computed.totalAllOutstanding.toLocaleString()}
            </span>
          </div>
          {/* Date filter */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <span className="hidden sm:inline text-gray-500 dark:text-gray-400">
              Date:
            </span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Tabs + search row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white text-xs font-medium shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-1.5 transition ${
                activeTab === "pending"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              Pending payments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pending_clearance")}
              className={`border-x border-gray-200 px-4 py-1.5 transition dark:border-gray-700 ${
                activeTab === "pending_clearance"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              Pending clearance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cleared")}
              className={`px-4 py-1.5 transition ${
                activeTab === "cleared"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              Closed & cleared
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, material request, unit..."
            className="w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>}
      {!loading && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white"></th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  Transfer
                </th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  From → To
                </th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  Total
                </th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  Settled
                </th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  Outstanding
                </th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleTransfers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {activeTab === "pending"
                      ? "No pending workshop payments."
                      : activeTab === "pending_clearance"
                      ? "No transfers waiting for clearance."
                      : "No closed & cleared transfers."}
                  </td>
                </tr>
              ) : (
                visibleTransfers.map((t) => {
                  const isExpanded = expandedId === t.id;
                  return (
                    <React.Fragment key={t.id}>
                      <tr className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                        <td className="px-3 py-3 align-top">
                          <button
                            type="button"
                            onClick={async () => {
                              const nextId = isExpanded ? null : t.id;
                              setExpandedId(nextId);
                              if (nextId && isShop && !settlements[nextId]) {
                                await loadSettlementsFor(nextId);
                              }
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                            aria-label={isExpanded ? "Hide details" : "Show details"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 align-top font-medium text-gray-900 dark:text-white">
                          <div className="flex flex-col gap-0.5">
                            <span>Transfer #{t.id}</span>
                            {typeof t.material_request === "number" && (
                              <Link
                                href={`/onyango/material-requests/${t.material_request}`}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                              >
                                <Package2 className="h-3 w-3" /> Material request #
                                {t.material_request}
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-gray-800 dark:text-gray-200">
                          {t.from_unit_name} → {t.to_unit_name}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              statusColors[t.status] ?? ""
                            }`}
                          >
                            {t.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-gray-800 dark:text-gray-200">
                          TZS {t.total.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 align-top text-gray-800 dark:text-gray-200">
                          TZS {t.settled.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {t.outstanding > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                              TZS {t.outstanding.toLocaleString()} pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              Cleared
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-gray-500 dark:text-gray-400">
                          {new Date(t.transfer_date).toLocaleString()}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-gray-100 last:border-0 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/60">
                          <td colSpan={8} className="px-4 pb-4 pt-0 align-top">
                            <div className="mt-2 grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                              <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs dark:border-gray-700 dark:bg-gray-900">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                                    <Package2 className="h-3 w-3" /> Transfer lines
                                  </h3>
                                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                    {t.lines?.length ?? 0} item(s)
                                  </span>
                                </div>
                                {t.lines && t.lines.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-[11px]">
                                      <thead>
                                        <tr className="border-b border-gray-100 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                          <th className="py-1 pr-2">Product</th>
                                          <th className="py-1 px-2 text-center">
                                            Qty
                                          </th>
                                          <th className="py-1 px-2 text-right">
                                            Unit cost
                                          </th>
                                          <th className="py-1 pl-2 text-right">
                                            Line total
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {t.lines.map((ln) => {
                                          const price = Number(ln.transfer_price) || 0;
                                          const lineTotal = price * ln.quantity;
                                          return (
                                            <tr
                                              key={ln.id}
                                              className="border-b border-gray-50 last:border-0 dark:border-gray-800/70"
                                            >
                                              <td className="py-1 pr-2 text-gray-900 dark:text-gray-100">
                                                {ln.product_name}
                                              </td>
                                              <td className="py-1 px-2 text-center text-gray-700 dark:text-gray-300">
                                                {ln.quantity}
                                              </td>
                                              <td className="py-1 px-2 text-right text-gray-700 dark:text-gray-300">
                                                {price.toLocaleString()} TZS
                                              </td>
                                              <td className="py-1 pl-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                                {lineTotal.toLocaleString()} TZS
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="py-4 text-center text-[11px] text-gray-500 dark:text-gray-400">
                                    No line details available.
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 text-xs dark:border-gray-700 dark:bg-gray-900">
                                <div>
                                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                                    Summary
                                  </h3>
                                  <dl className="mt-1 space-y-1.5">
                                    <div className="flex justify-between gap-2">
                                      <dt className="text-gray-500 dark:text-gray-400">
                                        Transfer ID
                                      </dt>
                                      <dd className="font-medium text-gray-900 dark:text-gray-100">
                                        #{t.id}
                                      </dd>
                                    </div>
                                    {typeof t.material_request === "number" && (
                                      <div className="flex justify-between gap-2">
                                        <dt className="text-gray-500 dark:text-gray-400">
                                          Material request
                                        </dt>
                                        <dd className="font-medium text-gray-900 dark:text-gray-100">
                                          <Link
                                            href={`/onyango/material-requests/${t.material_request}`}
                                            className="text-blue-600 hover:underline dark:text-blue-400"
                                          >
                                            #{t.material_request}
                                          </Link>
                                        </dd>
                                      </div>
                                    )}
                                    <div className="flex justify-between gap-2">
                                      <dt className="text-gray-500 dark:text-gray-400">
                                        From
                                      </dt>
                                      <dd className="font-medium text-gray-900 dark:text-gray-100">
                                        {t.from_unit_name}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                      <dt className="text-gray-500 dark:text-gray-400">
                                        To
                                      </dt>
                                      <dd className="font-medium text-gray-900 dark:text-gray-100">
                                        {t.to_unit_name}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-2 pt-1">
                                      <dt className="text-gray-500 dark:text-gray-400">
                                        Transfer date
                                      </dt>
                                      <dd className="font-medium text-gray-900 dark:text-gray-100">
                                        {new Date(
                                          t.transfer_date
                                        ).toLocaleString()}
                                      </dd>
                                    </div>
                                  </dl>
                                </div>
                                <div className="mt-auto border-t border-gray-100 pt-2 dark:border-gray-800/80">
                                  <dl className="space-y-1">
                                    <div className="flex justify-between gap-2">
                                      <dt className="text-gray-500 dark:text-gray-400">
                                        Total amount
                                      </dt>
                                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                                        TZS {t.total.toLocaleString()}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                      <dt className="text-gray-500 dark:text-gray-400">
                                        Settled
                                      </dt>
                                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                                        TZS {t.settled.toLocaleString()}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                      <dt className="text-gray-500 dark:text-gray-400">
                                        Outstanding
                                      </dt>
                                      <dd className="font-semibold text-amber-700 dark:text-amber-300">
                                        {t.outstanding > 0
                                          ? `TZS ${t.outstanding.toLocaleString()}`
                                          : "—"}
                                      </dd>
                                    </div>
                                  </dl>
                                </div>
                              </div>

                              {isShop && (
                                <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs dark:border-gray-700 dark:bg-gray-900">
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                                      Material payments from workshop
                                    </h3>
                                  </div>
                                  {settlements[t.id] && settlements[t.id].length > 0 ? (
                                    <table className="w-full text-[11px]">
                                      <thead>
                                        <tr className="border-b border-gray-100 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                          <th className="py-1 pr-2">Amount</th>
                                          <th className="py-1 px-2">Method</th>
                                          <th className="py-1 px-2">Date</th>
                                          <th className="py-1 px-2">By</th>
                                          <th className="py-1 pl-2 text-right">Cleared</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {settlements[t.id].map((s) => (
                                          <tr
                                            key={s.id}
                                            className="border-b border-gray-50 last:border-0 dark:border-gray-800/70"
                                          >
                                            <td className="py-1 pr-2 text-gray-900 dark:text-gray-100">
                                              TZS {s.amount.toLocaleString()}
                                            </td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                                              {s.payment_method || "—"}
                                            </td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                                              {new Date(s.payment_date).toLocaleString()}
                                            </td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                                              {s.cashier || "—"}
                                            </td>
                                            <td className="py-1 pl-2 text-right">
                                              {s.cleared ? (
                                                <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                  Cleared
                                                </span>
                                              ) : (
                                                <button
                                                  type="button"
                                                  disabled={!!clearingId}
                                                  onClick={async () => {
                                                    try {
                                                      setClearingId(s.id);
                                                      await api.post(
                                                        `api/onyango/transfer-settlements/${s.id}/clear/`,
                                                        {}
                                                      );
                                                      await loadSettlementsFor(t.id);
                                                    } catch (err: any) {
                                                      alert(
                                                        err?.response?.data?.error ||
                                                          "Failed to mark as cleared"
                                                      );
                                                    } finally {
                                                      setClearingId(null);
                                                    }
                                                  }}
                                                  className="inline-flex items-center rounded-full border border-gray-300 px-2 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                                                >
                                                  {clearingId === s.id ? "Saving…" : "Mark cleared"}
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <p className="py-3 text-[11px] text-gray-500 dark:text-gray-400">
                                      No material payments recorded yet for this transfer.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
