"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Wrench, ChevronRight } from "lucide-react";
import api from "@/utils/api";

interface RepairJob {
  id: number;
  customer_detail: { name: string; phone: string };
  item_description: string;
  status: string;
  priority: string;
  intake_date: string;
  due_date: string | null;
  assigned_to_username: string | null;
}

export default function RepairJobsPage() {
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const url = statusFilter
          ? `api/onyango/repair-jobs/?status=${statusFilter}`
          : "api/onyango/repair-jobs/";
        const res = await api.get(url);
        setJobs(Array.isArray(res) ? res : (res?.results ?? []));
      } catch (err) {
        setError("Failed to load repair jobs");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [statusFilter]);

  const statusColors: Record<string, string> = {
    received: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    on_hold: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    collected: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Repair jobs</h1>
          <p className="text-gray-500 dark:text-gray-400">Workshop repair job management</p>
        </div>
        <Link
          href="/onyango/repair-jobs/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New job
        </Link>
      </div>

      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All statuses</option>
          <option value="received">Received</option>
          <option value="in_progress">In progress</option>
          <option value="on_hold">On hold</option>
          <option value="completed">Completed</option>
          <option value="collected">Collected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && <p className="text-red-500">{error}</p>}
      {loading && <p>Loading...</p>}

      {!loading && !error && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">ID</th>
                  <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Customer</th>
                  <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Item</th>
                  <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Assigned</th>
                  <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Intake date</th>
                  <th className="px-4 py-3 font-medium text-gray-900 dark:text-white"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No repair jobs found.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">#{job.id}</td>
                      <td className="px-4 py-3">{job.customer_detail?.name ?? "—"}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate">{job.item_description}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusColors[job.status] ?? "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {job.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">{job.assigned_to_username ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {job.intake_date ? new Date(job.intake_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/onyango/repair-jobs/${job.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
