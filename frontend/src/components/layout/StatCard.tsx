"use client";

import React, { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  iconBg?: "brand" | "success" | "warning" | "gray";
  trend?: { value: string; positive: boolean };
  accent?: boolean;
  className?: string;
}

const iconBgClasses = {
  brand: "bg-brand-500/15 text-brand-600 dark:text-brand-400",
  success: "bg-success-500/15 text-success-600 dark:text-success-400",
  warning: "bg-warning-500/15 text-warning-600 dark:text-warning-400",
  gray: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

export default function StatCard({
  label,
  value,
  icon,
  iconBg = "gray",
  trend,
  accent = false,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border p-4 transition-shadow hover:shadow-md
        sm:rounded-2xl sm:p-5 md:p-6
        ${accent
          ? "border-brand-500/30 bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg dark:from-brand-600 dark:to-brand-800"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/50"
        }
        ${className}
      `}
    >
      {accent && (
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
      )}
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${accent ? "text-white/90" : "text-gray-500 dark:text-gray-400"}`}>
            {label}
          </p>
          <p className={`mt-2 text-xl font-bold tabular-nums tracking-tight sm:text-2xl md:text-3xl ${accent ? "text-white" : "text-gray-900 dark:text-white"}`}>
            {value}
          </p>
          {trend && (
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                trend.positive
                  ? "bg-success-500/15 text-success-700 dark:text-success-400"
                  : "bg-error-500/15 text-error-700 dark:text-error-400"
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
        {icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 md:h-14 md:w-14 md:rounded-xl ${
              accent ? "bg-white/20" : iconBgClasses[iconBg]
            }`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
