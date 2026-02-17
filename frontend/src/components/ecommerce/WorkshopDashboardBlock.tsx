"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Wrench, Package, Truck, ClipboardList } from "lucide-react";
import axios from "axios";
import StatCard from "@/components/layout/StatCard";
import ContentCard from "@/components/layout/ContentCard";

interface WorkshopData {
  daily_sales: number;
  repair_revenue_today: number;
  workshop_materials_paid_today: number;
  workshop_income_today: number;
  low_stock_count: number;
  pending_repairs: number;
  completed_repairs_today: number;
  pending_transfers_count: number;
  pending_transfer_amount: number;
}

export default function WorkshopDashboardBlock() {
  const [data, setData] = useState<WorkshopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/onyango/dashboard/`,
          { withCredentials: true }
        );
        setData(res.data as WorkshopData);
      } catch (err) {
        setError("Failed to load workshop data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50 sm:h-32" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Repair revenue today"
          value={`TZS ${(data?.repair_revenue_today ?? 0).toLocaleString()}`}
          icon={<Wrench className="h-5 w-5 sm:h-6 sm:w-6" />}
          iconBg="brand"
        />
        <StatCard
          label="Pending repairs"
          value={String(data?.pending_repairs ?? 0)}
          icon={<Package className="h-5 w-5 sm:h-6 sm:w-6" />}
          iconBg="gray"
        />
        <StatCard
          label="Completed today"
          value={String(data?.completed_repairs_today ?? 0)}
          icon={<ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />}
          iconBg="success"
        />
        <StatCard
          label="Pending transfers"
          value={`${data?.pending_transfers_count ?? 0} · TZS ${(data?.pending_transfer_amount ?? 0).toLocaleString()}`}
          icon={<Truck className="h-5 w-5 sm:h-6 sm:w-6" />}
          iconBg="gray"
        />
      </div>
      <ContentCard title="Workshop" subtitle="Repairs & transfers">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/onyango/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
          >
            <Wrench className="h-4 w-4" /> Full workshop dashboard
          </Link>
          <Link
            href="/onyango/repair-jobs"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Repair jobs
          </Link>
          <Link
            href="/onyango/cashbook"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Cashbook
          </Link>
        </div>
      </ContentCard>
    </div>
  );
}
