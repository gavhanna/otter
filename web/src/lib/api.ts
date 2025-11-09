const API_BASE = '/api';

type RequestOptions = RequestInit & {
  json?: unknown;
};

async function request<T>(input: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  // Dynamic timeout based on request type
  const timeoutMs = options.body instanceof FormData &&
                   options.method === 'POST' && input.includes('recordings') ? 300000 : 30000; // 5 minutes for audio uploads

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs/1000}s - please try again`)), timeoutMs);
  });

  try {
    const fetchPromise = fetch(`${API_BASE}${input}`, {
      credentials: 'include',
      ...options,
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : options.body
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

    if (!response.ok) {
      const errorBody = await safeJson(response);
      const message = (errorBody as { message?: string })?.message ?? response.statusText;
      throw new Error(message);
    }

    return (await safeJson(response)) as T;
  } catch (error) {
    console.error(`API Error: ${input}`, error);
    throw error;
  }
}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: AuthUser; message: string }>('/auth/login', {
      method: 'POST',
      json: { email, password }
    }),
  logout: () =>
    request<void>('/auth/logout', {
      method: 'POST'
    }),
  me: () =>
    request<{ user: AuthUser }>('/auth/me', {
      method: 'GET'
    }),
  bootstrap: (email: string, password: string, displayName?: string) =>
    request<{ user: AuthUser; message: string }>('/auth/bootstrap', {
      method: 'POST',
      json: { email, password, displayName }
    }),
  listRecordings: () =>
    request<{ recordings: RecordingSummary[] }>('/recordings', {
      method: 'GET'
    }),
  createRecording: (formData: FormData) =>
    request<{ recording: RecordingSummary }>('/recordings', {
      method: 'POST',
      body: formData
    }),
  getRecording: (id: string) =>
    request<{ recording: RecordingSummary }>(`/recordings/${id}`, {
      method: 'GET'
    }),
  updateFavourite: (id: string, isFavourited: boolean) =>
    request<{ recording: RecordingSummary }>(`/recordings/${id}/favourite`, {
      method: 'PATCH',
      json: { isFavourited }
    }),
  updateRecording: (id: string, updates: {
        title?: string;
        description?: string | null;
        location?: string | null;
        locationLatitude?: number | null;
        locationLongitude?: number | null;
        locationSource?: 'manual' | 'geolocation' | null;
    }) =>
    request<{ recording: RecordingSummary }>(`/recordings/${id}`, {
      method: 'PATCH',
      json: updates
    }),
  deleteRecording: (id: string) =>
    request<{ message: string }>(`/recordings/${id}`, {
      method: 'DELETE'
    }),
  getStorageUsage: () =>
    request<{ storage: StorageUsage }>('/storage', {
      method: 'GET'
    }),
  getHealth: () =>
    request<HealthStatus>('/health', {
      method: 'GET'
    })
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'user';
};

export type RecordingSummary = {
  id: string;
  title: string;
  description: string | null;
  durationMs: number;
  recordedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isFavourited: boolean;
  location: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationSource: 'ip' | 'manual' | 'geolocation' | null;
  owner: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
  asset: {
    sizeBytes: number;
    contentType: string;
  } | null;
};

export type StorageUsage = {
  totalBytes: number;
  totalFiles: number;
  formattedSize: string;
  usagePercentage: number;
  limitBytes?: number;
};

export type HealthStatus = {
  status: string;
  version?: string;
};
