"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ContentCard from "@/components/layout/ContentCard";

interface Product {
  id: number;
  name: string;
  category: string;
  image?: string;
}

interface SaleItem {
  product: Product;
  quantity: number;
  price_per_unit: number;
  total_price: number;
}

interface Sale {
  id: number;
  total_amount: number;
  date: string;
  payment_method: string;
  items: SaleItem[];
}

interface RecentOrdersProps {
  /** Optional unit ID to filter recent sales. */
  unitId?: number | null;
}

export default function RecentOrders({ unitId }: RecentOrdersProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const url = new URL(`${BASE_URL}/api/dashboard/recent-orders`);
        if (unitId != null) url.searchParams.set("unit", String(unitId));
        const res = await fetch(url.toString(), { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch");
        setSales(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchSales();
  }, [unitId]);

  return (
    <ContentCard
      title="Recent orders"
      subtitle="Latest sales"
      action={
        <Link
          href="/cashier"
          className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          View all
        </Link>
      }
      noPadding
    >
      <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
        <div className="max-h-[320px] overflow-y-auto custom-scrollbar sm:max-h-[380px]">
          <table className="min-w-full">
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/95 dark:border-gray-800 dark:bg-gray-900/95">
              <tr>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-4 sm:py-3.5 sm:text-xs">
                  Product
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-4 sm:py-3.5 sm:text-xs">
                  Payment
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-4 sm:py-3.5 sm:text-xs">
                  Total
                </th>
                <th className="hidden px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:table-cell sm:px-4 sm:py-3.5 sm:text-xs">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-xs text-gray-500 dark:text-gray-400 sm:px-4 sm:py-8 sm:text-sm">
                    No recent orders.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => {
                  const first = sale.items[0];
                  const product = first?.product;
                  const qty = sale.items.reduce((s, i) => s + i.quantity, 0);
                  return (
                    <tr
                      key={sale.id}
                      className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/30"
                    >
                      <td className="px-2 py-2.5 sm:px-4 sm:py-3.5">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 sm:h-10 sm:w-10">
                            <Image
                              src={product?.image || "/images/Favicon.ico"}
                              alt={product?.name ?? ""}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-gray-900 dark:text-white sm:text-sm">
                              {product?.name ?? "—"} {sale.items.length > 1 && `+${sale.items.length - 1}`}
                            </p>
                            <p className="truncate text-[10px] text-gray-500 dark:text-gray-400 sm:text-xs">
                              {product?.category ?? ""} · Qty {qty}
                              <span className="ml-1 sm:hidden">
                                · {new Date(sale.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-xs text-gray-600 dark:text-gray-400 sm:px-4 sm:py-3.5 sm:text-sm">
                        {sale.payment_method}
                      </td>
                      <td className="px-2 py-2.5 text-xs font-semibold text-gray-900 dark:text-white sm:px-4 sm:py-3.5 sm:text-sm">
                        TZS {sale.total_amount.toLocaleString()}
                      </td>
                      <td className="hidden px-2 py-2.5 text-xs text-gray-500 dark:text-gray-400 sm:table-cell sm:px-4 sm:py-3.5 sm:text-sm">
                        {new Date(sale.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ContentCard>
  );
}
