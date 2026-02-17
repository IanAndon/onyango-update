'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  image?: string;
  unit_id: number | null;
  unit_code: string | null;  // 'shop' | 'workshop' – used for unit-specific dashboard and nav
  unit_name: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void; // add logout here
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {}, // default no-op
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/me/`,
          { withCredentials: true }
        );
        setUser(res.data);
      } catch (err) {
        setUser(null);
        console.error('Failed to fetch /me', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  // Here's your logout method that clears user state
  const logout = () => {
    setUser(null);
    // Optionally clear other auth stuff here, e.g. localStorage/sessionStorage tokens
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
