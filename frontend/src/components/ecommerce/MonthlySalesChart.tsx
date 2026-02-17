"use client";

import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import axios from "axios";
import ContentCard from "@/components/layout/ContentCard";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const CHART_COLOR = "#00BFFF";

interface MonthlySalesChartProps {
  /** Optional unit ID to filter sales (Shop or Workshop). */
  unitId?: number | null;
}

export default function MonthlySalesChart({ unitId }: MonthlySalesChartProps) {
  const [series, setSeries] = useState<{ name: string; data: number[] }[]>([{ name: "Sales", data: [] }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMonthlySales() {
      setLoading(true);
      setError(null);
      try {
        const url = new URL("/api/dashboard/monthly-sales/", API_BASE);
        if (unitId != null) {
          url.searchParams.set("unit", String(unitId));
        }

        const res = await axios.get(url.toString(), { withCredentials: true });
        const rawData = Array.isArray(res.data?.sales) ? res.data.sales : [];
        const salesData = Array.from({ length: 12 }, (_, idx) => Number(rawData[idx] ?? 0));

        setSeries([{ name: "Sales", data: salesData }]);
      } catch (err) {
        console.error("Failed to fetch monthly sales data", err);
        setError("Failed to load sales data");
      } finally {
        setLoading(false);
      }
    }
    fetchMonthlySales();
  }, [unitId]);

  const options: ApexOptions = {
    colors: [CHART_COLOR],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 220,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 4,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      axisBorder: { show: false },
      axisTicks: { show: false },
      // Cast to any so we can use maxWidth, which exists at runtime
      labels: {
        maxWidth: 32,
        style: { fontSize: "10px" },
      } as any,
    },
    legend: { show: false },
    yaxis: { title: { text: undefined } },
    grid: {
      borderColor: "rgba(0,0,0,0.06)",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    fill: { opacity: 1 },
    tooltip: {
      theme: "light",
      x: { show: false },
      y: { formatter: (val: number) => `${val} sales` },
    },
  };

  return (
    <ContentCard title="Monthly sales" subtitle="Sales volume by month">
      <div className="max-w-full overflow-x-auto custom-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
        <div className="min-w-0 w-full">
          {loading ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-gray-500 dark:text-gray-400 sm:h-[220px]">
              Loading…
            </div>
          ) : error ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-error-600 dark:text-error-400 sm:h-[220px]">
              {error}
            </div>
          ) : (
            <ReactApexChart options={options} series={series} type="bar" height={220} />
          )}
        </div>
      </div>
    </ContentCard>
  );
}
