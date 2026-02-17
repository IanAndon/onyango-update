'use client';

import { getCookie } from 'cookies-next';
import axios from 'axios';

interface Props {
  productId: number;
  refresh: () => void;
}

export default function BatchActions({ productId, refresh }: Props) {
  const handleAddBatch = async () => {
    const batch_number = prompt('Batch number?');
    const qty = prompt('Quantity?');
    const expiry_date = prompt('Expiry date (YYYY-MM-DD)?');

    if (!batch_number || !qty || !expiry_date) return;

    try {
      let csrfToken = getCookie('csrftoken');
      if (csrfToken instanceof Promise) csrfToken = await csrfToken;

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}/add_batch/`,
        { batch_number, quantity: parseInt(qty), expiry_date },
        {
          withCredentials: true,
          headers: {
            'X-CSRFToken': csrfToken || '',
          },
        }
      );
      refresh();
      alert('Batch added!');
    } catch (e) {
      console.error(e);
      alert('Failed to add batch');
    }
  };

  return (
    <button
      onClick={handleAddBatch}
      className="mt-2 text-xs text-blue-600 hover:underline dark:text-blue-400"
    >
      + Add Batch
    </button>
  );
}
