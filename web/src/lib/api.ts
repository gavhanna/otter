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
  updateFavorite: (id: string, isFavorited: boolean) =>
    request<{ recording: RecordingSummary }>(`api/recordings/${id}/favorite`, {
      method: 'PATCH',
      json: { isFavorited }
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
  isFavorited: boolean;
  owner: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
};
