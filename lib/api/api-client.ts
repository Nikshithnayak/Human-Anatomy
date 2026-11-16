/**
 * Anatomy Atelier — Centralized Type-Safe API Client
 * 
 * Provides unified request handling, error normalization, timeout management,
 * cancellation tokens, and secure diagnostic logging across all domain integrations.
 */

export interface ApiClientConfig {
  baseUrl?: string;
  defaultTimeoutMs?: number;
  getAuthToken?: () => string | null;
}

export class ApiError extends Error {
  public status: number;
  public data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiClient {
  private baseUrl: string;
  private defaultTimeoutMs: number;
  private getAuthToken?: () => string | null;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? "";
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 10000;
    this.getAuthToken = config.getAuthToken;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const fullPath = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    if (!params) return fullPath;

    const url = new URL(fullPath, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) {
        url.searchParams.append(key, String(val));
      }
    });

    return path.startsWith("http") ? url.toString() : `${url.pathname}${url.search}`;
  }

  public async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { timeoutMs = this.defaultTimeoutMs, params, headers: customHeaders, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Merge external signal if passed
    if (fetchOptions.signal) {
      fetchOptions.signal.addEventListener("abort", () => controller.abort());
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(customHeaders as Record<string, string>),
    };

    const token = this.getAuthToken ? this.getAuthToken() : null;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const targetUrl = this.buildUrl(path, params);

    try {
      const response = await fetch(targetUrl, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");
      const data = isJson ? await response.json().catch(() => null) : await response.text();

      if (!response.ok) {
        const errorMsg = (data && typeof data === "object" && "error" in data)
          ? String((data as { error: string }).error)
          : `HTTP error ${response.status} fetching ${path}`;
        throw new ApiError(errorMsg, response.status, data);
      }

      return data as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof ApiError) {
        throw err;
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ApiError(`Request to ${path} timed out after ${timeoutMs}ms`, 408);
      }
      const message = err instanceof Error ? err.message : "Network error occurred";
      throw new ApiError(message, 0, err);
    }
  }

  public get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  public post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}

// Singleton global API client instance
export const apiClient = new ApiClient();

