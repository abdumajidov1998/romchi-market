const BASE = '/api';
const TOKEN_KEY = 'romchi_token';
const USER_KEY = 'romchi_user';

export type User = { id: number; phone: string; role: 'worker' | 'employer' };

// Cache user in localStorage for instant hydration on page reload — otherwise
// auth-dependent pages (JobDetail, *Profile) flash a 1-2s wrong state while
// App.tsx awaits /me. App.tsx still calls /me to verify and refresh.
let cachedUser: User | null = (() => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
  catch { return null; }
})();

const persistUser = (u: User | null) => {
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
};

export const auth = {
  token: () => localStorage.getItem(TOKEN_KEY),
  user: (): User | null => cachedUser,
  setUser: (u: User | null) => { cachedUser = u; persistUser(u); },
  set: (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    cachedUser = user;
    persistUser(user);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    cachedUser = null;
  },
};

// Backend xato kodlarini Uzbekcha matnga xaritalash. Foydalanuvchi inglizcha
// "Missing fields" emas, "Maydonlar to'liq emas" ko'radi.
const ERROR_MESSAGES: Record<string, string> = {
  'Missing fields':       "Majburiy maydonlarni to'ldiring",
  'Invalid phone':        "Telefon raqam noto'g'ri",
  'Invalid token':        "Sessiya tugadi, qaytadan kiring",
  'Token expired':        "Sessiya tugadi, qaytadan kiring",
  'No token':             "Avtorizatsiya talab qilinadi",
  'Forbidden':            "Ruxsat yo'q",
  'Not found':            "Topilmadi",
  'Cannot delete admin':  "Adminni o'chirib bo'lmaydi",
  'Already exists':       "Bunday yozuv allaqachon mavjud",
  'phone already exists': "Bu telefon raqam ro'yxatdan o'tgan",
  'Invalid password':     "Parol noto'g'ri",
  'User not found':       "Foydalanuvchi topilmadi",
  'Code expired':         "Kod muddati tugadi, yangi kod oling",
  'Invalid code':         "Kod noto'g'ri",
  'Too many attempts':    "Juda ko'p urinish, biroz kuting",
  'Unknown type':         "Noma'lum bo'lim",
  'Invalid id':           "Noto'g'ri ID",
};

const localizeError = (msg: string): string => {
  if (!msg) return 'Xatolik';
  if (ERROR_MESSAGES[msg]) return ERROR_MESSAGES[msg];
  // qisman moslik (masalan "Missing fields: name")
  const key = Object.keys(ERROR_MESSAGES).find(k => msg.toLowerCase().startsWith(k.toLowerCase()));
  if (key) return ERROR_MESSAGES[key];
  return msg;
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
  if (!res.ok) {
    // Token muddati tugagan/yaroqsiz — sessiyani tozalab Welcome sahifasiga yo'naltiramiz.
    // /me endpointi uchun yo'naltirmaymiz, chunki uni anonim ham ishlatishi mumkin (App.tsx hydration).
    if (res.status === 401 && t && path !== '/me') {
      auth.clear();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/welcome')) {
        window.location.href = '/welcome';
      }
    }
    throw new Error(localizeError(data?.error || `HTTP ${res.status}`));
  }
  return data as T;
}

export const api = {
  sendCode: (phone: string) =>
    req<{ ok: boolean; message: string; devCode?: string }>('/auth/send-code', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyCode: (body: { phone: string; code: string; password?: string; role?: string }) =>
    req<{ token: string; user: User; isNew: boolean }>('/auth/verify-code', { method: 'POST', body: JSON.stringify(body) }),

  register: (body: { phone: string; password: string; role: 'worker' | 'employer'; name?: string; city?: string; district?: string; specs?: string[]; experience?: string; about?: string; lat?: number; lng?: number; salaryFrom?: number; salaryTo?: number; telegram?: string }) =>
    req<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (phone: string, password: string) =>
    req<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  me: () => req<{ user: User; profile: any; isAdmin?: boolean }>('/me'),

  workers: (params?: { city?: string; spec?: string; q?: string }) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
    const qs = new URLSearchParams(clean as any).toString();
    return req<any[]>('/workers' + (qs ? '?' + qs : ''));
  },
  worker: (id: string | number) => req<any>(`/workers/${id}`),
  saveWorker: (body: { name: string; city: string; district: string; specs: string[]; experience: string; about?: string; lat?: number; lng?: number; salaryFrom?: number; salaryTo?: number; telegram?: string; workType?: string }) =>
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
  saveWasteBuyer: (body: { name: string; city: string; district: string; about?: string; priceTermo?: number; pricePvxOq?: number; pricePvxRangli?: number; priceAlyumin?: number; priceAlikabond?: number; lat?: number; lng?: number; telegram?: string }) =>
    req<any>('/waste-buyers', { method: 'POST', body: JSON.stringify(body) }),

  uslugaProviders: (params?: { city?: string; spec?: string; q?: string }) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
    const qs = new URLSearchParams(clean as any).toString();
    return req<any[]>('/usluga' + (qs ? '?' + qs : ''));
  },
  uslugaProvider: (id: string | number) => req<any>(`/usluga/${id}`),
  saveUsluga: (body: { name: string; city: string; district: string; about?: string; specs: string[]; priceTermo?: number; pricePvx?: number; priceAlyumin?: number; priceSurma?: number; lat?: number; lng?: number; telegram?: string }) =>
    req<any>('/usluga', { method: 'POST', body: JSON.stringify(body) }),

  stanokMasters: (params?: { city?: string; spec?: string; q?: string }) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
    const qs = new URLSearchParams(clean as any).toString();
    return req<any[]>('/stanok' + (qs ? '?' + qs : ''));
  },
  stanokMaster: (id: string | number) => req<any>(`/stanok/${id}`),
  saveStanok: (body: { name: string; city: string; district: string; about?: string; specs: string[]; priceDiagnostika?: number; priceCharxlash?: number; urgent?: boolean; experience?: string; lat?: number; lng?: number; telegram?: string }) =>
    req<any>('/stanok', { method: 'POST', body: JSON.stringify(body) }),
  deleteStanok: () => req<{ ok: boolean }>('/stanok', { method: 'DELETE' }),

  deliveryDrivers: (params?: { city?: string; q?: string; vehicle?: string }) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
    const qs = new URLSearchParams(clean as any).toString();
    return req<any[]>('/delivery' + (qs ? '?' + qs : ''));
  },
  deliveryDriver: (id: string | number) => req<any>(`/delivery/${id}`),
  saveDelivery: (formData: FormData) => {
    // multipart — don't set Content-Type, let browser set boundary
    const t = auth.token();
    return fetch('/api' + '/delivery', {
      method: 'POST',
      headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: formData,
    }).then(async r => {
      const text = await r.text();
      const data = text ? JSON.parse(text) : null;
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      return data;
    });
  },
  deleteDelivery: () => req<{ ok: boolean }>('/delivery', { method: 'DELETE' }),

  stanokAds: (params?: { city?: string; condition?: string; type?: string; q?: string }) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
    const qs = new URLSearchParams(clean as any).toString();
    return req<any[]>('/stanok-ads' + (qs ? '?' + qs : ''));
  },
  stanokAd: (id: string | number) => req<any>(`/stanok-ads/${id}`),
  saveStanokAd: (formData: FormData) => {
    const t = auth.token();
    return fetch('/api/stanok-ads', {
      method: 'POST',
      headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: formData,
    }).then(async r => {
      const text = await r.text();
      const data = text ? JSON.parse(text) : null;
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      return data;
    });
  },
  updateStanokAd: (id: string | number, formData: FormData) => {
    const t = auth.token();
    return fetch(`/api/stanok-ads/${id}`, {
      method: 'PATCH',
      headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: formData,
    }).then(async r => {
      const text = await r.text();
      const data = text ? JSON.parse(text) : null;
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      return data;
    });
  },
  deleteStanokAd: (id: string | number) => req<{ ok: boolean }>(`/stanok-ads/${id}`, { method: 'DELETE' }),
  myStanokAds: () => req<any[]>('/me/stanok-ads'),

  installBrigades: (params?: { city?: string; spec?: string; q?: string }) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
    const qs = new URLSearchParams(clean as any).toString();
    return req<any[]>('/install-brigada' + (qs ? '?' + qs : ''));
  },
  installBrigade: (id: string | number) => req<any>(`/install-brigada/${id}`),
  saveInstallBrigade: (body: { name: string; city: string; district: string; about?: string; specs: string[]; teamSize?: number; experience?: string; priceTermo?: number; pricePvx?: number; priceAlyumin?: number; priceJpFasad?: number; lat?: number; lng?: number; telegram?: string }) =>
    req<any>('/install-brigada', { method: 'POST', body: JSON.stringify(body) }),
  deleteInstallBrigade: () => req<{ ok: boolean }>('/install-brigada', { method: 'DELETE' }),

  arkachilar: (params?: { city?: string; spec?: string; q?: string }) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
    const qs = new URLSearchParams(clean as any).toString();
    return req<any[]>('/arkachilar' + (qs ? '?' + qs : ''));
  },
  arkachi: (id: string | number) => req<any>(`/arkachilar/${id}`),
  saveArkachi: (body: { name: string; city: string; district: string; about?: string; specs: string[]; experience?: string; priceTermo?: number; pricePvx?: number; priceAlyumin?: number; priceJpFasad?: number; lat?: number; lng?: number; telegram?: string }) =>
    req<any>('/arkachilar', { method: 'POST', body: JSON.stringify(body) }),
  deleteArkachi: () => req<{ ok: boolean }>('/arkachilar', { method: 'DELETE' }),

  myProfiles: () => req<{ worker: any; wasteBuyer: any; usluga: any; stanok: any; delivery: any; installBrigada: any; arkachi: any }>('/me/profiles'),
  deleteWorker: () => req<{ ok: boolean }>('/workers', { method: 'DELETE' }),
  deleteWasteBuyer: () => req<{ ok: boolean }>('/waste-buyers', { method: 'DELETE' }),
  deleteUsluga: () => req<{ ok: boolean }>('/usluga', { method: 'DELETE' }),

  postJob: (body: { title: string; company: string; type?: string; workType?: string; city: string; district: string; experience?: string; salaryFrom: number; salaryTo: number; specs: string[]; description?: string; badge?: string; lat?: number; lng?: number }) =>
    req<any>('/jobs', { method: 'POST', body: JSON.stringify(body) }),

  adminStats: () => req<{
    counts: Record<string, number>;
    today: Record<string, number>;
    unverified: Record<string, number>;
    quality: {
      noImage: Record<string, number>;
      noPrice: Record<string, number>;
      shortDesc: Record<string, number>;
    };
    cities: { city: string; count: number }[];
    attention: { moderation: number; noImage: number; noPrice: number; shortDesc: number };
    sms?: { lastHour: number; last24h: number };
  }>('/admin/stats'),
  adminUsers: (params?: { q?: string; limit?: number; offset?: number }) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== ''));
    const qs = new URLSearchParams(clean as any).toString();
    return req<any[]>('/admin/users' + (qs ? '?' + qs : ''));
  },
  adminDeleteUser: (id: number) => req<{ ok: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
  adminListings: (type: string, params?: { limit?: number; offset?: number }) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined));
    const qs = new URLSearchParams(clean as any).toString();
    return req<any[]>(`/admin/listings/${type}` + (qs ? '?' + qs : ''));
  },
  adminDeleteListing: (type: string, id: number) =>
    req<{ ok: boolean }>(`/admin/listings/${type}/${id}`, { method: 'DELETE' }),
  adminVerifyListing: (type: string, id: number, verified: boolean) =>
    req<{ ok: boolean }>(`/admin/listings/${type}/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ verified }) }),
};
