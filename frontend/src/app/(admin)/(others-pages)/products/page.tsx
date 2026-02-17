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

interface Product {
  id: number;
  name: string;
  buying_price: string;
  selling_price: string;       // added retail price
  wholesale_price: string;    // added wholesale price
  quantity_in_stock: number;
  threshold: number;
  created_at: string;
  category: number | null;
  category_name?: string;
}

interface Category {
  id: number;
  name: string;
}

export default function ProductsPage() {
  const { user, loading: authLoading } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/products/`, { withCredentials: true });
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/categories/`, { withCredentials: true });
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories', err);
    }
  };

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
      const isLowStock = product.quantity_in_stock <= product.threshold;
      return matchesSearch && matchesCategory && (!showLowStockOnly || isLowStock);
    })
    .sort((a, b) => a.quantity_in_stock - b.quantity_in_stock);

  const isAdmin = user?.role === 'admin';

  const openAddModal = () => {
    setCurrentProduct(null);
    setAddModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setCurrentProduct(product);
    setEditModalOpen(true);
  };

  const openDeleteModal = (product: Product) => {
    setCurrentProduct(product);
    setDeleteModalOpen(true);
  };

  const handleAddProduct = async (data: Partial<Product>) => {
    try {
      let csrfToken = getCookie("csrftoken");
      if (csrfToken instanceof Promise) {
        csrfToken = await csrfToken;
      }
      csrfToken = csrfToken || "";

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/products/`,
        data,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken as string,
          },
        }
      );
      setAddModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error('Failed to add product:', err);
    }
  };

  const handleEditProduct = async (data: Partial<Product>) => {
    if (!currentProduct) return;
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/products/${currentProduct.id}/`,
        data,
        { withCredentials: true }
      );
      setEditModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error('Failed to edit product:', err);
    }
  };

  const handleDeleteProduct = async () => {
    if (!currentProduct) return;
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/products/${currentProduct.id}/`,
        { withCredentials: true }
      );
      setDeleteModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  const handleUpdateStock = async (product: Product) => {
    const quantity = prompt(`Enter quantity to add to "${product.name}" stock:`);

    if (!quantity) return;
    const amount = parseInt(quantity);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive number.");
      return;
    }

    try {
      let csrfToken = getCookie("csrftoken");
      if (csrfToken instanceof Promise) csrfToken = await csrfToken;
      csrfToken = csrfToken || "";

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/products/${product.id}/update_stock/`,
        { quantity: amount },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
        }
      );
      fetchProducts();
    } catch (err) {
      console.error("Failed to update stock:", err);
      alert("Error updating stock. Check logs.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product inventory"
        subtitle="Manage products and stock"
        action={
          isAdmin ? (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              <Plus size={18} strokeWidth={2} /> Add product
            </button>
          ) : undefined
        }
      />

      <ContentCard noPadding>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name…"
            className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50/80 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:placeholder:text-gray-500 sm:w-56"
          />
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
            className="h-10 rounded-lg border border-gray-200 bg-gray-50/80 px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white sm:w-44"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            Show low stock only
          </label>
        </div>

      <div className="overflow-x-auto">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[950px]">
            <table className="w-full text-left">
              <thead className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Product</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Quantity</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Buying</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Retail</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Wholesale</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Created</th>
                  {isAdmin && <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan={isAdmin ? 8 : 7} className="px-5 py-4 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 8 : 7} className="px-5 py-4 text-center text-gray-500 dark:text-gray-400">No matching products found.</td></tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/30">
                      <td className="px-5 py-4 text-gray-700 dark:text-white">{product.name}</td>
                      <td className="px-5 py-4 text-gray-700 dark:text-white">{product.category_name || 'Uncategorized'}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${
                          product.quantity_in_stock === 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-800/20 dark:text-red-400'
                            : product.quantity_in_stock <= product.threshold
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-800/20 dark:text-green-400'
                        }`}>
                          {product.quantity_in_stock}{' '}
                          {product.quantity_in_stock === 0
                            ? '(Out of stock)'
                            : product.quantity_in_stock <= product.threshold
                            ? '(Low stock)'
                            : '(In stock)'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-700 dark:text-white">TZS{product.buying_price}</td>
                      <td className="px-5 py-4 text-gray-700 dark:text-white">TZS{product.selling_price}</td>
                      <td className="px-5 py-4 text-gray-700 dark:text-white">TZS{product.wholesale_price}</td>
                      <td className="px-5 py-4 text-gray-700 dark:text-white">
                        {new Intl.DateTimeFormat('en-GB', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }).format(new Date(product.created_at))}
                      </td>
                      {isAdmin && (
                      <td className="px-5 py-4 space-x-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/10"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleUpdateStock(product)}
                          className="inline-flex items-center gap-1 rounded-md border border-green-400 px-2 py-1 text-sm text-green-600 hover:bg-green-100 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-800/20"
                          aria-label={`Update stock for ${product.name}`}
                        >
                          <Plus size={14} /> Update Stock
                        </button>

                        <button
                          onClick={() => openDeleteModal(product)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-400 px-2 py-1 text-sm text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-800/20"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash size={14} /> Delete
                        </button>
                      </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </ContentCard>

      {/* Add Product Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} className="max-w-md p-6">
        <ProductForm
          categories={categories}
          onSubmit={handleAddProduct}
          onCancel={() => setAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} className="max-w-md p-6">
        {currentProduct && (
          <ProductForm
            categories={categories}
            product={currentProduct}
            onSubmit={handleEditProduct}
            onCancel={() => setEditModalOpen(false)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} className="max-w-sm p-6">
        <div className="text-center">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Confirm Delete</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            Are you sure you want to delete <strong>{currentProduct?.name}</strong>?
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteProduct}
              className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 dark:hover:bg-red-800"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProductForm({
  categories,
  product,
  onSubmit,
  onCancel,
}: {
  categories: Category[];
  product?: Product | null;
  onSubmit: (data: Partial<Product>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    buying_price: product?.buying_price || '',
    selling_price: product?.selling_price || '',          // added
    wholesale_price: product?.wholesale_price || '',    // added
    quantity_in_stock: product?.quantity_in_stock || 0,
    threshold: product?.threshold || 0,
    category: product?.category || null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'quantity_in_stock' || name === 'threshold'
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
        {product ? 'Edit Product' : 'Add Product'}
      </h2>
      <div>
        <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Name</label>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Buying Price</label>
        <input
          name="buying_price"
          type="number"
          step="0.01"
          value={formData.buying_price}
          onChange={handleChange}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Retail Price</label>
        <input
          name="selling_price"
          type="number"
          step="0.01"
          value={formData.selling_price}
          onChange={handleChange}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Wholesale Price</label>
        <input
          name="wholesale_price"
          type="number"
          step="0.01"
          value={formData.wholesale_price}
          onChange={handleChange}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Quantity in Stock</label>
        <input
          name="quantity_in_stock"
          type="number"
          value={formData.quantity_in_stock}
          onChange={handleChange}
          required
          min={0}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Threshold</label>
        <input
          name="threshold"
          type="number"
          value={formData.threshold}
          onChange={handleChange}
          required
          min={0}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Category</label>
        <select
          name="category"
          value={formData.category || ''}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option value="">Uncategorized</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-4 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:hover:bg-blue-800"
        >
          {product ? 'Save Changes' : 'Add Product'}
        </button>
      </div>
    </form>
  );
}
