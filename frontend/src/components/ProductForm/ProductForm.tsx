'use client';

import React, { useState } from 'react';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id?: number;
  name: string;
  buying_price: string;
  selling_price: string;
  wholesale_price: string;
  quantity_in_stock: number;
  threshold: number;
  category: number | null;
}

interface Props {
  categories: Category[];
  product?: Product | null;
  onSubmit: (data: Partial<Product>) => void;
  onCancel: () => void;
}

export default function ProductForm({ categories, product, onSubmit, onCancel }: Props) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    buying_price: product?.buying_price || '',
    selling_price: product?.selling_price || '',
    wholesale_price: product?.wholesale_price || '',
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
      {/* <div>
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
      </div> */}

      {/* <div>
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
      </div> */}

      {/* <div>
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
      </div> */}

      {/* <div>
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
      </div> */}
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
          className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 dark:hover:bg-green-800"
        >
          {product ? 'Save Changes' : 'Add Product'}
        </button>
      </div>
    </form>
  );
}
