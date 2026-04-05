type QueryValue = string | number | boolean | null | undefined;

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function normalizeBaseUrl(raw?: string) {
  const base = raw?.replace(/\/+$/, "") ?? "http://localhost:3000";
  return base.endsWith("/api") ? base : `${base}/api`;
}

class ApiClient {
  private readonly baseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);

  async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PATCH" | "DELETE";
      query?: Record<string, QueryValue>;
      body?: unknown;
    } = {},
  ): Promise<T> {
    const method = options.method ?? "GET";
    let url = `${this.baseUrl}${path}`;

    if (options.query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(options.query)) {
        if (v != null && v !== "") params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {};
    if (options.body) headers["Content-Type"] = "application/json";

    const res = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "include",
    });

    if (!res.ok) {
      let msg = res.statusText;
      try {
        const json = await res.json();
        msg = Array.isArray(json.message) ? json.message.join(", ") : json.message ?? msg;
      } catch {}
      throw new ApiError(res.status, msg);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : (null as T);
  }

  get<T>(path: string, query?: Record<string, QueryValue>) {
    return this.request<T>(path, { query });
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "POST", body });
  }
  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "PATCH", body });
  }
  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
