"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/utils/api";

interface RepairJobDetail {
  id: number;
  customer_detail: { name: string; phone: string };
  item_description: string;
  issue_description: string;
  status: string;
  priority: string;
  intake_date: string;
  due_date: string | null;
  assigned_to_username: string | null;
  labour_charges: { id: number; description: string; amount: string }[];
  parts_used: { product_name: string; quantity_used: number; unit_cost: string; unit_price_to_customer: string }[];
  invoice: { id: number; total_amount: string; paid_amount: string; payment_status: string } | null;
}

interface JobTransfer {
  id: number;
  job_id: number | null;
  total_amount: string;
  settled_amount: string;
  status: string;
}

export default function RepairJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [job, setJob] = useState<RepairJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [transfers, setTransfers] = useState<JobTransfer[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [materialPayAmount, setMaterialPayAmount] = useState("");

  const fetchJob = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`api/onyango/repair-jobs/${id}/`);
      setJob(res as RepairJobDetail);
    } catch (err) {
      setError("Failed to load job");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    if (!id) return;
    try {
      setLoadingTransfers(true);
      const res = await api.get(`api/onyango/transfer-orders/?job=${id}`);
      const list = Array.isArray(res) ? res : res?.results ?? [];
      setTransfers(list as JobTransfer[]);
    } catch (err) {
      console.error("Failed to load transfers", err);
    } finally {
      setLoadingTransfers(false);
    }
  };

  useEffect(() => {
    fetchJob();
    fetchTransfers();
  }, [id]);

  const handleComplete = async () => {
    try {
      await api.post(`api/onyango/repair-jobs/${id}/complete/`);
      await fetchJob();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed");
    }
  };

  const handleCollect = async () => {
    try {
      await api.post(`api/onyango/repair-jobs/${id}/collect/`);
      await fetchJob();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed");
    }
  };

  const handleRecordPayment = async () => {
    if (!job?.invoice) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }
    const total = parseFloat(job.invoice.total_amount);
    const paid = parseFloat(job.invoice.paid_amount);
    if (amount > total - paid) {
      alert(`Remaining balance: ${(total - paid).toLocaleString()} TZS`);
      return;
    }
    setPaymentLoading(true);
    try {
      await api.post("api/onyango/repair-payments/", {
        invoice: job.invoice.id,
        amount,
        payment_method: paymentMethod,
      });
      setPaymentAmount("");
      await fetchJob();
      await fetchTransfers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.response?.data?.error || "Failed to record payment");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error || !job) return <div className="p-4 text-red-500">{error || "Not found"}</div>;

  const hasInvoice = !!job.invoice;
  const invoiceTotal = hasInvoice ? parseFloat(job.invoice!.total_amount) : 0;
  const invoicePaidSoFar = hasInvoice ? parseFloat(job.invoice!.paid_amount) : 0;
  const invoiceRemaining = Math.max(0, invoiceTotal - invoicePaidSoFar);
  const paymentInput = parseFloat(paymentAmount || "0") || 0;
  const invoiceRemainingAfterInput = Math.max(0, invoiceRemaining - Math.max(0, paymentInput));

  const invoicePaid =
    hasInvoice && invoicePaidSoFar >= invoiceTotal;

  const transfersWithOutstanding = transfers.map((t) => {
    const total = Number(t.total_amount) || 0;
    const settled = Number(t.settled_amount) || 0;
    const outstanding = total - settled;
    return { ...t, total, settled, outstanding };
  });

  const totalMaterialsCost = transfersWithOutstanding.reduce(
    (sum, t) => sum + t.total,
    0
  );
  const materialsPaidToShop = transfersWithOutstanding.reduce(
    (sum, t) => sum + t.settled,
    0
  );
  const materialsOutstandingTotal = transfersWithOutstanding.reduce(
    (sum, t) => sum + t.outstanding,
    0
  );
  const workshopTargetIncome = Math.max(0, invoiceTotal - totalMaterialsCost);
  const workshopIncomeRealized = Math.max(
    0,
    invoicePaidSoFar - materialsPaidToShop
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/onyango/repair-jobs"
            className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ← Back to jobs
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              Repair #{job.id}
            </h1>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {job.status.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {job.status === "in_progress" || job.status === "received" || job.status === "on_hold" ? (
            <button
              onClick={handleComplete}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Mark completed
            </button>
          ) : null}
          {job.status === "completed" ? (
            <button
              onClick={handleCollect}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Mark collected
            </button>
          ) : null}
        </div>
      </div>

      {/* Job + invoice */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Job details</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Customer</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {job.customer_detail?.name} — {job.customer_detail?.phone}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Item</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{job.item_description}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Issue</dt>
              <dd className="text-gray-900 dark:text-white">{job.issue_description || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Assigned to</dt>
              <dd className="text-gray-900 dark:text-white">{job.assigned_to_username || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Intake date</dt>
              <dd className="text-gray-900 dark:text-white">
                {job.intake_date ? new Date(job.intake_date).toLocaleString() : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invoice & payments</h2>
            {job.invoice && (
              <Link
                href={`/invoice/workshop/${job.id}`}
                className="print-hidden inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Open invoice
              </Link>
            )}
          </div>
          {job.invoice ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Total</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  TZS {invoiceTotal.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Paid</dt>
                <dd className="text-gray-900 dark:text-white">
                  TZS {invoicePaidSoFar.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Remaining</dt>
                <dd className="font-medium text-amber-700 dark:text-amber-300">
                  TZS {invoiceRemaining.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Payment status</dt>
                <dd className="text-gray-900 dark:text-white">
                  {job.invoice.payment_status}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-gray-500">No invoice yet.</p>
          )}
          {job.invoice && invoiceRemaining > 0 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <h3 className="mb-3 font-medium text-gray-900 dark:text-white">Record payment</h3>
              <div className="flex flex-wrap gap-3">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Amount (TZS)"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input-onyango h-10 w-32 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input-onyango h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="card">Card</option>
                </select>
                <button
                  type="button"
                  onClick={handleRecordPayment}
                  disabled={paymentLoading || !paymentAmount}
                  className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {paymentLoading ? "Processing…" : "Record payment"}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Remaining now:{" "}
                <span className="font-semibold">
                  TZS {invoiceRemaining.toLocaleString()}
                </span>
                {paymentInput > 0 && paymentInput <= invoiceRemaining && (
                  <>
                    {" · After this payment: "}
                    <span className="font-semibold">
                      TZS {invoiceRemainingAfterInput.toLocaleString()}
                    </span>
                  </>
                )}
              </p>
            </div>
          )}
          {job.labour_charges?.length > 0 && (
            <>
              <h3 className="mt-4 font-medium text-gray-900 dark:text-white">Labour</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {job.labour_charges.map((l) => (
                  <li key={l.id} className="flex justify-between">
                    <span>{l.description}</span>
                    <span>TZS {l.amount}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {job.parts_used?.length > 0 && (
            <>
              <h3 className="mt-4 font-medium text-gray-900 dark:text-white">Parts</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {job.parts_used.map((p, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{p.product_name} x{p.quantity_used}</span>
                    <span>TZS {p.unit_price_to_customer}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Workshop view of materials owed to shop */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Workshop payments to shop (materials)
          </h2>
          {job.invoice && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Job payment status:{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {job.invoice.payment_status}
              </span>
            </span>
          )}
        </div>
        {loadingTransfers ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading materials…</p>
        ) : transfersWithOutstanding.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No materials issued from the shop for this job (or data not available).
          </p>
        ) : (
          <div className="space-y-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-800 dark:text-gray-300">
                  <th className="py-1.5 pr-2">Transfer</th>
                  <th className="py-1.5 px-2 text-right">Total</th>
                  <th className="py-1.5 px-2 text-right">Paid to shop</th>
                  <th className="py-1.5 px-2 text-right">Outstanding</th>
                  <th className="py-1.5 pl-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {transfersWithOutstanding.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                    <td className="py-1.5 pr-2 font-medium text-gray-900 dark:text-white">
                      Transfer #{t.id}
                    </td>
                    <td className="py-1.5 px-2 text-right text-gray-800 dark:text-gray-200">
                      TZS {t.total.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-right text-gray-800 dark:text-gray-200">
                      TZS {t.settled.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-right font-semibold text-amber-700 dark:text-amber-300">
                      {t.outstanding > 0 ? `TZS ${t.outstanding.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-1.5 pl-2 text-center text-gray-700 dark:text-gray-300">
                      {t.status.replace("_", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Simple payment form against first outstanding transfer (manual, clear logic) */}
            {(() => {
              const firstOutstanding = transfersWithOutstanding.find((t) => t.outstanding > 0);
              if (!firstOutstanding) return null;
              const disabled = !invoicePaid || firstOutstanding.outstanding <= 0;
              const materialInput = parseFloat(materialPayAmount || "0") || 0;
              const materialAfterInput = Math.max(
                0,
                firstOutstanding.outstanding - Math.max(0, materialInput)
              );
              return (
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-gray-900/40">
                  <div className="mb-2 font-medium text-gray-900 dark:text-white">
                    Pay materials to shop (Transfer #{firstOutstanding.id})
                  </div>
                  {!invoicePaid && (
                    <p className="mb-2 text-[11px] text-red-600 dark:text-red-400">
                      You cannot pay materials until this job is fully paid by the customer.
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Amount (TZS)"
                      value={materialPayAmount}
                      onChange={(e) => setMaterialPayAmount(e.target.value)}
                      className="input-onyango h-9 w-32 rounded-lg border border-gray-200 bg-white px-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <button
                      type="button"
                      disabled={disabled || !materialPayAmount}
                      onClick={async () => {
                        const amount = parseFloat(materialPayAmount);
                        if (isNaN(amount) || amount <= 0) {
                          alert("Enter a valid amount.");
                          return;
                        }
                        if (amount > firstOutstanding.outstanding) {
                          alert(
                            `Outstanding for this transfer is TZS ${firstOutstanding.outstanding.toLocaleString()}`
                          );
                          return;
                        }
                        try {
                          await api.post(
                            `api/onyango/transfer-orders/${firstOutstanding.id}/pay/`,
                            { amount }
                          );
                          setMaterialPayAmount("");
                          await fetchTransfers();
                        } catch (err: any) {
                          alert(
                            err?.response?.data?.error ||
                              err?.response?.data?.detail ||
                              "Failed to record materials payment"
                          );
                        }
                      }}
                      className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Pay materials
                    </button>
                    <p className="mt-1 w-full text-[11px] text-gray-500 dark:text-gray-400 md:mt-0 md:w-auto">
                      Outstanding now: TZS {firstOutstanding.outstanding.toLocaleString()}
                      {materialInput > 0 &&
                        materialInput <= firstOutstanding.outstanding && (
                          <>
                            {" · After this payment: TZS "}
                            {materialAfterInput.toLocaleString()}
                          </>
                        )}
                    </p>
                  </div>
                </div>
              );
            })()}
            {/* Summary: fixed job amount vs materials vs workshop income */}
            {hasInvoice && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-[11px] dark:border-gray-700 dark:bg-gray-900">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                  Job amount vs materials (workshop income)
                </h3>
                <dl className="space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500 dark:text-gray-400">
                      Job amount (fixed / invoice total)
                    </dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      TZS {invoiceTotal.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500 dark:text-gray-400">
                      Materials cost (from shop)
                    </dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      TZS {totalMaterialsCost.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500 dark:text-gray-400">
                      Workshop income (fixed − materials)
                    </dt>
                    <dd className="font-semibold text-emerald-700 dark:text-emerald-300">
                      TZS {workshopTargetIncome.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 pt-1">
                    <dt className="text-gray-500 dark:text-gray-400">
                      Income realized so far
                      <span className="block text-[10px] text-gray-400 dark:text-gray-500">
                        (job payments received − materials paid to shop)
                      </span>
                    </dt>
                    <dd className="font-semibold text-gray-900 dark:text-gray-100">
                      TZS {workshopIncomeRealized.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500 dark:text-gray-400">
                      Materials outstanding to shop (all transfers)
                    </dt>
                    <dd className="font-semibold text-amber-700 dark:text-amber-300">
                      TZS {materialsOutstandingTotal.toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
