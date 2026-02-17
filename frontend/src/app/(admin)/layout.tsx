"use client";

import { useSidebar } from "@/context/SidebarContext";
import { AuthProvider } from "@/context/auth-context";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[280px]"
    : "lg:ml-[72px]";

  return (
    <AuthProvider>
      <div className="min-h-screen xl:flex">
        {/* Sidebar and Backdrop */}
        <AppSidebar />
        <Backdrop />
        {/* Main Content Area */}
        <div
          className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
        >
          {/* Header */}
          <AppHeader />
          {/* Page Content */}
          <div className="min-h-0 w-full max-w-full overflow-x-hidden px-3 py-4 sm:p-4 md:p-6 bg-gray-50/80 dark:bg-gray-950/50">
            {children}
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}
