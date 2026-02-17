"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import api from "@/utils/api";

interface Supplier {
  id: number;
  name: string;
  phone: string;
  contact_person: string | null;
  email: string | null;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("api/onyango/suppliers/").then((res) => {
      setSuppliers(Array.isArray(res) ? res : res?.results ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suppliers</h1>
          <p className="text-gray-500 dark:text-gray-400">Shop supplier management</p>
        </div>
        <Link
          href="/onyango/suppliers/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Add supplier
        </Link>
      </div>
      {loading && <p>Loading...</p>}
      {!loading && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Name</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Phone</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Contact</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Email</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No suppliers.</td></tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                    <td className="px-4 py-3">{s.phone}</td>
                    <td className="px-4 py-3">{s.contact_person ?? "—"}</td>
                    <td className="px-4 py-3">{s.email ?? "—"}</td>
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
