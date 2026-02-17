'use client';

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import CompanyLogo from "@/components/common/CompanyLogo";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { getCookie } from "cookies-next";

export default function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    let timeout1: NodeJS.Timeout;
    let timeout2: NodeJS.Timeout;

    if (errorMsg) {
      setShowError(true);
      timeout1 = setTimeout(() => setShowError(false), 3000);
      timeout2 = setTimeout(() => setErrorMsg(""), 2500);
    }

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [errorMsg]);

  const fetchCsrfToken = async () => {
    try {
      await axios.get(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/csrf-token/`, {
        withCredentials: true,
      });
    } catch (err) {
      console.error("CSRF fetch error:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      let csrfToken = getCookie("csrftoken");
      if (csrfToken instanceof Promise) {
        csrfToken = await csrfToken;
      }
      csrfToken = csrfToken || "";

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/login/`,
        { username, password },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken as string,
          },
        }
      );

      router.push("/");
    } catch (error: any) {
      if (error.response?.data?.detail) {
        setErrorMsg(error.response.data.detail);
      } else {
        setErrorMsg("Invalid credentials, try again 🥴");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center flex-1 w-full animate-signin-fade-in-up">
      <div className="mb-8 flex items-center gap-3">
        <CompanyLogo variant="light" size={48} />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            Sign in
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Onyango Construction
          </p>
        </div>
      </div>
      <div>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Enter your credentials to access the dashboard.
        </p>

        <form onSubmit={handleLogin}>
          <div className="space-y-7">
            <div>
              <Label>
                Username <span className="text-error-500">*</span>
              </Label>
              <Input
                placeholder="Realkado"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>
                Password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                >
                  {showPassword ? (
                    <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                  ) : (
                    <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                  )}
                </span>
              </div>
            </div>

            {errorMsg && (
              <p
                className={`text-error-500 text-sm font-medium text-center transition-opacity duration-500 ${
                  showError ? "opacity-100" : "opacity-0"
                } mb-3`}
              >
                {errorMsg}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox checked={isChecked} onChange={setIsChecked} />
                <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                  Keep me logged in
                </span>
              </div>
              
            </div>

            <div>
              <Button className="w-full py-3" size="sm" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
