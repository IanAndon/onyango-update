import axios from "axios";
import { getCookie } from "cookies-next";
import { useState } from "react";

function AddBatchForm({
  productId,
  onClose,
}: {
  productId: number;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    batch_code: '',
    expiry_date: '',
    quantity: 0,
    buying_price: '',
    selling_price: '',
    wholesale_price: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let csrfToken = getCookie("csrftoken");
      if (csrfToken instanceof Promise) csrfToken = await csrfToken;
      csrfToken = csrfToken || "";

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/products/${productId}/add-batch/`,
        form,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
        }
      );

      onClose();
    } catch (err: any) {
      console.error("Failed to add batch:", err?.response?.data || err);
      alert("Error adding batch. Check console for more.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Add New Batch</h2>

      {/* Batch Code */}
      <div className="flex flex-col">
        <label htmlFor="batch_code" className="mb-1 font-semibold text-gray-700 dark:text-gray-300">Batch Code</label>
        <input
          id="batch_code"
          name="batch_code"
          type="text"
          placeholder="Enter batch code"
          required
          onChange={handleChange}
          value={form.batch_code}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      {/* Expiry Date */}
      <div className="flex flex-col">
        <label htmlFor="expiry_date" className="mb-1 font-semibold text-gray-700 dark:text-gray-300">Expiry Date</label>
        <input
          id="expiry_date"
          name="expiry_date"
          type="date"
          required
          onChange={handleChange}
          value={form.expiry_date}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Quantity */}
      <div className="flex flex-col">
        <label htmlFor="quantity" className="mb-1 font-semibold text-gray-700 dark:text-gray-300">Quantity</label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          placeholder="Enter quantity"
          required
          onChange={handleChange}
          value={form.quantity === 0 ? '' : form.quantity}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      {/* Buying Price */}
      <div className="flex flex-col">
        <label htmlFor="buying_price" className="mb-1 font-semibold text-gray-700 dark:text-gray-300">Buying Price (TZS)</label>
        <input
          id="buying_price"
          name="buying_price"
          type="number"
          min="0"
          step="0.01"
          placeholder="Enter buying price"
          required
          onChange={handleChange}
          value={form.buying_price}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      {/* Selling Price */}
      <div className="flex flex-col">
        <label htmlFor="selling_price" className="mb-1 font-semibold text-gray-700 dark:text-gray-300">Retail Price (TZS)</label>
        <input
          id="selling_price"
          name="selling_price"
          type="number"
          min="0"
          step="0.01"
          placeholder="Enter retail price"
          required
          onChange={handleChange}
          value={form.selling_price}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      {/* Wholesale Price */}
      <div className="flex flex-col">
        <label htmlFor="wholesale_price" className="mb-1 font-semibold text-gray-700 dark:text-gray-300">Wholesale Price (TZS)</label>
        <input
          id="wholesale_price"
          name="wholesale_price"
          type="number"
          min="0"
          step="0.01"
          placeholder="Enter wholesale price"
          required
          onChange={handleChange}
          value={form.wholesale_price}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-green-600 px-5 py-2 font-semibold text-white hover:bg-green-700 dark:hover:bg-green-800"
        >
          Add Batch
        </button>
      </div>
    </form>
  );
}

export default AddBatchForm;
