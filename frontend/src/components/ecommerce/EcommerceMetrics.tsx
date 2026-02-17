"use client";

import React, { useEffect, useState } from "react";
import StatCard from "@/components/layout/StatCard";
import { BoxIconLine, DollarLineIcon } from "@/icons";
import axios from "axios";

interface MetricsData {
  total_sales: number;
  total_revenue: number;
  sales_change_percentage?: number;
  revenue_change_percentage?: number;
}

interface EcommerceMetricsProps {
  /** Optional unit ID to filter metrics (Shop or Workshop). */
  unitId?: number | null;
}

export const EcommerceMetrics = ({ unitId }: EcommerceMetricsProps) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const params = unitId != null ? { unit: unitId } : {};
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/metrics/`,
          { withCredentials: true, params }
        );
        setMetrics(response.data);
      } catch (err) {
        console.error("Failed to fetch metrics:", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [unitId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50" />
        <div className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <StatCard
        label="Total sales"
        value={metrics?.total_sales?.toLocaleString() ?? "0"}
        icon={<BoxIconLine className="h-6 w-6 sm:h-7 sm:w-7" />}
        iconBg="gray"
        trend={
          metrics?.sales_change_percentage != null
            ? { value: `${metrics.sales_change_percentage >= 0 ? "+" : ""}${metrics.sales_change_percentage.toFixed(1)}%`, positive: metrics.sales_change_percentage >= 0 }
            : undefined
        }
      />
      <StatCard
        label="Total revenue"
        value={`TZS ${metrics?.total_revenue?.toLocaleString() ?? "0"}`}
        icon={<DollarLineIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />}
        accent
        trend={
          metrics?.revenue_change_percentage != null
            ? { value: `${metrics.revenue_change_percentage >= 0 ? "+" : ""}${metrics.revenue_change_percentage.toFixed(1)}%`, positive: metrics.revenue_change_percentage >= 0 }
            : undefined
        }
      />
    </div>
  );
};
