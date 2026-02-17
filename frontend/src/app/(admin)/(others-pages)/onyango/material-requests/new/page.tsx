"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/utils/api";

interface Product {
  id: number;
  name: string;
  quantity_in_stock: number;
  buying_price: number;
}

interface Line {
  product: number;
  quantity_requested: number;
}

interface RepairJobOption {
  id: number;
  customer_name: string;
  item_description: string;
  status: string;
  job_type_name?: string;
  job_type_price?: number;
}

export default function NewMaterialRequestPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [jobs, setJobs] = useState<RepairJobOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    api
      .get("api/products/")
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.results ?? [];
        setProducts(list);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    api
      .get("api/onyango/repair-jobs/")
      .then((res: any) => {
        const raw = Array.isArray(res) ? res : res?.results ?? [];
        const pending = raw.filter((j: any) =>
          ["received", "in_progress", "on_hold"].includes(j.status)
        );
        const mapped: RepairJobOption[] = pending.map((j: any) => ({
          id: j.id,
          customer_name: j.customer_detail?.name ?? "",
          item_description: j.item_description,
          status: j.status,
          job_type_name: j.job_type_detail?.name,
          job_type_price: j.job_type_detail?.fixed_price
            ? Number(j.job_type_detail.fixed_price)
            : undefined,
        }));
        setJobs(mapped);
      })
      .catch(console.error);
  }, []);

  const selectedJob = useMemo(
    () =>
      selectedJobId
        ? jobs.find((j) => j.id === Number(selectedJobId))
        : undefined,
    [jobs, selectedJobId]
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );

  const addOrIncrementLine = (productId: number) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product === productId);
      if (existing) {
        return prev.map((l) =>
          l.product === productId
            ? { ...l, quantity_requested: l.quantity_requested + 1 }
            : l
        );
      }
      return [...prev, { product: productId, quantity_requested: 1 }];
    });
  };

  const updateLineQty = (productId: number, qty: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.product === productId
          ? { ...l, quantity_requested: Math.max(1, qty) }
          : l
      )
    );
  };

  const removeLine = (productId: number) => {
    setLines((prev) => prev.filter((l) => l.product !== productId));
  };

  const getProduct = (id: number) =>
    products.find((p) => p.id === id) as Product | undefined;

  const totalMaterials = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const prod = getProduct(l.product);
        if (!prod) return sum;
        const price = prod.buying_price ?? 0;
        return sum + Number(price) * l.quantity_requested;
      }, 0),
    [lines, products]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) {
      alert("Select a pending repair job first.");
      return;
    }
    const valid = lines.filter(
      (l) => l.product > 0 && l.quantity_requested > 0
    );
    if (valid.length === 0) {
      alert("Add at least one material with quantity.");
      return;
    }
    // Prevent submitting with quantities greater than stock
    const overStock = valid.filter((l) => {
      const prod = getProduct(l.product);
      if (!prod || prod.quantity_in_stock == null) return false;
      return l.quantity_requested > Number(prod.quantity_in_stock);
    });
    if (overStock.length > 0) {
      const names = overStock
        .map((l) => {
          const prod = getProduct(l.product);
          return prod ? `${prod.name} (in stock ${prod.quantity_in_stock}, requested ${l.quantity_requested})` : "";
        })
        .filter(Boolean)
        .join("\n- ");
      alert(
        "You cannot request more than available in shop for these items:\n\n- " +
          names +
          "\n\nPlease reduce the quantities before submitting."
      );
      return;
    }
    try {
      setSubmitting(true);
      await api.post("api/onyango/material-requests/", {
        repair_job: Number(selectedJobId),
        status: "draft",
        lines: valid.map((l) => ({
          product: l.product,
          quantity_requested: l.quantity_requested,
        })),
      });
      router.push("/onyango/material-requests");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-sm">
      <div className="flex items-center gap-4">
        <Link
          href="/onyango/material-requests"
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            New material request
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            First select the pending repair job, then choose the materials for
            that job. The total material amount is the expected debt to the
            shop.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:p-6"
      >
        <div className="mb-4 flex flex-col gap-2 md:col-span-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Pending repair job *
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedJobId(v ? Number(v) : "");
              }}
              className="w-full max-w-xl rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
            >
              <option value="">Select repair job</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  #{j.id} — {j.customer_name} —{" "}
                  {j.item_description.length > 40
                    ? `${j.item_description.slice(0, 40)}…`
                    : j.item_description}
                </option>
              ))}
            </select>
          </div>
          {selectedJob && (
            <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-300 md:mt-0">
              <div>
                Job status:{" "}
                <span className="font-semibold">{selectedJob.status}</span>
              </div>
              {selectedJob.job_type_name &&
                selectedJob.job_type_price !== undefined && (
                  <div>
                    Job type:{" "}
                    <span className="font-semibold">
                      {selectedJob.job_type_name}
                    </span>{" "}
                    · Fixed price: TZS{" "}
                    {Number(selectedJob.job_type_price).toLocaleString()}
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Left: product list */}
        <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Available materials
            </h2>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {products.length} item(s)
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search material by name..."
              className="input-onyango w-full text-xs"
            />
          </div>

          <div className="min-h-[240px] max-h-[420px] space-y-1 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/70 p-2 text-xs dark:border-gray-800 dark:bg-gray-950/40">
            {filteredProducts.length === 0 ? (
              <p className="px-2 py-6 text-center text-gray-500 dark:text-gray-400">
                No materials match this search.
              </p>
            ) : (
              filteredProducts.map((p) => {
                const existing = lines.find((l) => l.product === p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => addOrIncrementLine(p.id)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition hover:bg-white hover:shadow-sm dark:hover:bg-gray-800/80"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-gray-900 dark:text-white">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        In shop:{" "}
                        <span className="font-semibold">
                          {p.quantity_in_stock}
                        </span>
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                      {existing
                        ? `Qty ${existing.quantity_requested}`
                        : "Add"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: selected lines (POS-like view) */}
        <div className="flex flex-col gap-3 md:pl-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Selected materials
            </h2>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {lines.length} line(s)
            </span>
          </div>

          <div className="min-h-[220px] flex-1 rounded-lg border border-gray-100 bg-gray-50/60 p-2 text-xs dark:border-gray-800 dark:bg-gray-950/40">
            {lines.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-gray-500 dark:text-gray-400">
                <p className="text-xs font-medium">
                  No materials selected yet.
                </p>
                <p className="text-[11px]">
                  Click items on the left to add them to this request.
                </p>
              </div>
            ) : (
              <table className="w-full text-[11px] sm:text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-800 dark:text-gray-300">
                    <th className="p-1.5">Material</th>
                    <th className="p-1.5 text-center">In shop</th>
                    <th className="p-1.5 text-center">Qty</th>
                    <th className="p-1.5 text-right">Unit cost</th>
                    <th className="p-1.5 text-right">Line total</th>
                    <th className="p-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const prod = getProduct(line.product);
                    if (!prod) return null;
                    const price = Number(prod.buying_price ?? 0);
                    const lineTotal = price * line.quantity_requested;
                    return (
                      <tr
                        key={line.product}
                        className="border-b border-gray-100 last:border-0 dark:border-gray-800/80"
                      >
                        <td className="p-1.5">
                          <p className="truncate font-medium text-gray-900 dark:text-white">
                            {prod.name}
                          </p>
                        </td>
                        <td className="p-1.5 text-center text-gray-700 dark:text-gray-300">
                          {prod.quantity_in_stock}
                        </td>
                        <td className="p-1.5 text-center">
                          <input
                            type="number"
                            min={1}
                            value={line.quantity_requested}
                            onChange={(e) =>
                              updateLineQty(
                                line.product,
                                parseInt(e.target.value, 10) || 1
                              )
                            }
                            className="w-16 rounded-md border border-gray-300 bg-white px-1.5 py-1 text-center text-[11px] dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="p-1.5 text-right text-gray-700 dark:text-gray-300">
                          {price.toLocaleString()} TZS
                        </td>
                        <td className="p-1.5 text-right font-medium text-gray-900 dark:text-white">
                          {lineTotal.toLocaleString()} TZS
                        </td>
                        <td className="p-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(line.product)}
                            className="rounded-md border border-red-300 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/30"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-col gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <div>
                Request will be saved as <span className="font-semibold">draft</span>. It
                can be edited and then submitted for shop approval.
              </div>
              <div className="font-semibold text-gray-700 dark:text-gray-200">
                Total materials amount (expected debt to shop): TZS {" "}
                {totalMaterials.toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push("/onyango/material-requests")}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save draft"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
