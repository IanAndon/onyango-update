"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/utils/api";
import ContentCard from "@/components/layout/ContentCard";
import { Search, User, Phone, Mail, Wrench, ArrowLeft, DollarSign, Briefcase } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  phone: string;
  phone_number?: string;
  email?: string;
}

interface JobType {
  id: number;
  name: string;
  code: string | null;
  fixed_price: string;
}

export default function NewRepairJobPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [search, setSearch] = useState("");
  const [jobTypeSearch, setJobTypeSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    job_type: "",
    item_description: "",
    issue_description: "",
    priority: "normal",
    due_date: "",
    notes: "",
  });

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const url = search
        ? `api/customers/?search=${encodeURIComponent(search)}`
        : "api/customers/";
      const res = await api.get(url);
      const list = Array.isArray(res) ? res : res?.results ?? res?.data ?? [];
      const normalized = (list as any[]).map((c: any) => ({
        id: c.id,
        name: c.name || "",
        phone: c.phone || c.phone_number || "",
        email: c.email || "",
      }));
      setCustomers(normalized);
    } catch (err) {
      console.error(err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchCustomers, search]);

  useEffect(() => {
    api.get("api/onyango/job-types/?active_only=true")
      .then((res) => setJobTypes(Array.isArray(res) ? res : res?.results ?? []))
      .catch(() => setJobTypes([]));
  }, []);

  const selectedJobType = form.job_type ? jobTypes.find((jt) => jt.id === parseInt(form.job_type, 10)) : null;

  const filteredJobTypes = useMemo(() => {
    const q = jobTypeSearch.trim().toLowerCase();
    if (!q) return jobTypes;
    return jobTypes.filter(
      (jt) =>
        jt.name.toLowerCase().includes(q) ||
        (jt.code && jt.code.toLowerCase().includes(q))
    );
  }, [jobTypes, jobTypeSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert("Please select a customer from the list.");
      return;
    }
    if (!form.job_type) {
      alert("Please select a job type (fixed price).");
      return;
    }
    if (!form.item_description.trim()) {
      alert("Item description is required.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("api/onyango/repair-jobs/", {
        customer: selectedCustomer.id,
        job_type: parseInt(form.job_type, 10),
        item_description: form.item_description.trim(),
        issue_description: form.issue_description?.trim() || undefined,
        priority: form.priority,
        due_date: form.due_date || null,
        notes: form.notes?.trim() || undefined,
        labour_charges: [],
        parts_used: [],
      });
      router.push("/onyango/repair-jobs");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        (typeof err?.response?.data === "object" ? JSON.stringify(err.response.data) : null) ||
        "Failed to create job";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const phone = selectedCustomer?.phone || selectedCustomer?.phone_number || "";

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden px-2 pb-6 sm:px-0 sm:pb-0">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <Link
          href="/onyango/repair-jobs"
          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-lg py-2 pr-3 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white sm:min-h-0 sm:min-w-0"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" /> Back
        </Link>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">New repair job</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Left: Customer list + Job types */}
        <div className="flex min-w-0 flex-col gap-4">
          <ContentCard
            title="Customers"
            subtitle="Search and select a customer"
            className="flex min-h-0 flex-col"
            noPadding
          >
            <div className="border-b border-gray-200 p-2 sm:p-3 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, phone, email..."
                  className="w-full min-w-0 rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:placeholder-gray-400 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                />
              </div>
            </div>
            <div className="max-h-40 min-h-[120px] flex-1 overflow-y-auto overflow-x-hidden p-2 sm:max-h-48">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                </div>
              ) : customers.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  {search ? "No customers match your search." : "No customers found."}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {customers.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(c)}
                        className={`w-full min-w-0 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                          selectedCustomer?.id === c.id
                            ? "bg-brand-500 text-white"
                            : "bg-gray-50 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span className="block truncate font-medium">{c.name}</span>
                        {(c.phone || c.phone_number) && (
                          <span className="mt-0.5 block truncate text-xs opacity-90">
                            {c.phone || c.phone_number}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ContentCard>

          {/* Job types card with search */}
          <ContentCard
            title="Job types"
            subtitle={`${filteredJobTypes.length} type(s) — search and select`}
            className="flex min-h-0 flex-col"
            noPadding
          >
            <div className="border-b border-gray-200 p-2 sm:p-3 dark:border-gray-700">
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-gray-400" />
                <input
                  type="text"
                  value={jobTypeSearch}
                  onChange={(e) => setJobTypeSearch(e.target.value)}
                  placeholder="Search by name or code..."
                  className="w-full min-w-0 rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:placeholder-gray-400 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto overflow-x-hidden p-2 sm:max-h-64">
              {filteredJobTypes.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  {jobTypeSearch ? "No job types match your search." : "No job types loaded."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredJobTypes.map((jt) => {
                    const isSelected = form.job_type === String(jt.id);
                    return (
                      <li key={jt.id}>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, job_type: String(jt.id) }))}
                          className={`w-full min-w-0 rounded-xl border-2 px-3 py-3 text-left text-sm transition-colors ${
                            isSelected
                              ? "border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-500 dark:bg-brand-900/30 dark:text-brand-200"
                              : "border-transparent bg-gray-50 text-gray-800 hover:border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-700"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                            <span className="min-w-0 flex-1 font-semibold break-words">{jt.name}</span>
                            <span className="shrink-0 tabular-nums font-medium text-gray-600 dark:text-gray-300">
                              TZS {Number(jt.fixed_price).toLocaleString()}
                            </span>
                          </div>
                          {jt.code && (
                            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                              Code: {jt.code}
                            </p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </ContentCard>
        </div>

        {/* Right: Selected customer + form */}
        <ContentCard
          title="Repair details"
          subtitle={selectedCustomer ? "Complete the form and create the job" : "Select a customer from the list"}
          className="flex min-w-0 flex-col overflow-visible lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto"
        >
          {selectedCustomer ? (
            <>
              <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50 sm:mb-6 sm:p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Selected customer
                </p>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.name}
                    </p>
                    {phone && (
                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden text-sm text-gray-600 dark:text-gray-300">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{phone}</span>
                      </p>
                    )}
                    {selectedCustomer.email && (
                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden text-sm text-gray-600 dark:text-gray-300">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{selectedCustomer.email}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Job type (fixed labour price) *
                  </label>
                  <select
                    required
                    value={form.job_type}
                    onChange={(e) => setForm((f) => ({ ...f, job_type: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                  >
                    <option value="">Select job type</option>
                    {jobTypes.map((jt) => (
                      <option key={jt.id} value={jt.id}>
                        {jt.name} — TZS {Number(jt.fixed_price).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {selectedJobType && (
                    <p className="mt-1.5 flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs font-medium text-brand-600 dark:text-brand-400 sm:text-sm">
                      <DollarSign className="h-4 w-4 shrink-0" />
                      <span className="break-words">
                        Full price (labour + expected materials): TZS {Number(selectedJobType.fixed_price).toLocaleString()}. When materials are requested, cashier sees the cost and grants permission; when the job is paid, materials amount goes to shop and the rest is workshop income.
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Item description *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.item_description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, item_description: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                    placeholder="e.g. Power drill, water pump"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Issue description
                  </label>
                  <textarea
                    value={form.issue_description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, issue_description: e.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                    placeholder="What is wrong?"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Priority
                    </label>
                    <select
                      value={form.priority}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, priority: e.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Due date
                    </label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, due_date: e.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                    placeholder="Optional notes"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-2 sm:gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50 sm:flex-initial"
                  >
                    <Wrench className="h-4 w-4 shrink-0" />
                    {submitting ? "Creating..." : "Create job"}
                  </button>
                  <Link
                    href="/onyango/repair-jobs"
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 sm:flex-initial"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 dark:border-gray-700 dark:bg-gray-800/30 sm:py-12">
              <User className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600 sm:h-12 sm:w-12" />
              <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                Select a customer from the list
              </p>
              <p className="mt-1 text-center text-xs text-gray-400 dark:text-gray-500">
                Use the search to find a customer, then click to load the form
              </p>
            </div>
          )}
        </ContentCard>
      </div>
    </div>
  );
}
