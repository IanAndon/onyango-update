"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import api from "@/utils/api";

interface PurchaseOrder {
  id: number;
  supplier_name: string;
  order_date: string;
  status: string;
  created_at: string;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("api/onyango/purchase-orders/").then((res) => {
      setOrders(Array.isArray(res) ? res : res?.results ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    partially_received: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    received: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase orders</h1>
          <p className="text-gray-500 dark:text-gray-400">Shop purchasing</p>
        </div>
        <Link
          href="/onyango/purchase-orders/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New PO
        </Link>
      </div>
      {loading && <p>Loading...</p>}
      {!loading && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">ID</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Supplier</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Status</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No purchase orders.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium">#{o.id}</td>
                    <td className="px-4 py-3">{o.supplier_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[o.status] ?? ""}`}>
                        {o.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(o.order_date).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
