'use client';

import React from 'react';
import { Pencil, Trash, Plus } from 'lucide-react';
import BatchBadge from './BatchBadge';
import Button from '@/components/ui/button/Button';

interface Batch {
  id: number;
  code: string;
  quantity: number;
  expiry_date: string;
  is_expired: boolean;
  is_soon_expiring: boolean;
}

interface Product {
  id: number;
  name: string;
  category: string;
  total_quantity: number;
  retail_price: string;
  batches: Batch[];
}

interface ProductTableRowProps {
  product: Product;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: number) => void;
  onEditBatch: (batch: Batch, product: Product) => void;
  onAddBatch: (product: Product) => void;
}

export default function ProductTableRow({
  product,
  onEditProduct,
  onDeleteProduct,
  onEditBatch,
  onAddBatch,
}: ProductTableRowProps) {
  return (
    <tr className="border-b">
      <td className="py-3 px-4 font-medium">{product.name}</td>
      <td className="py-3 px-4">{product.category}</td>
      <td className="py-3 px-4 text-center">{product.total_quantity}</td>
      <td className="py-3 px-4 text-right">{product.retail_price}</td>

      <td className="py-3 px-4 flex flex-wrap gap-2">
        {product.batches.map((batch) => (
          <BatchBadge
            key={batch.id}
            batch={batch}
            onClick={() => onEditBatch(batch, product)}
          />
        ))}
      </td>

      <td className="py-3 px-4 flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onAddBatch(product)}>
          <Plus className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEditProduct(product)}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDeleteProduct(product.id)}>
          <Trash className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  );
}
