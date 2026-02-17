"use client";

import React, { useEffect, useMemo, useState } from "react";
import api from "@/utils/api";
import PageHeader from "@/components/layout/PageHeader";
import ContentCard from "@/components/layout/ContentCard";
import { useRouter } from "next/navigation";

interface QuoteItemDraft {
  description: string;
  quantity: number;
  unit_price: number;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
}

interface Product {
  id: number;
  name: string;
  selling_price: number;
  quantity_in_stock?: number;
}

export default function NewQuotePage() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerTin, setCustomerTin] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [vatPercent, setVatPercent] = useState(0);
  const [items, setItems] = useState<QuoteItemDraft[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [activeRowIndex, setActiveRowIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [custRes, prodRes] = await Promise.all([
          api.get("api/customers/"),
          api.get("api/products/"),
        ]);
        if (cancelled) return;
        setCustomers(custRes as Customer[]);
        const prodList = Array.isArray(prodRes) ? prodRes : (prodRes as any)?.results ?? prodRes;
        setProducts(
          (prodList as any[]).map((p) => ({
            id: p.id,
            name: p.name,
            selling_price: parseFloat(p.selling_price),
            quantity_in_stock: typeof p.quantity_in_stock === "number" ? p.quantity_in_stock : parseInt(p.quantity_in_stock, 10) || 0,
          }))
        );
      } catch (err) {
        if (!cancelled) {
          // silent fail; user can still type free-text
          console.error("Failed to load customers/products for quotes", err);
        }
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
        0
      ),
    [items]
  );

  const afterDiscount = useMemo(
    () => Math.max(0, subtotal - (discount || 0)),
    [subtotal, discount]
  );
  const vatAmount = useMemo(
    () => afterDiscount * ((vatPercent || 0) / 100),
    [afterDiscount, vatPercent]
  );
  const grandTotal = useMemo(() => afterDiscount, [afterDiscount]);

  const filteredCustomers = useMemo(
    () =>
      customers.filter((c) => {
        const q = customerSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q)
        );
      }),
    [customers, customerSearch]
  );

  const filteredProducts = useMemo(
    () =>
      products
        .filter((p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase())
        )
        .slice(0, 30),
    [products, productSearch]
  );

  const updateItem = (index: number, patch: Partial<QuoteItemDraft>) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      )
    );
  };

  const addRow = () => {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }]);
  };

  const removeRow = (index: number) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        customer: selectedCustomerId || undefined,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        customer_address: customerAddress.trim() || undefined,
        customer_tin: customerTin.trim() || undefined,
        quote_date: quoteDate || undefined,
        valid_until: validUntil || undefined,
        notes: notes.trim() || undefined,
        discount_amount: discount || 0,
        vat_percent: vatPercent || undefined,
        tax_amount: vatAmount,
        items: items
          .filter((it) => it.description.trim())
          .map((it) => ({
            description: it.description.trim(),
            quantity: it.quantity || 1,
            unit_price: it.unit_price || 0,
          })),
      };

      if (!payload.items.length) {
        setError("Add at least one line item.");
        setSaving(false);
        return;
      }

      const res = await api.post("api/quotes/", payload);
      const id = (res as any)?.id;
      if (id) {
        router.push(`/quotes/${id}`);
      } else {
        setError("Quote saved but could not get ID.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Failed to save quote."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen min-w-0 max-w-full pb-24 sm:pb-8">
      <div className="sticky top-0 z-10 -mx-3 bg-gray-50/95 px-3 py-4 backdrop-blur-sm dark:bg-gray-950/95 sm:mx-0 sm:px-0 sm:py-0 sm:static sm:bg-transparent sm:backdrop-blur-none">
        <PageHeader
          title="New quote"
          subtitle="Pro-forma invoice for your customer."
        />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
        <ContentCard title="Customer & meta" className="overflow-hidden">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                Select customer (from system)
              </label>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name or phone…"
                className="input-onyango mb-2 w-full min-h-[44px] touch-manipulation"
              />
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : "";
                  setSelectedCustomerId(val);
                  const c =
                    typeof val === "number"
                      ? customers.find((x) => x.id === val)
                      : undefined;
                  if (c) {
                    setCustomerName(c.name);
                    setCustomerPhone(c.phone || "");
                    setCustomerAddress(c.address || "");
                  }
                }}
                className="input-onyango w-full min-h-[44px] touch-manipulation text-sm"
              >
                <option value="">— Walk-in / manual customer —</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` (${c.phone})` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                Override name/phone below if needed.
              </p>
            </div>
            <div className="space-y-2">
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                Quote date (optional)
              </label>
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                className="input-onyango w-full min-h-[44px] touch-manipulation"
              />
              <label className="mb-1 mt-3 block text-xs font-medium text-gray-700 dark:text-gray-200">
                Valid until (optional)
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="input-onyango w-full min-h-[44px] touch-manipulation"
              />
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                Customer name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. John Doe or company name"
                className="input-onyango w-full min-h-[44px] touch-manipulation"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                Customer phone
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 07X XXX XXXX"
                className="input-onyango w-full min-h-[44px] touch-manipulation"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                Address (optional)
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Street, area, city"
                className="input-onyango w-full min-h-[44px] touch-manipulation"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                TIN (optional)
              </label>
              <input
                type="text"
                value={customerTin}
                onChange={(e) => setCustomerTin(e.target.value)}
                placeholder="Tax ID number"
                className="input-onyango w-full min-h-[44px] touch-manipulation"
              />
            </div>
          </div>
        </ContentCard>

        <ContentCard
          title="Notes"
          subtitle="Optional notes for the quote (shown on print)."
        >
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Payment terms, delivery instructions, special conditions…"
            className="input-onyango w-full min-h-[88px] resize-y touch-manipulation"
          />
        </ContentCard>

        <ContentCard
          title="Line items"
          subtitle="Add products or custom lines. Tap a product to fill the selected row."
        >
          {/* Mobile: card list */}
          <div className="block md:hidden space-y-3">
            {items.map((item, index) => {
              const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
              return (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/30"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Line {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="min-h-[36px] min-w-[36px] touch-manipulation rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
                      disabled={items.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.description}
                    onFocus={() => setActiveRowIndex(index)}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    placeholder="Product or service name"
                    className="input-onyango mb-2 w-full min-h-[44px] touch-manipulation text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-gray-500 dark:text-gray-400">Qty</label>
                      <input
                        type="number"
                        min={0}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                        placeholder="0"
                        className="input-onyango w-full min-h-[44px] touch-manipulation text-right text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-gray-500 dark:text-gray-400">Unit price (TZS)</label>
                      <input
                        type="number"
                        min={0}
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })}
                        placeholder="0"
                        className="input-onyango w-full min-h-[44px] touch-manipulation text-right text-sm"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-200">
                    Line total: {lineTotal.toLocaleString()} TZS
                  </p>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addRow}
              className="w-full min-h-[48px] touch-manipulation rounded-xl border-2 border-dashed border-gray-300 py-2 text-sm font-medium text-gray-600 dark:border-gray-600 dark:text-gray-400"
            >
              + Add line
            </button>
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block max-w-full overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Description</th>
                  <th className="px-3 py-2 text-right font-semibold">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold">Unit price</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item, index) => {
                  const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
                  return (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onFocus={() => setActiveRowIndex(index)}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                          placeholder="Product or service name"
                          className="input-onyango w-full text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                          placeholder="0"
                          className="input-onyango w-20 text-xs text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })}
                          placeholder="0"
                          className="input-onyango w-24 text-xs text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                        {lineTotal.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="min-h-[32px] rounded px-2 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                          disabled={items.length <= 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <button
              type="button"
              onClick={addRow}
              className="hidden min-h-[44px] touch-manipulation rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200 md:inline-flex md:items-center"
            >
              + Add line
            </button>
            <div className="w-full space-y-2 md:max-w-sm md:text-right">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Subtotal: <span className="font-semibold">{subtotal.toLocaleString()} TZS</span>
              </p>
              <div className="rounded-xl border border-dashed border-gray-200 p-3 dark:border-gray-700">
                <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-200">
                  Product picker
                </p>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search by product name…"
                  className="input-onyango mb-2 w-full min-h-[40px] text-sm"
                />
                <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const idx = activeRowIndex ?? 0;
                        updateItem(idx, { description: p.name, unit_price: p.selling_price });
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] touch-manipulation"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs text-gray-800 dark:text-gray-100">{p.name}</span>
                      <span className="shrink-0 text-[11px] text-gray-500 dark:text-gray-400">
                        {typeof p.quantity_in_stock === "number" ? `${p.quantity_in_stock} in stock` : "—"}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300">
                        {p.selling_price.toLocaleString()} TZS
                      </span>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="py-2 text-[11px] text-gray-500 dark:text-gray-400">No matching products.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ContentCard>

        <ContentCard title="Totals" className="overflow-hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-3">
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                  Discount (TZS)
                </label>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="0"
                  className="input-onyango w-full min-h-[44px] touch-manipulation text-right sm:w-28"
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                  VAT %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={vatPercent}
                  onChange={(e) => setVatPercent(Number(e.target.value))}
                  placeholder="0"
                  className="input-onyango w-full min-h-[44px] touch-manipulation text-right sm:w-24"
                />
              </div>
            </div>
            <div className="w-full space-y-1 text-sm sm:max-w-xs sm:text-right">
              <p className="text-gray-600 dark:text-gray-300">
                Subtotal: <span className="font-medium">{subtotal.toLocaleString()} TZS</span>
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                Less discount: <span className="font-medium">−{discount.toLocaleString()} TZS</span>
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                After discount: <span className="font-medium">{afterDiscount.toLocaleString()} TZS</span>
              </p>
              {vatPercent > 0 && (
                <p className="text-gray-600 dark:text-gray-300">
                  VAT ({vatPercent}%): <span className="font-medium">{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} TZS</span>
                </p>
              )}
              <p className="border-t border-gray-200 pt-2 text-gray-700 dark:border-gray-700 dark:text-gray-200">
                Grand total:{" "}
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} TZS
                </span>
              </p>
            </div>
          </div>
          {error && (
            <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="mt-4 flex justify-end max-sm:hidden">
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] touch-manipulation rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save quote"}
            </button>
          </div>
        </ContentCard>

        {/* Sticky bottom bar (mobile only) */}
        <div className="fixed bottom-0 left-0 right-0 z-20 flex flex-col gap-2 border-t border-gray-200 bg-white/95 p-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/95 sm:hidden">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Grand total</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} TZS
            </span>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="min-h-[48px] w-full touch-manipulation rounded-xl bg-brand-600 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save quote"}
          </button>
        </div>
      </form>
    </div>
  );
}

