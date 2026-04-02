import type { ApiErrorResponse } from "@influencer-manager/shared/types/mobile";

import { getSessionToken } from "../../state/auth-store";

export class ApiError extends Error {
  status: number;
  details: ApiErrorResponse | undefined;

  constructor(status: number, message: string, details?: ApiErrorResponse) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type QueryValue = string | number | boolean | null | undefined;

function normalizeBaseUrl(value?: string) {
  const baseUrl = (value ?? "http://localhost:3000").replace(/\/$/, "");
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
}

function buildQueryString(query?: Record<string, QueryValue>) {
  if (!query) {
    return "";
  }

  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );

  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

function normalizeErrorMessage(details?: ApiErrorResponse, fallback?: string) {
  const { message } = details ?? {};
  if (Array.isArray(message)) {
    return message.join(", ");
  }
  if (typeof message === "string" && message.length > 0) {
    return message;
  }
  return fallback ?? "Request failed.";
}

class ApiClient {
  private readonly baseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);

  async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PATCH" | "DELETE";
      auth?: boolean;
      query?: Record<string, QueryValue>;
      body?: unknown;
    } = {},
  ) {
    const token = options.auth === false ? null : getSessionToken();
    const response = await fetch(
      `${this.baseUrl}${path}${buildQueryString(options.query)}`,
      {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body:
          options.body !== undefined ? JSON.stringify(options.body) : undefined,
      },
    );

    const text = await response.text();
    const data = text ? this.parseJson(text) : null;

    if (!response.ok) {
      throw new ApiError(
        response.status,
        normalizeErrorMessage(
          data as ApiErrorResponse | undefined,
          response.statusText,
        ),
        data as ApiErrorResponse | undefined,
      );
    }

    return data as T;
  }

  get<T>(path: string, query?: Record<string, QueryValue>) {
    return this.request<T>(path, { query });
  }

  post<T>(path: string, body?: unknown, auth = true) {
    return this.request<T>(path, { method: "POST", body, auth });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "PATCH", body });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }

  private parseJson(text: string) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return undefined;
    }
  }
}

export const apiClient = new ApiClient();
