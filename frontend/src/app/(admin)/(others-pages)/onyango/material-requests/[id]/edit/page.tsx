"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import api from "@/utils/api";

const MIN_QUANTITY = 0.01;

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

function formatStock(value: number): string {
  if (value == null || Number.isNaN(value)) return "0";
  const n = Number(value);
  return n % 1 === 0 ? String(Math.round(n)) : String(n);
}

function clampQuantity(qty: number, maxStock: number): number {
  const n = Number(qty);
  if (Number.isNaN(n) || n < MIN_QUANTITY) return MIN_QUANTITY;
  return Math.min(Math.max(MIN_QUANTITY, n), maxStock);
}

interface RepairJobOption {
  id: number;
  customer_name: string;
  item_description: string;
  status: string;
}

interface MaterialRequest {
  id: number;
  status: string;
  repair_job: number | null;
  repair_job_id: number | null;
  lines: { id?: number; product: number; product_name?: string; quantity_requested: number }[];
  notes: string | null;
}

export default function EditMaterialRequestPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [request, setRequest] = useState<MaterialRequest | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [jobs, setJobs] = useState<RepairJobOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | "">("");
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingQty, setEditingQty] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`api/onyango/material-requests/${id}/`),
      api.get("api/products/").then((res: unknown) => Array.isArray(res) ? res : (res as { results?: Product[] })?.results ?? []),
      api.get("api/onyango/repair-jobs/").then((res: unknown) => {
        const raw = Array.isArray(res) ? res : (res as { results?: unknown[] })?.results ?? [];
        return (raw as { id: number; customer_detail?: { name?: string }; item_description?: string; status?: string }[])
          .filter((j) => ["received", "in_progress", "on_hold"].includes(j.status ?? ""))
          .map((j) => ({
            id: j.id,
            customer_name: j.customer_detail?.name ?? "",
            item_description: j.item_description ?? "",
            status: j.status ?? "",
          }));
      }),
    ])
      .then(([mr, prods, jobList]) => {
        setRequest(mr as MaterialRequest);
        setProducts(prods as Product[]);
        setJobs(jobList as RepairJobOption[]);
        const r = mr as MaterialRequest;
        setSelectedJobId(r.repair_job ?? r.repair_job_id ?? "");
        setLines((r.lines ?? []).map((l) => ({ product: l.product, quantity_requested: Number(l.quantity_requested) || MIN_QUANTITY })));
        setNotes(r.notes ?? "");
      })
      .catch(() => setRequest(null))
      .finally(() => setLoading(false));
  }, [id]);

  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  const getProduct = (productId: number) => products.find((p) => p.id === productId);

  const getStock = (productId: number) => {
    const p = getProduct(productId);
    return p != null ? Number(p.quantity_in_stock) : 0;
  };

  const addOrIncrementLine = (productId: number) => {
    const stock = getStock(productId);
    setLines((prev) => {
      const existing = prev.find((l) => l.product === productId);
      if (existing) {
        const next = clampQuantity(existing.quantity_requested + 0.25, stock);
        return prev.map((l) => (l.product === productId ? { ...l, quantity_requested: next } : l));
      }
      return [...prev, { product: productId, quantity_requested: Math.min(1, stock) >= MIN_QUANTITY ? 1 : MIN_QUANTITY }];
    });
  };

  const updateLineQty = (productId: number, qty: number) => {
    const stock = getStock(productId);
    setLines((prev) =>
      prev.map((l) => (l.product === productId ? { ...l, quantity_requested: clampQuantity(qty, stock) } : l))
    );
  };

  const commitQtyInput = (productId: number, raw: string) => {
    const stock = getStock(productId);
    const trimmed = raw.trim();
    const num = trimmed === "" ? NaN : parseFloat(trimmed);
    const valid = !Number.isNaN(num) && num >= MIN_QUANTITY && num <= stock;
    updateLineQty(productId, valid ? num : MIN_QUANTITY);
    setEditingQty((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const removeLine = (productId: number) => {
    setLines((prev) => prev.filter((l) => l.product !== productId));
  };

  const totalMaterials = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const prod = getProduct(l.product);
        if (!prod) return sum;
        return sum + Number(prod.buying_price ?? 0) * l.quantity_requested;
      }, 0),
    [lines, products]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    const valid = lines.filter((l) => l.product > 0 && l.quantity_requested >= MIN_QUANTITY);
    if (valid.length === 0) {
      alert("Add at least one material with quantity.");
      return;
    }
    const resolvedLines = valid.map((l) => {
      const raw = editingQty[l.product];
      const qty = raw != null && String(raw).trim() !== "" ? parseFloat(String(raw).trim()) || MIN_QUANTITY : l.quantity_requested;
      const prod = getProduct(l.product);
      const stock = prod ? Number(prod.quantity_in_stock) : 0;
      return { ...l, quantity_requested: clampQuantity(qty, stock) };
    });
    setEditingQty({});

    const status = (request.status ?? "").toString().toLowerCase();
    if (status === "approved" || status === "submitted") {
      const insufficient: string[] = [];
      for (const line of resolvedLines) {
        const prod = getProduct(line.product);
        if (prod && prod.quantity_in_stock != null && line.quantity_requested > Number(prod.quantity_in_stock)) {
          insufficient.push(`${prod.name} (in stock ${formatStock(Number(prod.quantity_in_stock))}, requested ${formatStock(line.quantity_requested)})`);
        }
      }
      if (insufficient.length > 0) {
        alert(
          "Cannot update request. Insufficient stock for:\n\n- " +
            insufficient.join("\n- ") +
            "\n\nPlease reduce quantities or remove items."
        );
        return;
      }
    }
    
    setSubmitting(true);
    try {
      await api.patch(`api/onyango/material-requests/${request.id}/`, {
        repair_job: selectedJobId ? Number(selectedJobId) : null,
        notes: notes.trim() || null,
        lines: resolvedLines.map((l) => ({ product: l.product, quantity_requested: l.quantity_requested })),
      });
      const successMsg =
        status === "approved"
          ? "Materials updated successfully. Transfer order and stock have been updated."
          : status === "submitted"
            ? "Materials updated. Shop will need to review the changes."
            : "Request updated successfully.";
      alert(successMsg);
      router.push(`/onyango/material-requests/${request.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; lines?: string[] } } };
      const errorMsg = e?.response?.data?.error || e?.response?.data?.lines?.join("\n") || "Failed to update request";
      alert(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !request) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-gray-500">{loading ? "Loading…" : "Request not found."}</p>
      </div>
    );
  }

  const status = (request.status ?? "").toString().toLowerCase();
  const canEdit = ["draft", "rejected", "submitted", "approved"].includes(status);
  if (!canEdit) {
    return (
      <div className="space-y-4">
        <Link href={`/onyango/material-requests/${request.id}`} className="text-sm text-blue-600 hover:underline">
          ← Back to request
        </Link>
        <p className="text-gray-500">This request cannot be edited in its current status.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-sm">
      <div className="flex items-center gap-4">
        <Link
          href={`/onyango/material-requests/${request.id}`}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-300"
        >
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {status === "approved" ? "Add/Update materials" : "Edit material request"} #{request.id}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {status === "approved"
              ? "Add more materials or update quantities. Changes will update the transfer order and stock automatically."
              : status === "submitted"
                ? "Update materials before shop reviews. Changes will require shop re-approval."
                : "Update repair job, materials, or notes. Save to keep as draft; then use &quot;Resubmit to shop&quot; on the detail page."}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:p-6"
      >
        <div className="mb-4 flex flex-col gap-2 md:col-span-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Repair job</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : "")}
              className="w-full max-w-xl rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">No job</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  #{j.id} — {j.customer_name} — {j.item_description?.slice(0, 50)}
                  {j.item_description && j.item_description.length > 50 ? "…" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Optional notes"
          />
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Available materials</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search materials..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <div className="min-h-[200px] max-h-[360px] space-y-1 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/70 p-2 dark:border-gray-800 dark:bg-gray-950/40">
            {filteredProducts.map((p) => {
              const existing = lines.find((l) => l.product === p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => addOrIncrementLine(p.id)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs hover:bg-white dark:hover:bg-gray-800/80"
                >
                  <span className="truncate font-medium text-gray-900 dark:text-white">{p.name}</span>
                  <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-semibold text-brand-600 dark:text-brand-300">
                    {existing ? `Qty ${formatStock(existing.quantity_requested)}` : "Add"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:pl-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Selected materials</h2>
          <div className="min-h-[180px] rounded-lg border border-gray-100 bg-gray-50/60 p-2 dark:border-gray-800 dark:bg-gray-950/40">
            {lines.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">No materials selected.</p>
            ) : (
              <table className="w-full text-[11px] sm:text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-left font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-800 dark:text-gray-300">
                    <th className="p-1.5">Material</th>
                    <th className="p-1.5 text-center">Qty</th>
                    <th className="p-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const prod = getProduct(line.product);
                    if (!prod) return null;
                    return (
                      <tr key={line.product} className="border-b border-gray-100 last:border-0 dark:border-gray-800/80">
                        <td className="p-1.5 font-medium text-gray-900 dark:text-white">{prod.name}</td>
                        <td className="p-1.5 text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={editingQty[line.product] ?? formatStock(line.quantity_requested)}
                            onFocus={() => setEditingQty((prev) => ({ ...prev, [line.product]: formatStock(line.quantity_requested) }))}
                            onChange={(e) => setEditingQty((prev) => ({ ...prev, [line.product]: e.target.value }))}
                            onBlur={() => commitQtyInput(line.product, editingQty[line.product] ?? "")}
                            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                            className="w-14 min-w-0 rounded border border-gray-300 px-1.5 py-1 text-center text-[11px] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          />
                        </td>
                        <td className="p-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(line.product)}
                            className="rounded border border-red-300 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/30"
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
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Total (expected debt to shop): TZS {totalMaterials.toLocaleString()}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push(`/onyango/material-requests/${request.id}`)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
