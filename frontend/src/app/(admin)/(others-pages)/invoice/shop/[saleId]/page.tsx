"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { InvoiceLayout } from "@/components/reports/InvoiceLayout";
import ContentCard from "@/components/layout/ContentCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Customer {
  name?: string;
  phone?: string;
}

interface User {
  username?: string;
}

interface SaleItem {
  id: number;
  product: { name: string };
  quantity: number;
  price_per_unit: string | number;
  total_price: string | number;
}

interface Sale {
  id: number;
  date: string;
  customer?: Customer | null;
  user?: User | null;
  items?: SaleItem[];
  total_amount?: string | number;
  discount_amount?: string | number;
  final_amount?: string | number;
  paid_amount?: string | number;
  payment_status: string;
  payment_method?: string;
}

export default function ShopInvoicePage({ params }: { params: { saleId: string } }) {
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSale = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(
          `${API_BASE}/api/sales/${params.saleId}/`,
          { withCredentials: true }
        );
        setSale(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load sale.");
      } finally {
        setLoading(false);
      }
    };
    fetchSale();
  }, [params.saleId]);

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

  if (error || !sale) {
    return (
      <div className="invoice-page mx-auto max-w-5xl p-4 sm:p-8">
        <ContentCard
          title="Invoice"
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
            {error || "Sale not found."}
          </p>
        </ContentCard>
      </div>
    );
  }

  const customerName = sale.customer?.name || "Walk-in customer";
  const customerLines: string[] = [];
  if ((sale as any).customer?.phone) customerLines.push(`Phone: ${(sale as any).customer.phone}`);
  if ((sale as any).customer?.address) customerLines.push(`Address: ${(sale as any).customer.address}`);
  if (sale.payment_method) customerLines.push(`Payment method: ${sale.payment_method}`);

  const totalAmount = Number(sale.total_amount ?? 0);
  const discount = Number(sale.discount_amount ?? 0);
  const finalTotal = Number(sale.final_amount ?? totalAmount - discount);
  const paid = Number(sale.paid_amount ?? 0);
  const balance = Math.max(0, finalTotal - paid);

  const invoiceDate = new Date(sale.date).toLocaleString();

  const lines = (sale.items || []).map((item) => ({
    description: item.product?.name || "Item",
    quantity: item.quantity,
    unitPrice: Number(item.price_per_unit),
    total: Number(item.total_price),
  }));

  return (
    <div className="invoice-page mx-auto max-w-5xl space-y-4 p-4 sm:p-8">
      <div className="flex items-center justify-between print-hidden">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Shop invoice #{sale.id}
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
        title="Shop invoice"
        companyName="Onyango Construction"
        companySubtitle="Shop unit"
        companyContacts={[
          "Phone: +255 788 885 926 / +255 654 623 712 / +255 746 464 585",
          "Email: sales@onyangoconstructions.co.tz",
          "Website: onyango-constructions.co.tz",
        ]}
        customer={{
          name: customerName,
          lines: customerLines,
        }}
        meta={{
          invoiceNumber: String(sale.id),
          date: invoiceDate,
          unitName: "Shop",
          paymentStatus: sale.payment_status,
          cashier: sale.user?.username,
        }}
        lines={lines}
        totals={{
          subtotal: totalAmount,
          discount,
          total: finalTotal,
          paid,
          balance,
        }}
        notes="Please keep this invoice as proof of purchase. Goods once sold may only be returned according to company policy."
      />
    </div>
  );
}

