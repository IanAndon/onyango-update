"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import api from "@/utils/api";
import { InvoiceLayout } from "@/components/reports/InvoiceLayout";
import ContentCard from "@/components/layout/ContentCard";

interface QuoteItem {
  id: number;
  description: string;
  quantity: string | number;
  unit_price: string | number;
  line_total: string | number;
}

interface Quote {
  id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_tin?: string;
  vat_percent?: string | number | null;
  unit_name?: string;
  unit?: number;
  created_by_username?: string;
  status: string;
  quote_date?: string | null;
  valid_until?: string | null;
  subtotal: string | number;
  discount_amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  notes?: string;
  created_at: string;
  items: QuoteItem[];
}

export default function QuoteInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`api/quotes/${id}/`);
        setQuote(res as Quote);
      } catch (err: any) {
        setError(
          err?.response?.data?.detail ||
            err?.response?.data?.error ||
            "Failed to load quote."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [id]);

  useEffect(() => {
    if (!quote) return;
    const customerName = (quote.customer_name || "Customer").replace(/[/\\?%*:|"<>]/g, "-").trim() || "Customer";
    const newTitle = `Quote ${quote.id} - ${customerName}`;
    const previousTitle = typeof document !== "undefined" ? document.title : "";
    document.title = newTitle;
    return () => {
      document.title = previousTitle;
    };
  }, [quote]);

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
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading quote…</p>
        </ContentCard>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="invoice-page mx-auto max-w-5xl p-4 sm:p-8">
        <ContentCard
          title="Quote"
          subtitle="There was a problem loading this quote."
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
            {error || "Quote not found."}
          </p>
        </ContentCard>
      </div>
    );
  }

  const customerLines: string[] = [];
  if (quote.customer_phone) customerLines.push(`Phone: ${quote.customer_phone}`);
  if (quote.customer_address) customerLines.push(`Address: ${quote.customer_address}`);
  if (quote.customer_tin) customerLines.push(`TIN: ${quote.customer_tin}`);
  if (quote.valid_until) {
    customerLines.push(
      `Valid until: ${new Date(quote.valid_until).toLocaleDateString()}`
    );
  }

  const lines = quote.items.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    total: Number(item.line_total),
  }));

  const subtotal = Number(quote.subtotal ?? 0);
  const discount = Number(quote.discount_amount ?? 0);
  const tax = Number(quote.tax_amount ?? 0);
  const total = Number(quote.total_amount ?? 0);

  const displayDate = quote.quote_date
    ? new Date(quote.quote_date).toLocaleDateString()
    : new Date(quote.created_at).toLocaleString();

  const paymentInfoBlock = (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-600 pb-2 print:text-base">
        Payment information
      </h3>
      <div className="grid gap-4 text-sm font-medium text-gray-900 sm:grid-cols-2 print:grid-cols-2 print:text-base">
        <div className="space-y-2 rounded-lg border-2 border-gray-400 bg-white p-3 print:border-gray-600">
          <p className="font-bold text-gray-900">Bank transfer — NMB</p>
          <dl className="space-y-1 text-gray-900">
            <div className="flex justify-between gap-2">
              <dt>Account No:</dt>
              <dd className="font-mono font-semibold">61310067986</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Account Name:</dt>
              <dd className="font-semibold">ONYANGO COMPANY LIMITED</dd>
            </div>
          </dl>
        </div>
        <div className="space-y-2 rounded-lg border-2 border-gray-400 bg-white p-3 print:border-gray-600">
          <p className="font-bold text-gray-900">Bank transfer — CRDB</p>
          <dl className="space-y-1 text-gray-900">
            <div className="flex justify-between gap-2">
              <dt>Account No:</dt>
              <dd className="font-mono font-semibold">01526457738800</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Account Name:</dt>
              <dd className="font-semibold">SALIM ISSA MYANGE</dd>
            </div>
          </dl>
        </div>
        <div className="space-y-2 rounded-lg border-2 border-gray-400 bg-white p-3 sm:col-span-2 print:col-span-1 print:border-gray-600">
          <p className="font-bold text-gray-900">M-Pesa</p>
          <dl className="space-y-1 text-gray-900">
            <div className="flex justify-between gap-2">
              <dt>Lipa Namba:</dt>
              <dd className="font-mono font-semibold">56653982</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Name:</dt>
              <dd className="font-semibold">ONYANGO CONSTRUCTION Co. LTD</dd>
            </div>
          </dl>
        </div>
        <div className="space-y-2 rounded-lg border-2 border-gray-400 bg-white p-3 sm:col-span-2 print:col-span-1 print:border-gray-600">
          <p className="font-bold text-gray-900">Tigo / Airtel Money (Lipa na M-Pesa)</p>
          <dl className="space-y-1 text-gray-900">
            <div className="flex justify-between gap-2">
              <dt>Lipa No:</dt>
              <dd className="font-mono font-semibold">15257148</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Name:</dt>
              <dd className="font-semibold">ONYANGO Co. LTD</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );

  return (
    <div className="invoice-page mx-auto max-w-5xl space-y-4 p-4 sm:p-8">
      <div className="flex items-center justify-between print-hidden">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Quote #{quote.id}
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
        title="Pro-forma invoice"
        companyName="Onyango Construction Co. LTD"
        companySubtitle={quote.unit_name || "Shop"}
        companyContacts={[
          "P.O. Box 131",
          "Phone: 0788885926 / 0654623712",
          "Email: Sales@onyangoconstruction.co.tz",
          "Website: www.onyangoconstruction.co.tz",
          "TIN: 162297872",
        ]}
        customer={{
          name: quote.customer_name || "Customer",
          lines: customerLines,
        }}
        meta={{
          invoiceNumber: String(quote.id),
          invoiceNumberLabel: "Quote No",
          dateLabel: quote.quote_date ? "Date" : "Created",
          date: displayDate,
          unitName: quote.unit_name || "Shop",
          cashier: quote.created_by_username,
          paymentStatus: quote.status,
        }}
        lines={lines}
        totals={{
          subtotal,
          discount,
          tax,
          taxLabel: quote.vat_percent != null && Number(quote.vat_percent) > 0 ? `VAT (${Number(quote.vat_percent)}%)` : undefined,
          total,
        }}
        notes={
          quote.notes ||
          "This is a quotation / pro-forma invoice only. Final amounts may change once the sale is confirmed."
        }
        paymentInfo={paymentInfoBlock}
        showSignature={true}
      />
    </div>
  );
}

