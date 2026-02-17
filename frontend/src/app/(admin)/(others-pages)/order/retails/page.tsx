'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Redirect legacy /order/retails to /pos */
export default function RetailPOSRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/pos');
  }, [router]);
  return (
    <div className="flex min-h-[200px] items-center justify-center text-gray-500 dark:text-gray-400">
      Redirecting to POS…
    </div>
  );
}
