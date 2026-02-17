"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/utils/api";

interface Supplier {
  id: number;
  name: string;
}
interface Product {
  id: number;
  name: string;
  buying_price: string;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [lines, setLines] = useState<{ product: number; quantity: number; unit_price: number }[]>([
    { product: 0, quantity: 1, unit_price: 0 },
  ]);

  useEffect(() => {
    api.get("api/onyango/suppliers/").then((res: any) => setSuppliers(Array.isArray(res) ? res : res?.results ?? [])).catch(console.error);
    api.get("api/products/").then((res: any) => {
      const list = Array.isArray(res) ? res : res?.results ?? [];
      setProducts(list);
      if (list.length && lines[0].product === 0) {
        setLines([{ product: list[0].id, quantity: 1, unit_price: parseFloat(list[0].buying_price) || 0 }]);
      }
    }).catch(console.error);
  }, []);

  const addLine = () => setLines((l) => [...l, { product: products[0]?.id ?? 0, quantity: 1, unit_price: 0 }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: "product" | "quantity" | "unit_price", value: number) => {
    setLines((l) => l.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) {
      alert("Select a supplier.");
      return;
    }
    const valid = lines.filter((l) => l.product > 0 && l.quantity > 0);
    if (valid.length === 0) {
      alert("Add at least one product.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("api/onyango/purchase-orders/", {
        supplier: parseInt(supplier, 10),
        status: "draft",
        lines: valid.map((l) => ({ product: l.product, quantity: l.quantity, unit_price: l.unit_price })),
      });
      router.push("/onyango/purchase-orders");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to create PO");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/onyango/purchase-orders" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">← Back</Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New purchase order</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier *</label>
          <select required value={supplier} onChange={(e) => setSupplier(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Product</label>
              <select
                value={line.product}
                onChange={(e) => {
                  const id = parseInt(e.target.value, 10);
                  const p = products.find((x) => x.id === id);
                  updateLine(i, "product", id);
                  if (p) updateLine(i, "unit_price", parseFloat(p.buying_price) || 0);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value={0}>Select</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="w-20">
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Qty</label>
              <input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(i, "quantity", parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Unit price</label>
              <input type="number" min={0} step={0.01} value={line.unit_price} onChange={(e) => updateLine(i, "unit_price", parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <button type="button" onClick={() => removeLine(i)} className="text-red-600 hover:underline">Remove</button>
          </div>
        ))}
        <button type="button" onClick={addLine} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">+ Add line</button>
        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {submitting ? "Creating..." : "Create PO"}
          </button>
          <Link href="/onyango/purchase-orders" className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
