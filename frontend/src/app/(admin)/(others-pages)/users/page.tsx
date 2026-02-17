"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Users, Store, Wrench, Search } from "lucide-react";
import api from "@/utils/api";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import PageHeader from "@/components/layout/PageHeader";

interface Unit {
  id: number;
  code: string;
  name: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role: string;
  unit: number | null;
  unit_code: string | null;
  unit_name: string | null;
  is_active: boolean;
  is_staff?: boolean;
  last_login: string | null;
  date_joined?: string;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "technician", label: "Technician" },
  { value: "storekeeper", label: "Storekeeper" },
  { value: "staff", label: "Staff" },
];

type UnitFilter = "all" | "shop" | "workshop";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("all");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = unitFilter !== "all" ? `api/users?unit=${unitFilter}` : "api/users/";
      const res = await api.get(url);
      const list = Array.isArray(res) ? res : (res as { results?: User[] })?.results ?? [];
      setUsers(list);
    } catch {
      setError("Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [unitFilter]);

  const fetchUnits = useCallback(async () => {
    try {
      const res = await api.get("api/onyango/units/");
      const list = Array.isArray(res) ? res : (res as { results?: Unit[] })?.results ?? [];
      setUnits(list);
    } catch {
      setUnits([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const filteredUsers = users.filter(
    (u) =>
      `${u.first_name} ${u.last_name} ${u.username} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddUser = async (data: Record<string, unknown>) => {
    try {
      await api.post("api/users/", data);
      setAddModalOpen(false);
      fetchUsers();
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } };
      const msg = err?.response?.data
        ? Object.values(err.response.data).flat().join(" ")
        : "Failed to add user";
      throw new Error(msg);
    }
  };

  const handleEditUser = async (data: Record<string, unknown>) => {
    if (!currentUser) return;
    try {
      await api.put(`api/users/${currentUser.id}/`, data);
      setEditModalOpen(false);
      setCurrentUser(null);
      fetchUsers();
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } };
      const msg = err?.response?.data
        ? Object.values(err.response.data).flat().join(" ")
        : "Failed to update user";
      throw new Error(msg);
    }
  };

  const handleDeleteUser = async () => {
    if (!currentUser) return;
    try {
      await api.delete(`api/users/${currentUser.id}/`);
      setDeleteModalOpen(false);
      setCurrentUser(null);
      fetchUsers();
    } catch {
      setError("Failed to delete user");
    }
  };

  const shopUsers = filteredUsers.filter((u) => u.unit_code === "shop");
  const workshopUsers = filteredUsers.filter((u) => u.unit_code === "workshop");
  const noUnitUsers = filteredUsers.filter((u) => !u.unit_code);

  const renderUserTable = (list: User[], emptyMessage: string) => (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
          <tr>
            <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Name</th>
            <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Username</th>
            <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Role</th>
            <th className="px-4 py-3 font-medium text-gray-900 dark:text-white">Status</th>
            <th className="px-4 py-3 font-medium text-gray-900 dark:text-white hidden sm:table-cell">Last login</th>
            <th className="px-4 py-3 font-medium text-gray-900 dark:text-white text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            list.map((user) => (
              <tr
                key={user.id}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{user.username}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.is_active
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    }`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                  {formatDate(user.last_login)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentUser(user);
                        setEditModalOpen(true);
                      }}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentUser(user);
                        setDeleteModalOpen(true);
                      }}
                      className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage staff accounts, roles, and units (Shop & Workshop)."
        action={
          <Button
            onClick={() => {
              setCurrentUser(null);
              setAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors"
          >
            <Plus size={18} /> Add user
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400"
          />
        </div>
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={() => setUnitFilter("all")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              unitFilter === "all"
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            <Users size={16} /> All
          </button>
          <button
            type="button"
            onClick={() => setUnitFilter("shop")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              unitFilter === "shop"
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            <Store size={16} /> Shop
          </button>
          <button
            type="button"
            onClick={() => setUnitFilter("workshop")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              unitFilter === "workshop"
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            <Wrench size={16} /> Workshop
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : unitFilter === "all" ? (
        /* Separate Shop and Workshop when viewing All */
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <Store className="h-5 w-5 text-brand-500" /> Shop users
              <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-600 dark:text-gray-200">
                {shopUsers.length}
              </span>
            </h2>
            {renderUserTable(shopUsers, "No shop users.")}
          </section>
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <Wrench className="h-5 w-5 text-amber-500" /> Workshop users
              <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-600 dark:text-gray-200">
                {workshopUsers.length}
              </span>
            </h2>
            {renderUserTable(workshopUsers, "No workshop users.")}
          </section>
          {noUnitUsers.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <Users className="h-5 w-5 text-gray-500" /> No unit assigned
                <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-600 dark:text-gray-200">
                  {noUnitUsers.length}
                </span>
              </h2>
              {renderUserTable(noUnitUsers, "No users without unit.")}
            </section>
          )}
        </div>
      ) : (
        <section>
          {renderUserTable(
            filteredUsers,
            unitFilter === "shop" ? "No shop users." : "No workshop users."
          )}
        </section>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={addModalOpen || editModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setEditModalOpen(false);
          setCurrentUser(null);
        }}
        className="max-w-lg p-0 overflow-hidden rounded-2xl"
      >
        <UserForm
          user={currentUser}
          units={units}
          onCancel={() => {
            setAddModalOpen(false);
            setEditModalOpen(false);
            setCurrentUser(null);
          }}
          onSubmit={currentUser ? handleEditUser : handleAddUser}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCurrentUser(null);
        }}
        className="max-w-sm rounded-2xl p-6"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete user</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to delete <strong>{currentUser?.username}</strong>? This cannot be undone.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            onClick={() => {
              setDeleteModalOpen(false);
              setCurrentUser(null);
            }}
            className="rounded-xl border border-gray-300 dark:border-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            className="rounded-xl bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function UserForm({
  user,
  units,
  onCancel,
  onSubmit,
}: {
  user: User | null;
  units: Unit[];
  onCancel: () => void;
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
}) {
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [role, setRole] = useState(user?.role ?? "cashier");
  const [unitId, setUnitId] = useState<string>(user?.unit ? String(user.unit) : "");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEdit = !!user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const data: Record<string, unknown> = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      username: username.trim(),
      email: email.trim(),
      role,
      unit: unitId ? Number(unitId) : null,
      is_active: isActive,
    };

    if (!isEdit) {
      if (!password || password.length < 6) {
        setFormError("Password is required (min 6 characters).");
        return;
      }
      if (password !== confirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }
      data.password = password;
      data.confirm_password = confirmPassword;
    } else if (password || confirmPassword) {
      if (password !== confirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }
      if (password && password.length < 6) {
        setFormError("Password must be at least 6 characters.");
        return;
      }
      if (password) {
        data.password = password;
        data.confirm_password = confirmPassword;
      }
    }

    setSaving(true);
    try {
      await onSubmit(data);
      onCancel();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/50">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isEdit ? "Edit user" : "Add user"}
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {isEdit ? "Update role, unit, and status." : "Create a new staff account."}
        </p>
      </div>
      <div className="space-y-4 p-6">
        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
            {formError}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              First name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Last name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isEdit}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
          />
          {isEdit && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Username cannot be changed.</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Unit
            </label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">No unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </div>
        </div>
        {(!isEdit || password || confirmPassword) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password {isEdit && "(leave blank to keep)"}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "••••••••" : "Min 6 characters"}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
        </label>
      </div>
      <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/50">
        <Button type="button" onClick={onCancel} className="rounded-xl border border-gray-300 dark:border-gray-600">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add user"}
        </Button>
      </div>
    </form>
  );
}
