"use client";

import React, { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import ContentCard from "@/components/layout/ContentCard";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface SalesSummary {
  monthly_revenue: number;
  monthly_sales_count: number;
  todays_revenue: number;
  prev_month_revenue: number;
  progress_percent: number;
}

interface MonthlyTargetProps {
  /** Optional unit ID to filter sales summary. */
  unitId?: number | null;
}

export default function MonthlyTarget({ unitId }: MonthlyTargetProps) {
  const [data, setData] = useState<SalesSummary | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/sales-summary/`);
        if (unitId != null) url.searchParams.set("unit", String(unitId));
        const res = await fetch(url.toString(), { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch");
        setData(await res.json());
      } catch (e) {
        console.error(e);
      }
    }
    fetchSummary();
  }, [unitId]);

  const series = data ? [Math.min(100, Math.max(0, data.progress_percent))] : [0];

  const options: ApexOptions = {
    colors: ["#00BFFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 220,
      sparkline: { enabled: true },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: { size: "70%" },
        track: {
          background: "#e5e7eb",
          strokeWidth: "100%",
          margin: 4,
        },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: "28px",
            fontWeight: "700",
            offsetY: -30,
            color: "#111827",
            formatter: (val) => `${val?.toFixed(0) ?? 0}%`,
          },
        },
      },
    },
    fill: { type: "solid", colors: ["#00BFFF"] },
    stroke: { lineCap: "round" },
    labels: ["Progress"],
  };

  return (
    <ContentCard title="Monthly target" subtitle="Revenue vs target">
      <div className="flex flex-col items-center">
        <div className="w-full max-w-[200px] sm:max-w-[240px]">
          <ReactApexChart options={options} series={series} type="radialBar" height={220} />
        </div>
        <div className="mt-3 grid w-full grid-cols-3 gap-2 rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/50 sm:mt-4 sm:gap-3 sm:rounded-xl sm:p-3">
          <div className="text-center">
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 sm:text-xs">Target</p>
            <p className="truncate text-xs font-semibold text-gray-900 dark:text-white sm:text-sm">TZS 20K</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 sm:text-xs">Revenue</p>
            <p className="truncate text-xs font-semibold text-gray-900 dark:text-white sm:text-sm">
              {data ? data.monthly_revenue.toLocaleString() : "0"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 sm:text-xs">Today</p>
            <p className="truncate text-xs font-semibold text-gray-900 dark:text-white sm:text-sm">
              {data ? data.todays_revenue.toLocaleString() : "0"}
            </p>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-center text-[10px] text-gray-500 dark:text-gray-400 sm:mt-4 sm:text-xs">
          {data
            ? `This month: TZS ${data.monthly_revenue.toLocaleString()} ${data.progress_percent >= 0 ? "↑" : "↓"} from last month`
            : "Loading…"}
        </p>
      </div>
    </ContentCard>
  );
}
