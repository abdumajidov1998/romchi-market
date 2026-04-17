const BASE = '/api';
const TOKEN_KEY = 'romchi_token';
const USER_KEY = 'romchi_user';

export type User = { id: number; phone: string; role: 'worker' | 'employer' };

export const auth = {
  token: () => localStorage.getItem(TOKEN_KEY),
  user: (): User | null => {
    const s = localStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  },
  set: (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const t = auth.token();
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  sendCode: (phone: string) =>
    req<{ ok: boolean; message: string }>('/auth/send-code', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyCode: (body: { phone: string; code: string; password?: string; role?: string }) =>
    req<{ token: string; user: User; isNew: boolean }>('/auth/verify-code', { method: 'POST', body: JSON.stringify(body) }),

  register: (body: { phone: string; password: string; role: 'worker' | 'employer'; name?: string; city?: string; district?: string; specs?: string[]; experience?: string; about?: string; lat?: number; lng?: number; salaryFrom?: number; salaryTo?: number; telegram?: string }) =>
    req<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (phone: string, password: string) =>
    req<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  me: () => req<{ user: User; profile: any }>('/me'),

  workers: (params?: { city?: string; spec?: string; q?: string }) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
    const qs = new URLSearchParams(clean as any).toString();
    return req<any[]>('/workers' + (qs ? '?' + qs : ''));
  },
  worker: (id: string | number) => req<any>(`/workers/${id}`),
  saveWorker: (body: { name: string; city: string; district: string; specs: string[]; experience: string; about?: string; lat?: number; lng?: number; salaryFrom?: number; salaryTo?: number; telegram?: string }) =>
    req<any>('/workers', { method: 'POST', body: JSON.stringify(body) }),

  jobs: (params?: { city?: string; spec?: string; q?: string }) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
    const qs = new URLSearchParams(clean as any).toString();
    return req<any[]>('/jobs' + (qs ? '?' + qs : ''));
  },
  job: (id: string | number) => req<any>(`/jobs/${id}`),
  updateJob: (id: string | number, body: any) =>
    req<any>(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteJob: (id: string | number) =>
    req<{ ok: boolean }>(`/jobs/${id}`, { method: 'DELETE' }),
  wasteBuyers: (params?: { city?: string; q?: string }) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
    const qs = new URLSearchParams(clean as any).toString();
    return req<any[]>('/waste-buyers' + (qs ? '?' + qs : ''));
  },
  wasteBuyer: (id: string | number) => req<any>(`/waste-buyers/${id}`),
  saveWasteBuyer: (body: { name: string; city: string; district: string; about?: string; priceTermo?: number; pricePvxOq?: number; pricePvxRangli?: number; priceAlyumin?: number; lat?: number; lng?: number; telegram?: string }) =>
    req<any>('/waste-buyers', { method: 'POST', body: JSON.stringify(body) }),

  uslugaProviders: (params?: { city?: string; spec?: string; q?: string }) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
    const qs = new URLSearchParams(clean as any).toString();
    return req<any[]>('/usluga' + (qs ? '?' + qs : ''));
  },
  uslugaProvider: (id: string | number) => req<any>(`/usluga/${id}`),
  saveUsluga: (body: { name: string; city: string; district: string; about?: string; specs: string[]; priceTermo?: number; pricePvx?: number; priceAlyumin?: number; priceSurma?: number; lat?: number; lng?: number; telegram?: string }) =>
    req<any>('/usluga', { method: 'POST', body: JSON.stringify(body) }),

  myProfiles: () => req<{ worker: any; wasteBuyer: any; usluga: any }>('/me/profiles'),
  deleteWorker: () => req<{ ok: boolean }>('/workers', { method: 'DELETE' }),
  deleteWasteBuyer: () => req<{ ok: boolean }>('/waste-buyers', { method: 'DELETE' }),
  deleteUsluga: () => req<{ ok: boolean }>('/usluga', { method: 'DELETE' }),

  postJob: (body: { title: string; company: string; type?: string; workType?: string; city: string; district: string; experience?: string; salaryFrom: number; salaryTo: number; specs: string[]; description?: string; badge?: string; lat?: number; lng?: number }) =>
    req<any>('/jobs', { method: 'POST', body: JSON.stringify(body) }),
};
