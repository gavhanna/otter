const API_BASE = '/';

type RequestOptions = RequestInit & {
  json?: unknown;
};

async function request<T>(input: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${input}`, {
    credentials: 'include',
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body
  });

  if (!response.ok) {
    const errorBody = await safeJson(response);
    const message = (errorBody as { message?: string })?.message ?? response.statusText;
    throw new Error(message);
  }

  return (await safeJson(response)) as T;
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
    request<{ user: AuthUser; message: string }>('api/auth/login', {
      method: 'POST',
      json: { email, password }
    }),
  logout: () =>
    request<void>('api/auth/logout', {
      method: 'POST'
    }),
  me: () =>
    request<{ user: AuthUser }>('api/auth/me', {
      method: 'GET'
    }),
  bootstrap: (email: string, password: string, displayName?: string) =>
    request<{ user: AuthUser; message: string }>('api/auth/bootstrap', {
      method: 'POST',
      json: { email, password, displayName }
    }),
  listRecordings: () =>
    request<{ recordings: RecordingSummary[] }>('api/recordings', {
      method: 'GET'
    }),
  createRecording: (formData: FormData) =>
    request<{ recording: RecordingSummary }>('api/recordings', {
      method: 'POST',
      body: formData
    }),
  getRecording: (id: string) =>
    request<{ recording: RecordingSummary }>(`api/recordings/${id}`, {
      method: 'GET'
    }),
  updateFavourite: (id: string, isFavourited: boolean) =>
    request<{ recording: RecordingSummary }>(`api/recordings/${id}/favourite`, {
      method: 'PATCH',
      json: { isFavourited }
    }),
  updateRecording: (id: string, updates: { title?: string; description?: string | null }) =>
    request<{ recording: RecordingSummary }>(`api/recordings/${id}`, {
      method: 'PATCH',
      json: updates
    }),
  deleteRecording: (id: string) =>
    request<{ message: string }>(`api/recordings/${id}`, {
      method: 'DELETE'
    }),
  getStorageUsage: () =>
    request<{ storage: StorageUsage }>('api/storage', {
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
