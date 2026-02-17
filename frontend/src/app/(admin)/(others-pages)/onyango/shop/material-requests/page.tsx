"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import api from "@/utils/api";
import { useAuth } from "@/context/auth-context";

/**
 * Shop route: where the shop cashier sees material requests to approve or reject.
 * Workshop cashier must NOT use or see this page – they use /onyango/material-requests instead.
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

export default function ShopMaterialRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  // Workshop users must not see this page – redirect to workshop material requests
  const userUnit = (user?.unit_code ?? "").toString().toLowerCase();
  useEffect(() => {
    if (user && userUnit === "workshop") {
      router.replace("/onyango/material-requests");
    }
  }, [user, userUnit, router]);

  const canApproveOrReject =
    !!user &&
    userUnit !== "workshop" &&
    (user.role === "cashier" ||
      (["admin", "owner", "manager"].includes(user.role) && userUnit === "shop"));

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

  const handleApprove = async (id: number) => {
    if (!canApproveOrReject) return;
    setSubmittingId(id);
    try {
      const res = await api.post(`api/onyango/material-requests/${id}/approve/`, {}) as { transfer_id?: number };
      fetchRequests();
      const tid = res?.transfer_id;
      if (tid) alert(`Approved. Materials deducted. Transfer #${tid} saved to workshop pending payments.`);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to approve request");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!canApproveOrReject) return;
    const reason = window.prompt("Rejection reason (optional):", "");
    if (reason === null) return;
    setSubmittingId(id);
    try {
      await api.post(`api/onyango/material-requests/${id}/reject/`, {
        rejection_reason: reason,
      });
      fetchRequests();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to reject request");
    } finally {
      setSubmittingId(null);
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
            Approve material requests
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Review and approve or reject workshop material requests (Shop)
          </p>
        </div>
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
                <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Shop actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No requests to review.
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const job = r.repair_job_detail;
                  const customerName = job?.customer_detail?.name;
                  const canAct = canApproveOrReject && r.status === "submitted";
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
                        {canAct ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(r.id)}
                              disabled={submittingId === r.id}
                              className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {submittingId === r.id ? "Approving..." : "Approve & transfer"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(r.id)}
                              disabled={submittingId === r.id}
                              className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/30 disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <Link
                              href={`/onyango/material-requests/${r.id}`}
                              className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                              View details
                            </Link>
                          </div>
                        ) : (
                          <Link
                            href={`/onyango/material-requests/${r.id}`}
                            className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            View details
                          </Link>
                        )}
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
