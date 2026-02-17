'use client';

import React from 'react';
import clsx from 'clsx';

interface Batch {
  id: number;
  code: string;
  quantity: number;
  expiry_date: string;
  is_expired: boolean;
  is_soon_expiring: boolean;
}

interface BatchBadgeProps {
  batch: Batch;
  onClick?: () => void;
}

export default function BatchBadge({ batch, onClick }: BatchBadgeProps) {
  const getBadgeColor = () => {
    if (batch.is_expired) return 'bg-red-600 text-white';
    if (batch.is_soon_expiring) return 'bg-yellow-500 text-black';
    return 'bg-green-600 text-white';
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'cursor-pointer px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm',
        getBadgeColor()
      )}
    >
      <span>{batch.code}</span>
      <span className="opacity-80">({batch.quantity})</span>
    </div>
  );
}
