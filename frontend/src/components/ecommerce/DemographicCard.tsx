"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import ContentCard from "@/components/layout/ContentCard";

interface User {
  username: string;
  last_login: string;
  role: string;
}

const convertToEAT = (utcDate: string): Date => {
  const date = new Date(utcDate);
  const eatOffset = 3 * 60;
  const localOffset = date.getTimezoneOffset();
  return new Date(date.getTime() + (eatOffset + localOffset) * 60 * 1000);
};

export default function DemographicCard() {
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/me/`, { credentials: "include" });
        const data = await res.json();
        setUserRole(data.role);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCurrentUser();
  }, [BASE_URL]);

  useEffect(() => {
    if (userRole !== "admin") return;
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/dashboard/recent-logins/`, { credentials: "include" });
        setRecentUsers(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchUsers();
  }, [userRole, BASE_URL]);

  if (loading || userRole !== "admin") return null;

  return (
    <ContentCard
      title="Recent logins"
      subtitle="Based on last login time"
    >
      <div className="space-y-4">
        {recentUsers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No recent logins.</p>
        ) : (
          recentUsers.map((user, index) => {
            const eatTime = convertToEAT(user.last_login);
            const timeAgo = formatDistanceToNow(eatTime, { addSuffix: true });
            return (
              <div
                key={index}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-2.5 py-2 dark:border-gray-800 dark:bg-gray-800/30 sm:gap-3 sm:rounded-xl sm:px-3 sm:py-2.5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <Image
                      src="/images/user/owner.png"
                      alt={user.username}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {user.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-brand-500/15 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                  {user.role}
                </span>
              </div>
            );
          })
        )}
      </div>
    </ContentCard>
  );
}
