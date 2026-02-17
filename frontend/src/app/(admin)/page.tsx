"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import WorkshopDashboardBlock from "@/components/ecommerce/WorkshopDashboardBlock";
import { DashboardWelcome } from "@/components/ecommerce/DashboardWelcome";
import { useAuth } from "@/context/auth-context";
import { ShoppingCart, Wrench } from "lucide-react";

interface Unit {
  id: number;
  code: string;
  name: string;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);

  const isCrossUnit = user && ["admin", "owner", "manager"].includes(user.role);
  const shopUnit = units.find((u) => u.code === "shop");
  const workshopUnit = units.find((u) => u.code === "workshop");

  useEffect(() => {
    if (loading) return;
    if (user?.unit_code === "workshop" && !isCrossUnit) {
      router.replace("/onyango/dashboard");
      return;
    }
    if (user?.unit_code === "shop" && user?.role === "cashier") {
      router.replace("/shop-dashboard");
      return;
    }
  }, [user?.unit_code, user?.role, loading, router, isCrossUnit]);

  useEffect(() => {
    if (!isCrossUnit) return;
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/onyango/units/`, { withCredentials: true })
      .then((r) => setUnits(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [isCrossUnit]);

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700 sm:h-10 sm:w-64" />
        <section className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800 sm:h-32" />
          <div className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800 sm:h-32" />
        </section>
      </div>
    );
  }

  if (user?.unit_code === "workshop" && !isCrossUnit) return null;
  if (user?.unit_code === "shop" && user?.role === "cashier") return null;

  const showBothUnits = isCrossUnit && (shopUnit || workshopUnit);

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardWelcome />

      {showBothUnits ? (
        <>
          {/* Shop unit */}
          {shopUnit && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <ShoppingCart className="h-5 w-5 text-brand-500" />
                {shopUnit.name}
              </h2>
              <section className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                <EcommerceMetrics unitId={shopUnit.id} />
              </section>
              <section className="grid gap-4 sm:gap-6 lg:grid-cols-12">
                <div className="min-w-0 lg:col-span-8">
                  <MonthlySalesChart unitId={shopUnit.id} />
                </div>
                <div className="min-w-0 lg:col-span-4">
                  <MonthlyTarget unitId={shopUnit.id} />
                </div>
              </section>
              <section className="grid gap-4 sm:gap-6 lg:grid-cols-12">
                <div className="min-w-0 lg:col-span-8">
                  <RecentOrders unitId={shopUnit.id} />
                </div>
                <div className="min-w-0 lg:col-span-4">
                  <DemographicCard />
                </div>
              </section>
            </section>
          )}

          {/* Workshop unit */}
          {workshopUnit && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Wrench className="h-5 w-5 text-brand-500" />
                {workshopUnit.name}
              </h2>
              <WorkshopDashboardBlock />
            </section>
          )}
        </>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
            <EcommerceMetrics unitId={user?.unit_id ?? shopUnit?.id} />
          </section>
          <section className="grid gap-4 sm:gap-6 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-8">
              <MonthlySalesChart unitId={user?.unit_id ?? shopUnit?.id} />
            </div>
            <div className="min-w-0 lg:col-span-4">
              <MonthlyTarget unitId={user?.unit_id ?? shopUnit?.id} />
            </div>
          </section>
          <section className="grid gap-4 sm:gap-6 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-8">
              <RecentOrders unitId={user?.unit_id ?? shopUnit?.id} />
            </div>
            <div className="min-w-0 lg:col-span-4">
              <DemographicCard />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
