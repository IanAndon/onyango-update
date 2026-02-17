"use client";

import React, { useEffect, useState } from "react";
import { Wrench, Plus, Pencil, DollarSign } from "lucide-react";
import api from "@/utils/api";
import ContentCard from "@/components/layout/ContentCard";
import { useAuth } from "@/context/auth-context";

interface JobType {
  id: number;
  name: string;
  code: string | null;
  fixed_price: string;
  description: string | null;
  is_active: boolean;
}

const canEditJobTypes = (role: string | undefined) =>
  role && ["admin", "owner", "manager"].includes(role);

export default function JobTypesPage() {
  const { user } = useAuth();
  const [list, setList] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<JobType | null>(null);
  const [form, setForm] = useState({ name: "", code: "", fixed_price: "", description: "", is_active: true });
  const [saving, setSaving] = useState(false);

  const fetchList = () => {
    setLoading(true);
    api
      .get("api/onyango/job-types/")
      .then((res) => setList(Array.isArray(res) ? res : res?.results ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", code: "", fixed_price: "", description: "", is_active: true });
    setModalOpen(true);
  };

  const openEdit = (row: JobType) => {
    setEditing(row);
    setForm({
      name: row.name,
      code: row.code || "",
      fixed_price: String(row.fixed_price),
      description: row.description || "",
      is_active: row.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.fixed_price.trim()) {
      alert("Name and fixed price are required.");
      return;
    }
    const price = parseFloat(form.fixed_price);
    if (isNaN(price) || price < 0) {
      alert("Fixed price must be a valid number.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        fixed_price: price,
        description: form.description.trim() || null,
        is_active: form.is_active,
      };
      if (editing) {
        await api.patch(`api/onyango/job-types/${editing.id}/`, payload);
      } else {
        await api.post("api/onyango/job-types/", payload);
      }
      setModalOpen(false);
      fetchList();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const canEdit = canEditJobTypes(user?.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job types</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Fixed-price labour types for workshop. Managed by admin/manager; cashiers select when creating a job.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" /> Add job type
          </button>
        )}
      </div>

      <ContentCard title="All job types" subtitle="Fixed price = labour + expected materials. Customer pays this once; when paid, materials portion goes to shop, remainder to workshop.">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-gray-500 dark:text-gray-400">No job types yet. Add one to use in repair jobs.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Code</th>
                  <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Fixed price (TZS)</th>
                  <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Status</th>
                  {canEdit && <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.code ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      TZS {Number(row.fixed_price).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={row.is_active ? "text-success-600 dark:text-success-400" : "text-gray-500"}>
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              {editing ? "Edit job type" : "Add job type"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="e.g. Full service, Minor repair"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Code</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="Optional short code"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Fixed price (TZS) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={0.01}
                  value={form.fixed_price}
                  onChange={(e) => setForm((f) => ({ ...f, fixed_price: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="Labour price"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              {editing && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editing ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => !saving && setModalOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
