'use client';

import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { ThemeProvider } from "@/context/ThemeContext";
import {
  Shield,
  Zap,
  BarChart3,
  Building2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import React from "react";
import CompanyLogo from "@/components/common/CompanyLogo";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Unified dashboard",
    text: "Shop sales, workshop repairs, and inventory in one place.",
  },
  {
    icon: Zap,
    title: "Real-time operations",
    text: "Track stock, material requests, and transfer orders live.",
  },
  {
    icon: Building2,
    title: "Multi-unit support",
    text: "Run shop and workshop with separate cashbooks and reports.",
  },
  {
    icon: Shield,
    title: "Secure & reliable",
    text: "Role-based access and audit trails for your team.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen w-full bg-gray-100 dark:bg-gray-950">
        {/* Left: full-height form area — no card */}
        <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-[420px]">
            {children}
          </div>
        </div>

        {/* Right: decorative panel + single info card (hidden on small screens) */}
        <div className="relative hidden min-h-screen w-1/2 overflow-hidden lg:block">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 dark:from-brand-700 dark:via-brand-800 dark:to-brand-950" />
          <div
            className="absolute inset-0 opacity-[0.07] dark:opacity-[0.08]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          {/* Soft orbs */}
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-signin-float" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-brand-300/20 dark:bg-brand-400/10 blur-3xl animate-signin-float" style={{ animationDelay: "1s" }} />

          <div className="relative flex min-h-screen items-center justify-center p-8 xl:p-12">
            {/* Single advanced card */}
            <div className="w-full max-w-md animate-signin-fade-in-up rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl xl:p-10">
              <div className="mb-8 flex items-center gap-4 animate-signin-fade-in-up signin-delay-100">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/20 shadow-lg backdrop-blur-sm">
                  <CompanyLogo variant="dark" size={56} rounded />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white xl:text-3xl">
                    Onyango Construction
                  </h2>
                  <p className="mt-0.5 text-sm text-white/80">
                    Hardware & workshop management
                  </p>
                </div>
              </div>

              <p className="mb-8 text-sm leading-relaxed text-white/90 animate-signin-fade-in-up signin-delay-200">
                One platform for sales, repairs, inventory, and reporting. Built for teams that run both shop and workshop.
              </p>

              <ul className="space-y-5">
                {FEATURES.map((item, i) => (
                  <li
                    key={item.title}
                    className="flex gap-4 animate-signin-fade-in-up opacity-0"
                    style={{
                      animation: "signin-fade-in-up 0.6s ease-out forwards",
                      animationDelay: `${300 + i * 100}ms`,
                      animationFillMode: "forwards",
                    }}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white border border-white/20">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-0.5 text-xs text-white/80 leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                    <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-emerald-300/90" />
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm border border-white/10 animate-signin-fade-in-up signin-delay-700">
                <ArrowRight className="h-5 w-5 text-white/90" />
                <p className="text-sm font-medium text-white/95">
                  Sign in to access your dashboard and reports.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme toggle */}
      <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
        <ThemeTogglerTwo />
      </div>
    </ThemeProvider>
  );
}
