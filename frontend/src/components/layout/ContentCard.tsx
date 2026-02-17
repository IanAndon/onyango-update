"use client";

import React, { ReactNode } from "react";

interface ContentCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function ContentCard({
  title,
  subtitle,
  action,
  children,
  className = "",
  noPadding = false,
}: ContentCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm
        dark:border-gray-800 dark:bg-gray-900/60
        ${className}
      `}
    >
      {(title || action) && (
        <div className="flex flex-col gap-1 border-b border-gray-100 px-3 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4 md:px-6 md:py-5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="h-6 w-1 shrink-0 rounded-full bg-brand-500 sm:h-8" aria-hidden />
            <div className="min-w-0">
              {title && (
                <h2 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-3 sm:p-5 md:p-6"}>{children}</div>
    </div>
  );
}
