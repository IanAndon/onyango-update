'use client';

interface BatchBadgeProps {
  batch_number: string;
  quantity: number;
  expiry_date: string;
}

const getExpiryColor = (expiryDate: string) => {
  const now = new Date();
  const exp = new Date(expiryDate);
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'bg-red-100 text-red-700 dark:bg-red-800/20 dark:text-red-400';
  if (diffDays <= 30) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400';
  return 'bg-green-100 text-green-700 dark:bg-green-800/20 dark:text-green-400';
};

export default function BatchBadge({ batch_number, quantity, expiry_date }: BatchBadgeProps) {
  return (
    <div className={`rounded px-2 py-1 text-xs font-semibold ${getExpiryColor(expiry_date)}`}>
      {batch_number} — {quantity} pcs — expires {new Date(expiry_date).toLocaleDateString()}
    </div>
  );
}
