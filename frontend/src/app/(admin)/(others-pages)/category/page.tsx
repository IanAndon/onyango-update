'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash } from 'lucide-react';
import axios from 'axios';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import { useAuth } from '@/context/auth-context';
import { getCookie } from 'cookies-next';
import PageHeader from '@/components/layout/PageHeader';
import ContentCard from '@/components/layout/ContentCard';
import { DataTable } from '@/components/layout/DataTable';

interface Category {
  id: number;
  name: string;
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/categories/`, {
        withCredentials: true,
      });
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCategory = async (data: Partial<Category>) => {
    try {
      const csrf = await getCookie('csrftoken');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories/`,
        data,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf || '',
          },
        }
      );
      setAddModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  };

  const handleEditCategory = async (data: Partial<Category>) => {
    if (!currentCategory) return;
    try {
      const csrf = await getCookie('csrftoken');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${currentCategory.id}/`,
        data,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf || '',
          },
        }
      );
      setEditModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error('Failed to edit category:', err);
    }
  };

  const handleDeleteCategory = async () => {
    if (!currentCategory) return;
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${currentCategory.id}/`,
        { withCredentials: true }
      );
      setDeleteModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  return (
    <div className="space-y-6 text-sm">
      <PageHeader
        title="Categories"
        subtitle="Product categories for inventory."
        action={
          isAdmin && (
            <Button
              onClick={() => {
                setCurrentCategory(null);
                setAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-white hover:bg-brand-600"
            >
              <Plus size={16} /> Add category
            </Button>
          )
        }
      />

      <ContentCard
        title="Category list"
        subtitle={loading ? 'Loading…' : `${filteredCategories.length} categor(y/ies)`}
      >
        <div className="space-y-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category..."
            className="input-onyango max-w-xs"
          />
          <DataTable>
            <thead>
              <tr>
                <th>Category name</th>
                {isAdmin && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 2 : 1} className="text-center text-gray-500 dark:text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 2 : 1} className="text-center text-gray-500 dark:text-gray-400">
                    No categories found.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category) => (
                  <tr key={category.id}>
                    <td className="font-medium">{category.name}</td>
                    {isAdmin && (
                      <td className="text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => {
                              setCurrentCategory(category);
                              setEditModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            <Pencil size={14} /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setCurrentCategory(category);
                              setDeleteModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-error-500/30 px-2.5 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                          >
                            <Trash size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
        </div>
      </ContentCard>

      {/* Add Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} className="max-w-md p-6">
        <CategoryForm
          onSubmit={handleAddCategory}
          onCancel={() => setAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} className="max-w-md p-6">
        {currentCategory && (
          <CategoryForm
            category={currentCategory}
            onSubmit={handleEditCategory}
            onCancel={() => setEditModalOpen(false)}
          />
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} className="max-w-sm p-6">
        <div className="text-center">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Confirm Delete</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            Are you sure you want to delete <strong>{currentCategory?.name}</strong>?
          </p>
          <div className="flex justify-center gap-4">
            <button onClick={() => setDeleteModalOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-white/10">Cancel</button>
            <button onClick={handleDeleteCategory} className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 dark:hover:bg-red-800">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// 💡 Category Form
function CategoryForm({
  category,
  onSubmit,
  onCancel,
}: {
  category?: Category;
  onSubmit: (data: Partial<Category>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="border-l-4 border-brand-500 pl-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          {category ? 'Edit category' : 'Add category'}
        </h2>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Category name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="input-onyango"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          {category ? 'Save changes' : 'Add category'}
        </button>
      </div>
    </form>
  );
}
