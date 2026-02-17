"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  Check,
  X,
  Package,
  User,
  FileText,
  Pencil,
  Trash2,
  Send,
} from "lucide-react";
import api from "@/utils/api";
import { useAuth } from "@/context/auth-context";

interface MaterialRequestLine {
  id: number;
  product: number;
  product_name: string;
  quantity_requested: number;
  quantity_in_stock: number;
  unit_price: string;
}

interface MaterialRequestDetail {
  id: number;
  status: string;
  repair_job_id: number | null;
  repair_job_detail?: {
    id: number;
    item_description: string;
    issue_description?: string;
    intake_date?: string;
    status?: string;
    customer_detail?: {
      id: number;
      name: string;
      phone?: string;
      email?: string;
      address?: string;
    };
    job_type_detail?: { name: string; code?: string };
    invoice?: {
      total_amount?: string;
      paid_amount?: string;
      payment_status?: string;
    };
  } | null;
  lines: MaterialRequestLine[];
  requested_by_username: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function MaterialRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth();
  const [request, setRequest] = useState<MaterialRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const userRole = (user?.role ?? "").toString().toLowerCase();
  const unitCode = (user?.unit_code ?? "").toString().toLowerCase();
  const isShopUnit = unitCode === "shop";
  const canApproveOrReject =
    !!user &&
    ["cashier", "admin", "owner", "manager"].includes(userRole) &&
    isShopUnit;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`api/onyango/material-requests/${id}/`)
      .then((res) => setRequest(res as MaterialRequestDetail))
      .catch(() => setRequest(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    if (!user || !request || (request.status ?? "").toString().toLowerCase() !== "submitted") return;
    setSubmitting(true);
    try {
      const res = (await api.post(`api/onyango/material-requests/${request.id}/approve/`, {})) as {
        transfer_id?: number;
      };
      const tid = res?.transfer_id;
      alert(
        "Request approved.\n\n" +
          "• Materials have been deducted from shop stock.\n" +
          (tid ? `• Transfer #${tid} has been saved to workshop pending payments (owed to shop).\n\n` : "") +
          "Workshop can settle this transfer from Transfer orders when ready."
      );
      router.push(canApproveOrReject ? "/onyango/shop/material-requests" : "/onyango/material-requests");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e?.response?.data?.error || "Failed to approve request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!user || !request || (request.status ?? "").toString().toLowerCase() !== "submitted") return;
    setSubmitting(true);
    try {
      await api.post(`api/onyango/material-requests/${request.id}/reject/`, {
        rejection_reason: rejectReason,
      });
      setShowRejectModal(false);
      setRejectReason("");
      router.push(canApproveOrReject ? "/onyango/shop/material-requests" : "/onyango/material-requests");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e?.response?.data?.error || "Failed to reject request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!request) return;
    if (!confirm("Delete this material request? This cannot be undone.")) return;
    setSubmitting(true);
    try {
      await api.delete(`api/onyango/material-requests/${request.id}/`);
      router.push("/onyango/material-requests");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e?.response?.data?.error || "Failed to delete request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!request) return;
    // Prevent resubmitting when any line has quantity greater than current stock
    const lines = request.lines || [];
    const overStock = lines.filter((ln) => {
      const stock = Number(ln.quantity_in_stock);
      const qty = Number(ln.quantity_requested);
      if (Number.isNaN(stock)) return false;
      return qty > stock;
    });
    if (overStock.length > 0) {
      const list = overStock
        .map(
          (ln) =>
            `${ln.product_name} (in stock ${ln.quantity_in_stock}, requested ${ln.quantity_requested})`
        )
        .join("\n- ");
      alert(
        "You cannot resubmit this request because some items exceed current shop stock:\n\n- " +
          list +
          "\n\nPlease edit the request and reduce the quantities first."
      );
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`api/onyango/material-requests/${request.id}/resubmit/`, {});
      setRequest((prev) => (prev ? { ...prev, status: "submitted" } : null));
      alert("Request resubmitted. Shop can approve or reject again.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e?.response?.data?.error || "Failed to resubmit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-full px-4 sm:px-6">
        <div className="w-full">
          <div className="mb-6 h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-4">
            <div className="h-12 max-w-[75%] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 min-w-0 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="w-full max-w-full px-4 sm:px-6">
        <div className="w-full">
        <Link
          href={canApproveOrReject ? "/onyango/shop/material-requests" : "/onyango/material-requests"}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to requests
        </Link>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
          <p className="text-gray-500 dark:text-gray-400">Request not found.</p>
        </div>
        </div>
      </div>
    );
  }

  const job = request.repair_job_detail;
  const customer = job?.customer_detail;
  const lines = request.lines || [];
  const totalMaterials = lines.reduce(
    (sum, ln) => sum + Number(ln.unit_price || 0) * ln.quantity_requested,
    0
  );
  const repairTotal = job?.invoice?.total_amount != null ? Number(job.invoice.total_amount) : null;
  const requestStatus = (request.status ?? "").toString().toLowerCase();
  const canAct = !!user && requestStatus === "submitted";
  const allInStock =
    lines.length === 0 ||
    lines.every((ln) => {
      const stock = Number(ln.quantity_in_stock);
      const req = Number(ln.quantity_requested);
      if (Number.isNaN(stock)) return true;
      return stock >= req;
    });

  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: {
      label: "Draft",
      className:
        "bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300 border border-slate-200 dark:border-slate-600",
    },
    submitted: {
      label: "Submitted",
      className:
        "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    },
    approved: {
      label: "Approved",
      className:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    },
    rejected: {
      label: "Rejected",
      className:
        "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800",
    },
  };
  const statusStyle = statusConfig[requestStatus] ?? {
    label: request.status ?? "—",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600",
  };

  const listHref = canApproveOrReject ? "/onyango/shop/material-requests" : "/onyango/material-requests";

  return (
    <div className="min-h-0 w-full max-w-full overflow-x-hidden px-4 sm:px-6">
      <div className="w-full space-y-4 pb-4 sm:space-y-5 sm:pb-6">
      {/* Breadcrumb & back */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href={listHref}
          className="inline-flex items-center gap-1.5 font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to requests
        </Link>
      </nav>

      {/* Header card */}
      <div className="min-w-0 rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-6">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
                Material Request <span className="text-gray-500 dark:text-gray-400">#{request.id}</span>
              </h1>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusStyle.className}`}
              >
                {statusStyle.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Requested by <span className="font-medium text-gray-700 dark:text-gray-300">{request.requested_by_username}</span>
              {" · "}
              {new Date(request.created_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
            {canApproveOrReject && (
              <>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={submitting || !canAct || !allInStock}
                  title={
                    !canAct
                      ? "Only submitted requests can be approved"
                      : !allInStock
                        ? "Insufficient stock for one or more items"
                        : undefined
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  <Check className="h-4 w-4" /> Accept & transfer
                </button>
                <button
                  type="button"
                  onClick={() => canAct && setShowRejectModal(true)}
                  disabled={submitting || !canAct}
                  title={!canAct ? "Only submitted requests can be rejected" : undefined}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:bg-gray-900/50 dark:hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" /> Reject
                </button>
                {!canAct && requestStatus !== "submitted" && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {requestStatus === "draft"
                      ? "Workshop must submit first."
                      : requestStatus === "approved" || requestStatus === "rejected"
                        ? "Already " + requestStatus + "."
                        : "Only submitted requests can be approved or rejected."}
                  </p>
                )}
              </>
            )}
            {user && !canApproveOrReject && requestStatus === "submitted" && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Only the <strong>shop cashier</strong> can approve or reject. You can edit or resubmit after rejection.
              </div>
            )}
            {/* Edit button - available for draft, rejected, submitted, and approved */}
            {(requestStatus === "rejected" ||
              requestStatus === "draft" ||
              requestStatus === "submitted" ||
              requestStatus === "approved") && (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/onyango/material-requests/${request.id}/edit`}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    requestStatus === "approved"
                      ? "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/50"
                      : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                  }`}
                >
                  <Pencil className="h-4 w-4" /> {requestStatus === "approved" ? "Add/Update materials" : "Edit"}
                </Link>
                {/* Resubmit and Delete - only for draft/rejected */}
                {(requestStatus === "rejected" || requestStatus === "draft") && (
                  <>
                    <button
                      type="button"
                      onClick={handleResubmit}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> Resubmit to shop
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:bg-gray-900/50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content grid - items-start so left column doesn't stretch and leave blank space */}
      <div className="grid min-w-0 items-start gap-4 sm:gap-5 lg:grid-cols-3">
        {/* Left column: Request info + Customer */}
        <div className="min-w-0 space-y-4 lg:col-span-1">
          <section className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                  <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </span>
                Request & ticket
              </h2>
            </div>
            <dl className="space-y-2.5 px-4 py-3">
              <div className="flex justify-between gap-2 text-sm">
                <dt className="text-gray-500 dark:text-gray-400">Request ID</dt>
                <dd className="font-medium text-gray-900 dark:text-white">#{request.id}</dd>
              </div>
              <div className="flex justify-between gap-2 text-sm">
                <dt className="text-gray-500 dark:text-gray-400">Repair job</dt>
                <dd className="font-medium">
                  {request.repair_job_id != null ? (
                    <Link
                      href={`/onyango/repair-jobs/${request.repair_job_id}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      #{request.repair_job_id}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2 text-sm">
                <dt className="text-gray-500 dark:text-gray-400">Requested by</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{request.requested_by_username}</dd>
              </div>
              <div className="flex justify-between gap-2 text-sm">
                <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {new Date(request.created_at).toLocaleString()}
                </dd>
              </div>
              {request.reviewed_at && (
                <div className="flex justify-between gap-2 text-sm">
                  <dt className="text-gray-500 dark:text-gray-400">Reviewed</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">
                    {new Date(request.reviewed_at).toLocaleString()}
                  </dd>
                </div>
              )}
              {job?.item_description && (
                <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                  <dt className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">Item / issue</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">{job.item_description}</dd>
                  {job.issue_description && (
                    <dd className="mt-1 text-sm text-gray-600 dark:text-gray-400">{job.issue_description}</dd>
                  )}
                </div>
              )}
            </dl>
          </section>

          {customer && (
            <section className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
              <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </span>
                  Customer
                </h2>
              </div>
              <dl className="space-y-2.5 px-4 py-3">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Name</dt>
                  <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">{customer.name}</dd>
                </div>
                {customer.phone && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Phone</dt>
                    <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">{customer.phone}</dd>
                  </div>
                )}
                {customer.email && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Email</dt>
                    <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">{customer.email}</dd>
                  </div>
                )}
                {customer.address && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Address</dt>
                    <dd className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{customer.address}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>

        {/* Right column: Materials table + totals */}
        <div className="min-w-0 lg:col-span-2">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
            <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
                  <Package className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </span>
                Materials & stock
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Product
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Qty
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      In stock
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Unit cost
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Line total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                        No materials in this request.
                      </td>
                    </tr>
                  ) : (
                    lines.map((ln, idx) => {
                      const ok = ln.quantity_in_stock >= ln.quantity_requested;
                      const lineTotal = Number(ln.unit_price || 0) * ln.quantity_requested;
                      return (
                        <tr
                          key={ln.id ?? idx}
                          className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-gray-800/30"
                        >
                          <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                            {ln.product_name}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                            {ln.quantity_requested}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                            {ln.quantity_in_stock}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                ok
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              }`}
                            >
                              {ok ? "OK" : "Insufficient"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                            {Number(ln.unit_price || 0).toLocaleString()} TZS
                          </td>
                          <td className="px-5 py-3 text-right font-medium tabular-nums text-gray-900 dark:text-white">
                            {lineTotal.toLocaleString()} TZS
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40">
              <div className="flex flex-col items-end gap-2 text-sm">
                <div className="flex w-full max-w-[240px] justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total materials</span>
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                    {totalMaterials.toLocaleString()} TZS
                  </span>
                </div>
                {repairTotal != null && (
                  <div className="flex w-full max-w-[240px] justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Repair order total</span>
                    <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                      {repairTotal.toLocaleString()} TZS
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {request.rejection_reason && (
            <section className="mt-6 rounded-2xl border border-red-200/80 bg-red-50/80 p-5 dark:border-red-900/50 dark:bg-red-900/20">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-300">
                <AlertCircle className="h-4 w-4" /> Rejection reason
              </h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-200">{request.rejection_reason}</p>
            </section>
          )}

          {request.notes && (
            <section className="mt-6 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notes</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{request.notes}</p>
            </section>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-modal-title"
          >
            <div className="p-6">
              <h3 id="reject-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Reject request
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Optionally provide a reason. The workshop will see this when the request is returned.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Out of stock for item X, please resubmit next week"
                rows={4}
                className="mt-4 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={submitting}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Rejecting…" : "Reject request"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
