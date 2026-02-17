import axios from "axios";

// Helper to get CSRF token from cookie (you already have this, just keep it)
function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add CSRF token header to mutating requests
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase() || "";
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const csrfToken = getCookie("csrftoken");
    if (csrfToken) {
      if (typeof config.headers.set === "function") {
        config.headers.set("X-CSRFToken", csrfToken);
      } else {
        config.headers["X-CSRFToken"] = csrfToken;
      }
    }
  }
  return config;
});

// Auto-refresh logic
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized & not already retried
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Queue the request if a refresh is already in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Hit your refresh token endpoint (adjust path if needed)
        await api.post("/api/token/refresh/");

        processQueue(null);
        isRefreshing = false;

        // Retry original request with fresh token (cookies handled by axios)
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Optional: clear auth state, redirect to signin, whatever your logout flow is
        window.location.href = "/signin"; // or trigger logout logic here

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default {
  get: (path: string) => api.get(path).then((res) => res.data),
  post: (path: string, body: any) => api.post(path, body).then((res) => res.data),
  put: (path: string, body: any) => api.put(path, body).then((res) => res.data),
  patch: (path: string, body: any) => api.patch(path, body).then((res) => res.data),
  delete: (path: string) => api.delete(path).then((res) => res.data),
};
