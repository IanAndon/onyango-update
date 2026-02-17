"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Wrench, Package, Truck, ShoppingCart, AlertTriangle, ClipboardList } from "lucide-react";
import api from "@/utils/api";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/layout/StatCard";
import ContentCard from "@/components/layout/ContentCard";
import { useAuth } from "@/context/auth-context";

interface DashboardData {
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

export default function OnyangoDashboardPage() {
  const { user } = useAuth();
  const isWorkshopOnly = user?.unit_code === "workshop";
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get("api/onyango/dashboard/");
        setData(res as DashboardData);
      } catch (err) {
        setError("Failed to load dashboard");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={isWorkshopOnly ? "Workshop Dashboard" : "Onyango Hardware"} subtitle={isWorkshopOnly ? "Repairs, material requests and transfers." : "Business overview"} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={isWorkshopOnly ? "Workshop Dashboard" : "Onyango Hardware"} subtitle={isWorkshopOnly ? "Repairs, material requests and transfers." : "Business overview"} />
        <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      </div>
    );
  }

  const showShopMetrics = !isWorkshopOnly;

  return (
    <div className="space-y-8">
      <PageHeader
        title={isWorkshopOnly ? "Workshop Dashboard" : "Onyango Hardware"}
        subtitle={isWorkshopOnly ? "Repairs, material requests and transfers." : "Business overview"}
      />

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Key metrics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {showShopMetrics && (
            <StatCard
              label="Shop sales today"
              value={`TZS ${(data?.daily_sales ?? 0).toLocaleString()}`}
              icon={<ShoppingCart className="h-6 w-6" />}
              iconBg="success"
            />
          )}
          <StatCard
            label="Repair revenue today"
            value={`TZS ${(data?.repair_revenue_today ?? 0).toLocaleString()}`}
            icon={<Wrench className="h-6 w-6" />}
            iconBg="brand"
          />
          {isWorkshopOnly && (
            <>
              <StatCard
                label="Materials paid to shop today"
                value={`TZS ${(data?.workshop_materials_paid_today ?? 0).toLocaleString()}`}
                icon={<Truck className="h-6 w-6" />}
                iconBg="gray"
              />
              <StatCard
                label="Workshop income today (after materials)"
                value={`TZS ${(data?.workshop_income_today ?? 0).toLocaleString()}`}
                icon={<Wrench className="h-6 w-6" />}
                iconBg="success"
              />
            </>
          )}
          {showShopMetrics && (
            <StatCard
              label="Low stock items"
              value={String(data?.low_stock_count ?? 0)}
              icon={<AlertTriangle className="h-6 w-6" />}
              iconBg="warning"
            />
          )}
          <StatCard
            label="Pending repairs"
            value={String(data?.pending_repairs ?? 0)}
            icon={<Package className="h-6 w-6" />}
            iconBg="gray"
          />
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <StatCard
          label="Completed repairs today"
          value={String(data?.completed_repairs_today ?? 0)}
          icon={<ClipboardList className="h-6 w-6" />}
          iconBg="success"
        />
        <StatCard
          label={isWorkshopOnly ? "Workshop pending payments (owed to shop)" : "Pending transfers"}
          value={`${data?.pending_transfers_count ?? 0} · TZS ${(data?.pending_transfer_amount ?? 0).toLocaleString()}`}
          icon={<Truck className="h-6 w-6" />}
          iconBg="gray"
        />
      </div>

      <ContentCard title="Quick actions" subtitle="Jump to a section">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/onyango/repair-jobs"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
          >
            <Wrench className="h-4 w-4" /> Repair jobs
          </Link>
          <Link
            href="/onyango/material-requests"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/50"
          >
            <Package className="h-4 w-4" /> Material requests
          </Link>
          <Link
            href="/onyango/transfers"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/50"
          >
            <Truck className="h-4 w-4" /> Transfer orders
          </Link>
          {showShopMetrics && (
            <Link
              href="/onyango/suppliers"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/50"
            >
              Suppliers
            </Link>
          )}
        </div>
      </ContentCard>
    </div>
  );
}
