'use client';

import React, { useState } from 'react';

type StockStatus = 'Up' | 'Down' | 'Stable';

export default function AddStockPage() {
  const [form, setForm] = useState({
    symbol: '',
    name: '',
    price: '',
    high: '',
    low: '',
    status: 'Up' as StockStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.symbol.trim()) newErrors.symbol = 'Symbol is required';
    if (!form.name.trim()) newErrors.name = 'Company name is required';

    // Check numbers and > 0
    ['price', 'high', 'low'].forEach((field) => {
      if (!form[field as keyof typeof form].trim()) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      } else if (isNaN(Number(form[field as keyof typeof form]))) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} must be a number`;
      } else if (Number(form[field as keyof typeof form]) < 0) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} must be positive`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // For now just log the stock data
    console.log('New Stock:', form);

    // Reset form
    setForm({
      symbol: '',
      name: '',
      price: '',
      high: '',
      low: '',
      status: 'Up',
    });
    setErrors({});
    alert('Stock added! (This is just a demo)');
  };

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6 bg-white rounded-xl border border-gray-200 dark:bg-white/5 dark:border-white/10">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Add New Stock</h1>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Symbol */}
        <div>
          <label htmlFor="symbol" className="block mb-1 text-gray-700 dark:text-gray-300 font-medium">
            Symbol
          </label>
          <input
            type="text"
            name="symbol"
            id="symbol"
            value={form.symbol}
            onChange={handleChange}
            className={`w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/5 dark:border-white/10 dark:text-white ${
              errors.symbol ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.symbol && <p className="mt-1 text-xs text-red-500">{errors.symbol}</p>}
        </div>

        {/* Company Name */}
        <div>
          <label htmlFor="name" className="block mb-1 text-gray-700 dark:text-gray-300 font-medium">
            Company Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={form.name}
            onChange={handleChange}
            className={`w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/5 dark:border-white/10 dark:text-white ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block mb-1 text-gray-700 dark:text-gray-300 font-medium">
            Price
          </label>
          <input
            type="number"
            step="0.01"
            name="price"
            id="price"
            value={form.price}
            onChange={handleChange}
            className={`w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/5 dark:border-white/10 dark:text-white ${
              errors.price ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
        </div>

        {/* High */}
        <div>
          <label htmlFor="high" className="block mb-1 text-gray-700 dark:text-gray-300 font-medium">
            High
          </label>
          <input
            type="number"
            step="0.01"
            name="high"
            id="high"
            value={form.high}
            onChange={handleChange}
            className={`w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/5 dark:border-white/10 dark:text-white ${
              errors.high ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.high && <p className="mt-1 text-xs text-red-500">{errors.high}</p>}
        </div>

        {/* Low */}
        <div>
          <label htmlFor="low" className="block mb-1 text-gray-700 dark:text-gray-300 font-medium">
            Low
          </label>
          <input
            type="number"
            step="0.01"
            name="low"
            id="low"
            value={form.low}
            onChange={handleChange}
            className={`w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/5 dark:border-white/10 dark:text-white ${
              errors.low ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.low && <p className="mt-1 text-xs text-red-500">{errors.low}</p>}
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block mb-1 text-gray-700 dark:text-gray-300 font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/5 dark:border-white/10 dark:text-white"
          >
            <option value="Up">Up</option>
            <option value="Down">Down</option>
            <option value="Stable">Stable</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 font-semibold"
        >
          Add Stock
        </button>
      </form>
    </div>
  );
}
