"use client";

import { useAuth } from "@/context/auth-context";
import CompanyLogo from "@/components/common/CompanyLogo";

export function DashboardWelcome() {
  const { user } = useAuth();
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };
  const name = user?.username ?? "User";
  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 px-4 py-4 shadow-lg dark:from-brand-800 dark:via-brand-700 dark:to-brand-900 sm:rounded-2xl sm:px-6 sm:py-6 md:px-8 md:py-8">
      <div className="absolute right-0 top-0 h-24 w-36 rounded-bl-full bg-white/10 sm:h-32 sm:w-48" aria-hidden />
      <div className="absolute bottom-0 left-0 h-20 w-24 rounded-tr-full bg-black/10 sm:h-24 sm:w-32" aria-hidden />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-white/80 sm:text-sm">
            {dateStr}
          </p>
          <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl md:text-3xl">
            {greeting()}, {name}
          </h1>
          <p className="mt-2 max-w-md text-xs text-white/90 sm:text-sm">
            Here’s what’s happening with your business today.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg bg-white/15 px-3 py-2.5 backdrop-blur sm:gap-3 sm:rounded-xl sm:px-4 sm:py-3 md:px-5 md:py-4">
          <CompanyLogo variant="dark" size={40} className="shrink-0 sm:hidden" />
          <CompanyLogo variant="dark" size={48} className="hidden shrink-0 sm:block" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/80 sm:text-xs">Dashboard</span>
        </div>
      </div>
    </div>
  );
}
