"use client";

import React from "react";
import ContentCard from "@/components/layout/ContentCard";

interface InvoiceLine {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total: number;
}

interface InvoiceMeta {
  invoiceNumber?: string;
  invoiceNumberLabel?: string;
  dateLabel?: string;
  date: string;
  unitName: string;
  unitCode?: string;
  cashier?: string;
  paymentStatus?: string;
}

interface InvoiceParty {
  name: string;
  subtitle?: string;
  lines?: string[];
}

interface InvoiceTotals {
  subtotal?: number;
  discount?: number;
  tax?: number;
  taxLabel?: string;
  total: number;
  paid?: number;
  balance?: number;
}

interface InvoiceLayoutProps {
  title?: string;
  companyName: string;
  companySubtitle?: string;
  companyContacts?: string[];
  customer: InvoiceParty;
  meta: InvoiceMeta;
  lines: InvoiceLine[];
  totals: InvoiceTotals;
  notes?: string;
  paymentInfo?: React.ReactNode;
  showSignature?: boolean;
}

export function InvoiceLayout({
  title = "Invoice",
  companyName,
  companySubtitle,
  companyContacts = [],
  customer,
  meta,
  lines,
  totals,
  notes,
  paymentInfo,
  showSignature = false,
}: InvoiceLayoutProps) {
  const fmt = (n: number | undefined) =>
    typeof n === "number" ? n.toLocaleString("en-TZ", { minimumFractionDigits: 0 }) : "-";

  return (
    <div className="invoice-sheet mx-auto max-w-4xl space-y-6 rounded-3xl border-2 border-gray-300 bg-white p-4 text-sm text-gray-900 shadow-xl print:border-2 print:border-gray-800 print:rounded-lg print:shadow-none sm:p-8">
      <header className="rounded-2xl bg-brand-50/60 px-4 py-4 ring-1 ring-brand-100 sm:px-6 sm:py-5 print:bg-brand-50/90 print:ring-brand-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-brand-200 sm:h-16 sm:w-16">
              <img
                src="/images/logo/onyango-logo-light.png"
                alt={companyName}
                className="h-12 w-12 object-contain sm:h-14 sm:w-14"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl print:text-base print:font-bold">
                {companyName}
              </h1>
              {companySubtitle && (
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-brand-700 print:text-gray-900">
                  {companySubtitle}
                </p>
              )}
              {companyContacts.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs font-medium text-gray-800 print:text-sm print:text-gray-900">
                  {companyContacts.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm print:bg-brand-600 print:text-white print:[color-adjust:exact] print:[print-color-adjust:exact]">
              {title}
              {meta.unitName && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                  {meta.unitName}
                </span>
              )}
            </p>
            {meta.invoiceNumber && (
              <p className="mt-2 text-sm font-semibold text-gray-900 print:text-base">
                {meta.invoiceNumberLabel || "Invoice No"}: <span className="font-bold">#{meta.invoiceNumber}</span>
              </p>
            )}
            <p className="mt-1 text-sm font-medium text-gray-800 print:text-gray-900">
              {meta.dateLabel || "Date"}: <span className="font-semibold">{meta.date}</span>
            </p>
            {meta.cashier && (
              <p className="mt-1 text-sm font-medium text-gray-800 print:text-gray-900">
                Prepared by: <span className="font-semibold">{meta.cashier}</span>
              </p>
            )}
            {meta.paymentStatus && (
              <p className="mt-1 text-sm font-medium text-gray-800 print:text-gray-900">
                Status: <span className="inline-flex rounded-full border border-gray-700 bg-gray-200 px-2 py-0.5 text-xs font-semibold capitalize text-gray-900 print:border-gray-800 print:bg-gray-300">
                  {meta.paymentStatus}
                </span>
              </p>
            )}
            {meta.unitCode && (
              <p className="mt-1 text-xs font-semibold text-gray-700 print:text-gray-900">
                Unit code: <span className="font-medium">{meta.unitCode}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      <section className="grid gap-4 rounded-xl border border-gray-300 bg-gray-100/70 p-4 text-sm print:border-gray-600 print:bg-gray-100 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-900 print:text-sm">
            Bill to
          </h2>
          <p className="mt-1 text-base font-bold text-gray-900 print:text-lg">{customer.name}</p>
          {customer.subtitle && (
            <p className="text-sm font-medium text-gray-800 print:text-gray-900">{customer.subtitle}</p>
          )}
          {customer.lines && customer.lines.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-sm font-medium text-gray-800 print:text-base print:text-gray-900">
              {customer.lines.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="sm:text-right">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-900 print:text-sm">
            Document details
          </h2>
          <p className="mt-1 text-sm font-medium text-gray-800 print:text-gray-900">
            Unit: <span className="font-semibold text-gray-900">{meta.unitName}</span>
          </p>
          {meta.unitCode && (
            <p className="mt-1 text-sm font-medium text-gray-800 print:text-gray-900">
              Code: <span className="font-semibold">{meta.unitCode}</span>
            </p>
          )}
        </div>
      </section>

      <section>
        <ContentCard noPadding className="border-2 border-gray-300 shadow-none print:border-gray-600">
          <div className="max-w-full overflow-x-auto">
            <table className="min-w-full text-sm print:text-base">
              <thead className="bg-gray-200 print:bg-gray-300">
                <tr>
                  <th className="w-10 px-3 py-2.5 text-center text-xs font-bold text-gray-900 print:text-sm">No.</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-900 print:text-sm">Description</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-900 print:text-sm">Qty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-900 print:text-sm">Unit price (TZS)</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-900 print:text-sm">Total (TZS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 print:divide-gray-500">
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 print:bg-transparent">
                    <td className="px-3 py-2.5 text-center text-sm font-semibold text-gray-800 print:text-gray-900">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2.5 align-top text-sm font-medium text-gray-900 print:text-base">
                      {line.description}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-medium text-gray-800 print:text-gray-900">
                      {line.quantity != null ? line.quantity : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-medium text-gray-800 print:text-gray-900">
                      {line.unitPrice != null ? fmt(line.unitPrice) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-900 print:text-base">
                      {fmt(line.total)}
                    </td>
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm font-medium text-gray-900">
                      No line items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ContentCard>
      </section>

      <section className="flex flex-col gap-4 border-t-2 border-gray-300 pt-4 print:border-gray-600 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm text-sm font-medium text-gray-800 print:text-base print:text-gray-900">
          {notes && (
            <>
              <h3 className="mb-1 font-bold text-gray-900 print:text-sm">Notes</h3>
              <p className="leading-relaxed">{notes}</p>
            </>
          )}
        </div>
        <div className="w-full max-w-xs">
          <dl className="space-y-1 text-sm font-medium text-gray-900 print:text-base">
            {typeof totals.subtotal === "number" && (
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="font-semibold">{fmt(totals.subtotal)}</dd>
              </div>
            )}
            {typeof totals.discount === "number" && totals.discount > 0 && (
              <div className="flex justify-between">
                <dt>Discount</dt>
                <dd className="font-semibold">- {fmt(totals.discount)}</dd>
              </div>
            )}
            {typeof totals.tax === "number" && totals.tax > 0 && (
              <div className="flex justify-between">
                <dt>{totals.taxLabel ?? "Tax"}</dt>
                <dd className="font-semibold">{fmt(totals.tax)}</dd>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t-2 border-gray-400 pt-2 text-base print:border-gray-700 print:pt-3">
              <dt className="font-bold text-gray-900">Total (TZS)</dt>
              <dd className="text-lg font-bold text-gray-900 print:text-xl">
                {fmt(totals.total)}
              </dd>
            </div>
            {typeof totals.paid === "number" && (
              <div className="flex justify-between">
                <dt>Paid</dt>
                <dd className="font-semibold">{fmt(totals.paid)}</dd>
              </div>
            )}
            {typeof totals.balance === "number" && (
              <div className="flex justify-between">
                <dt>Balance</dt>
                <dd className="font-bold">{fmt(totals.balance)}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {paymentInfo && (
        <section className="rounded-xl border-2 border-gray-300 bg-gray-100/80 p-4 print:border-gray-600 print:bg-gray-100">
          {paymentInfo}
        </section>
      )}

      {showSignature && (
        <section className="border-t-2 border-gray-300 pt-6 print:border-gray-600 print:pt-8">
          <div className="flex flex-col items-start gap-2">
            <img
              src="/images/authorized-signature.png"
              alt="Authorized signature"
              className="h-12 w-auto max-w-[200px] object-contain object-left print:h-14 print:max-w-[220px]"
            />
            <p className="text-xs font-bold uppercase tracking-wide text-gray-800 print:text-sm print:text-gray-900">
              Authorized signature
            </p>
          </div>
        </section>
      )}

      <footer className="border-t-2 border-gray-400 pt-4 text-center text-sm font-semibold text-gray-800 print:border-gray-600 print:text-gray-900">
        <p>Thank you for your business.</p>
      </footer>
    </div>
  );
}

