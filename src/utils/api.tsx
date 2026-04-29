import loadConfig from "@utils/config";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { auth } from "@/utils/auth";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { useErrorBoundary } from "@/contexts/ErrorBoundary";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ErrorResponse = {
  code: number;
  message: string;
};

const config = loadConfig();

type RequestOptions = {
  key?: string;
  signal?: AbortSignal;
  origin?: string;
  globalParams?: Params;
  ignoreGlobalParams?: boolean;
  refreshInterval?: number;
  blob?: boolean;
  shouldRetryOnError?: boolean;
};

export type Params = Record<string, string | number | boolean>;

async function apiRequest<T>(
  method: Method,
  url: string,
  data?: any,
  options?: RequestOptions,
): Promise<T> {
  const origin = options?.origin ?? config.apiOrigin + "/api";
  const token = auth.getToken();

  const newUrl = mergeUrlParams(
    url,
    options?.ignoreGlobalParams ? undefined : options?.globalParams,
  );

  const res = await fetch(`${origin}${newUrl}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { "X-User-Token": token } : {}),
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
    signal: options?.signal,
  });

  if (!res.ok) {
    let error: ErrorResponse;
    try {
      const body = await res.json();
      error = { code: res.status, message: body.message || body.error || res.statusText };
    } catch {
      error = { code: res.status, message: res.statusText };
    }
    return Promise.reject(error);
  }

  if (options?.blob) return (await res.blob()) as T;

  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export function useAtlaFetch(ignoreError = false) {
  const handleErrors = useApiErrorHandling(ignoreError);

  const fetcher = async (method: Method, url: string, data?: any, options?: RequestOptions) => {
    return apiRequest<any>(method, url, data, options).catch((err) =>
      handleErrors(err as ErrorResponse),
    );
  };

  return { fetcher };
}

export default function useFetchApi<T>(
  url: string,
  ignoreError = false,
  revalidate = true,
  allowFetch = true,
  options?: RequestOptions,
) {
  const handleErrors = useApiErrorHandling(ignoreError);
  const { globalApiParams } = useApplicationContext();

  const cacheKey = options?.key ? [url, options.key] : url;

  const fetchFn = options?.key
    ? async ([u]: [string]) => {
        if (!allowFetch) return;
        return apiRequest<T>("GET", u, undefined, {
          ...options,
          globalParams: globalApiParams,
        }).catch((err) => handleErrors(err as ErrorResponse));
      }
    : async (u: string) => {
        if (!allowFetch) return;
        return apiRequest<T>("GET", u, undefined, {
          ...options,
          globalParams: globalApiParams,
        }).catch((err) => handleErrors(err as ErrorResponse));
      };

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    allowFetch ? cacheKey : null,
    fetchFn,
    {
      keepPreviousData: true,
      revalidateOnFocus: revalidate,
      revalidateIfStale: revalidate,
      revalidateOnReconnect: revalidate,
      // Never retry client errors (4xx) — they won't succeed on retry.
      // Only retry server errors (5xx) if the caller explicitly opts in.
      shouldRetryOnError: options?.shouldRetryOnError ?? false,
      onErrorRetry: (err: ErrorResponse, _key, _cfg, revalidate, { retryCount }) => {
        // Abort immediately on any 4xx — no point retrying
        if (err?.code >= 400 && err?.code < 500) return;
        // Cap server error retries at 3 attempts with exponential backoff
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), Math.min(1000 * 2 ** retryCount, 30000));
      },
      refreshInterval: options?.refreshInterval,
    },
  );

  return { data: data as T | undefined, error, isLoading, isValidating, mutate } as const;
}

export function useApiCall<T>(
  url: string,
  ignoreError = false,
  requestOptions?: RequestOptions,
) {
  const handleErrors = useApiErrorHandling(ignoreError);
  const { globalApiParams } = useApplicationContext();

  const wrap = (promise: Promise<T>) =>
    promise
      .then((res) => Promise.resolve(res as T))
      .catch((err) => handleErrors(err as ErrorResponse)) as Promise<T>;

  return {
    post: (data: any, suffix = "", options?: RequestOptions) =>
      wrap(apiRequest<T>("POST", url + suffix, data, { ...(options ?? requestOptions), globalParams: globalApiParams })),

    put: (data: any, suffix = "", options?: RequestOptions) =>
      wrap(apiRequest<T>("PUT", url + suffix, data, { ...(options ?? requestOptions), globalParams: globalApiParams })),

    patch: (data: any, suffix = "", options?: RequestOptions) =>
      wrap(apiRequest<T>("PATCH", url + suffix, data, { ...(options ?? requestOptions), globalParams: globalApiParams })),

    del: (data?: any, suffix = "", options?: RequestOptions) =>
      wrap(apiRequest<T>("DELETE", url + suffix, data, { ...(options ?? requestOptions), globalParams: globalApiParams })),

    get: (suffix = "", options?: RequestOptions) =>
      wrap(apiRequest<T>("GET", url + suffix, undefined, { ...(options ?? requestOptions), globalParams: globalApiParams })),
  };
}

export function useApiErrorHandling(ignoreError = false) {
  const router = useRouter();
  const currentPath = usePathname();
  const { setError } = useErrorBoundary();

  if (ignoreError) {
    return (err: ErrorResponse) => {
      console.warn("[api]", err);
      return Promise.reject(err);
    };
  }

  return (err: ErrorResponse) => {
    if (err.code === 401) {
      auth.clearToken();
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return Promise.reject(err);
    }

    if (err.code === 403) {
      const msg = err.message?.toLowerCase() ?? "";
      if (msg.includes("blocked") || msg.includes("pending")) {
        const params = new URLSearchParams({
          code: err.code.toString(),
          message: encodeURIComponent(err.message),
          type: "user-status",
        });
        window.location.href = `/error?${params.toString()}`;
        return Promise.reject(err);
      }
    }

    if (err.code === 500 || (err.code > 400 && err.code <= 500)) {
      setError(err);
    }

    return Promise.reject(err);
  };
}

function mergeUrlParams(url: string, params?: Params): string {
  try {
    const [basePath, existingQuery] = url.split("?");
    const searchParams = new URLSearchParams(existingQuery || "");

    if (params && typeof params === "object") {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });
    }

    const queryString = searchParams.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  } catch {
    return url;
  }
}
