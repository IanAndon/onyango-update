"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";
import api from "@/utils/api";
import { useAuth } from "@/context/auth-context";

/**
 * Workshop route: where workshop staff create and view material requests.
 * Shop cashiers approve requests at /onyango/shop/material-requests instead.
 */
interface MaterialRequest {
  id: number;
  status: string;
  repair_job_id: number | null;
  requested_by_username: string;
  created_at: string;
  lines: { product_name: string; quantity_requested: number }[];
  repair_job_detail?: {
    id: number;
    item_description: string;
    customer_detail?: { name: string; phone: string };
  } | null;
}

export default function MaterialRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchRequests = () => {
    setLoading(true);
    const url = statusFilter
      ? `api/onyango/material-requests/?status=${statusFilter}`
      : "api/onyango/material-requests/";
    api
      .get(url)
      .then((res) => {
        setRequests(Array.isArray(res) ? res : res?.results ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this material request? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await api.delete(`api/onyango/material-requests/${id}/`);
      fetchRequests();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(res || "Failed to delete request");
    } finally {
      setDeletingId(null);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Material requests (Workshop)
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Workshop requests materials from shop. Create requests here; shop approves at Shop → Approve requests.
          </p>
        </div>
        <Link
          href="/onyango/material-requests/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New request
        </Link>
      </div>
      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {loading && <p>Loading...</p>}
      {!loading && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">ID</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Job / Customer</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Status</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Requested by</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Created</th>
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No requests.
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const job = r.repair_job_detail;
                  const customerName = job?.customer_detail?.name;
                  const status = (r.status ?? "").toString().toLowerCase();
                  const canEditOrDelete = status === "rejected" || status === "draft";
                  return (
                    <tr
                      key={r.id}
                      className="cursor-pointer border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      onClick={() => router.push(`/onyango/material-requests/${r.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/onyango/material-requests/${r.id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          #{r.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">
                        {job ? (
                          <>
                            <div className="font-semibold">
                              Repair #{job.id} — {job.item_description}
                            </div>
                            {customerName && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Customer: {customerName}
                              </div>
                            )}
                            {r.lines?.length > 0 && (
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Materials:{" "}
                                {r.lines
                                  .map((ln) => `${ln.product_name} × ${ln.quantity_requested}`)
                                  .join(", ")}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            (No job linked)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusColors[r.status] ?? ""
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{r.requested_by_username}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/onyango/material-requests/${r.id}`}
                            className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            View details
                          </Link>
                          {canEditOrDelete && (
                            <>
                              <Link
                                href={`/onyango/material-requests/${r.id}/edit`}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Pencil size={12} /> Edit
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => handleDelete(e, r.id)}
                                disabled={deletingId === r.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
                              >
                                <Trash2 size={12} /> {deletingId === r.id ? "Deleting…" : "Delete"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
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
