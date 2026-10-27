/**
 * Centralized Typed API Client
 * Provides consistent error extraction, authentication header injection,
 * and standard request lifecycle across all application components.
 */

export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  status: number;
}

export class ApiError extends Error {
  public status: number;
  public details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const adminToken = localStorage.getItem('gw_admin_token');
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
    }

    const sessionToken = localStorage.getItem('gw_session_token');
    if (sessionToken) {
      headers['authorization'] = `Bearer ${sessionToken}`;
    }
  } catch {
    // LocalStorage may be restricted in private browsing
  }

  return headers;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const customHeaders = (options.headers as Record<string, string>) || {};

  const headers = {
    ...getAuthHeaders(),
    ...customHeaders,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle No Content
  if (response.status === 204) {
    return {} as T;
  }

  let body: any;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      (body && typeof body === 'object' && (body.error || body.message)) ||
      (typeof body === 'string' && body) ||
      `HTTP Request Failed with status ${response.status}`;
    throw new ApiError(errorMessage, response.status, body);
  }

  return body as T;
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
