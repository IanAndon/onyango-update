"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { InvoiceLayout } from "@/components/reports/InvoiceLayout";
import ContentCard from "@/components/layout/ContentCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface LabourCharge {
  id: number;
  description: string;
  amount: string | number;
}

interface PartUsed {
  id?: number;
  product_name: string;
  quantity_used: number;
  unit_price_to_customer: string | number;
}

interface CustomerDetail {
  name: string;
  phone?: string;
}

interface Invoice {
  id: number;
  total_amount: string | number;
  paid_amount: string | number;
  payment_status: string;
  created_at: string;
}

interface Job {
  id: number;
  item_description: string;
  issue_description?: string;
  customer_detail?: CustomerDetail;
  unit: number;
  invoice: Invoice | null;
  labour_charges: LabourCharge[];
  parts_used: PartUsed[];
}

export default function WorkshopInvoicePage({ params }: { params: { jobId: string } }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(
          `${API_BASE}/api/onyango/repair-jobs/${params.jobId}/`,
          { withCredentials: true }
        );
        setJob(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load repair job.");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [params.jobId]);

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="invoice-page mx-auto max-w-5xl p-4 sm:p-8">
        <ContentCard>
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading invoice…</p>
        </ContentCard>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="invoice-page mx-auto max-w-5xl p-4 sm:p-8">
        <ContentCard
          title="Workshop invoice"
          subtitle="There was a problem loading this invoice."
          action={
            <button
              type="button"
              onClick={handleBack}
              className="print-hidden rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Back
            </button>
          }
        >
          <p className="text-sm text-error-600 dark:text-error-400">
            {error || "Repair job not found."}
          </p>
        </ContentCard>
      </div>
    );
  }

  const inv = job.invoice;
  const total = Number(inv?.total_amount ?? 0);
  const paid = Number(inv?.paid_amount ?? 0);
  const balance = Math.max(0, total - paid);
  const invoiceDate = inv
    ? new Date(inv.created_at).toLocaleString()
    : new Date().toLocaleString();

  const customerName = job.customer_detail?.name || "Walk-in customer";
  const customerLines: string[] = [];
  if (job.customer_detail?.phone) {
    customerLines.push(`Phone: ${job.customer_detail.phone}`);
  }
  if ((job as any).customer_detail?.address) {
    customerLines.push(`Address: ${(job as any).customer_detail.address}`);
  }
  customerLines.push(`Job #${job.id}`);
  if (job.item_description) {
    customerLines.push(`Item: ${job.item_description}`);
  }
  if (job.issue_description) {
    customerLines.push(`Issue: ${job.issue_description}`);
  }

  const lines = [
    ...job.labour_charges.map((l) => ({
      description: l.description || "Labour",
      quantity: 1,
      unitPrice: Number(l.amount),
      total: Number(l.amount),
    })),
    ...job.parts_used.map((p) => ({
      description: `${p.product_name} x${p.quantity_used}`,
      quantity: p.quantity_used,
      unitPrice: Number(p.unit_price_to_customer),
      total: Number(p.unit_price_to_customer) * p.quantity_used,
    })),
  ];

  return (
    <div className="invoice-page mx-auto max-w-5xl space-y-4 p-4 sm:p-8">
      <div className="flex items-center justify-between print-hidden">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Workshop invoice #{inv?.id ?? job.id}
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      <InvoiceLayout
        title="Workshop invoice"
        companyName="Onyango Construction"
        companySubtitle="Workshop unit"
        companyContacts={[
          "P.O. Box ___, ______",
          "Phone: ____",
        ]}
        customer={{
          name: customerName,
          lines: customerLines,
        }}
        meta={{
          invoiceNumber: inv ? String(inv.id) : String(job.id),
          date: invoiceDate,
          unitName: "Workshop",
        }}
        lines={lines}
        totals={{
          total,
          paid,
          balance,
        }}
        notes="Thank you for choosing our workshop. Please pay the remaining balance before collecting your item."
      />
    </div>
  );
}

