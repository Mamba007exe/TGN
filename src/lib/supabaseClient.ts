import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Profile, NgoAccount, BenefactorAccount, Organization, Post, Donation, Notice } from '../types';

// Helper to sanitize Supabase URL (strips /rest/v1 or trailing slashes)
export function cleanSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  return rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

// Retrieve backend Supabase connection credentials
export const getSupabaseConfig = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  const localUrl = localStorage.getItem('goodwill_supabase_url') || '';
  const localKey = localStorage.getItem('goodwill_supabase_key') || '';

  const rawUrl = envUrl || localUrl;
  const url = cleanSupabaseUrl(rawUrl);
  const key = (envKey || localKey).trim();

  return { url, key, isConfigured: Boolean(url && key) };
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (e) {
      console.warn('Backend Supabase initialization failed:', e);
      return null;
    }
  }
  return supabaseInstance;
};

// Safe helper for fire-and-forget Supabase PromiseLike requests
const asyncPush = (promiseLike: any) => {
  Promise.resolve(promiseLike).catch(() => {});
};

// Safari / Mobile WebKit Cookie Storage Helpers (bypasses ITP localStorage partition resets)
export function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax; Secure`;
  } catch (e) {
    // Ignore cookie write errors in restricted contexts
  }
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  } catch (e) {
    return null;
  }
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure`;
  } catch (e) {
    // Ignore
  }
}

// Admin Token Management
export const getAdminToken = (): string | null => {
  return localStorage.getItem('gw_admin_token') || getCookie('gw_admin_token');
};

export const setAdminToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('gw_admin_token', token);
    setCookie('gw_admin_token', token, 365);
  } else {
    localStorage.removeItem('gw_admin_token');
    deleteCookie('gw_admin_token');
  }
};

const getAuthHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const adminToken = getAdminToken();
  if (adminToken) {
    headers['x-admin-token'] = adminToken;
    headers['Authorization'] = `Bearer ${adminToken}`;
  }
  const sessionToken = localStorage.getItem('gw_session_token') || getCookie('gw_token');
  if (sessionToken && !adminToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  return headers;
};

// Safe helpers for full-stack backend API routes
const apiPost = (endpoint: string, body: any) => {
  fetch(endpoint, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  }).catch(() => {});
};

const apiPatch = (endpoint: string, body: any) => {
  fetch(endpoint, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  }).catch(() => {});
};

const apiDelete = (endpoint: string) => {
  fetch(endpoint, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  }).catch(() => {});
};

export const setSupabaseConfig = (url: string, key: string) => {
  const cleanUrl = cleanSupabaseUrl(url);
  const cleanKey = key.trim();
  localStorage.setItem('goodwill_supabase_url', cleanUrl);
  localStorage.setItem('goodwill_supabase_key', cleanKey);
  try {
    supabaseInstance = createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.error('Error creating Supabase client:', err);
  }
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('goodwill_supabase_url');
  localStorage.removeItem('goodwill_supabase_key');
  supabaseInstance = null;
};

// Master Admin system account
const MASTER_ADMIN: Profile = {
  id: 'p-admin-master',
  role: 'admin',
  name: 'Governance Administrator',
  phone: '+8801700000000',
  address: 'Dhaka, Bangladesh',
  bkash_no: null,
  nagad_no: null,
  status: 'approved',
  created_at: '2026-01-01T00:00:00Z',
};

// Completely empty production baseline: no mock NGOs, no mock organizations, no mock posts, no mock donations
const INITIAL_PROFILES: Profile[] = [MASTER_ADMIN];
const INITIAL_ORGS: Organization[] = [];
const INITIAL_POSTS: Post[] = [];
const INITIAL_DONATIONS: Donation[] = [];
const INITIAL_NOTICES: Notice[] = [
  {
    id: 'not-platform-init',
    title: 'Welcome to The Goodwill Network: Operational Registry Open',
    content: 'The platform is initialized for live deployment. Non-profit organizations may submit their registration for verified listing. Registered NGOs receive 3 exemption donations before the standard bi-weekly maintenance fee cycle (৳250/14 days). Benefactors who log 5 or more verified contributions are automatically granted the Prominent Benefactor badge.',
    created_at: new Date().toISOString(),
  },
];

// Backend data store integrating Supabase client and local synchronization
class GoodwillDataStore {
  private ngoAccounts: NgoAccount[] = [];
  private benefactorAccounts: BenefactorAccount[] = [];
  private profiles: Profile[] = [];
  private organizations: Organization[] = [];
  private posts: Post[] = [];
  private donations: Donation[] = [];
  private notices: Notice[] = [];
  private listeners: Set<() => void> = new Set();
  public currentUser: Profile | null = null;

  constructor() {
    this.cleanLegacyStorage();
    this.loadFromStorage();
    this.syncWithBackend();
    this.initSession();
    this.connectRealtimeSSE();
    this.connectSupabaseRealtime();

    // Active cross-browser live sync: Poll backend and Supabase every 3 seconds
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.syncWithBackend();
      }, 3000);
    }
  }

  // Cross-device session restore on startup or page load (Safari & WebKit resilient)
  public async initSession() {
    if (typeof window === 'undefined') return;
    try {
      let token = localStorage.getItem('gw_session_token') || getCookie('gw_token');
      if (!token) {
        // Fallback: restore stored user from cookie or localStorage
        const storedUser = localStorage.getItem('gw_current_user') || getCookie('gw_user_backup');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed && parsed.id) {
              this.currentUser = parsed;
              this.notify();
            }
          } catch (e) {}
        }
        return;
      }

      // Mirror token between localStorage and cookie for Safari persistence
      if (!localStorage.getItem('gw_session_token') && token) {
        localStorage.setItem('gw_session_token', token);
      }
      setCookie('gw_token', token, 365);

      const res = await fetch(`/api/auth/me?token=${encodeURIComponent(token)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          this.currentUser = data.user;
          localStorage.setItem('gw_current_user', JSON.stringify(data.user));
          setCookie('gw_user_backup', JSON.stringify(data.user), 365);
          if (data.token) {
            localStorage.setItem('gw_session_token', data.token);
            setCookie('gw_token', data.token, 365);
          }
          if (data.user.role === 'ngo') {
            const idx = this.ngoAccounts.findIndex((a) => a.id === data.user.id);
            if (idx !== -1) this.ngoAccounts[idx] = data.user;
            else this.ngoAccounts.unshift(data.user);
          } else if (data.user.role === 'benefactor') {
            const idx = this.benefactorAccounts.findIndex((a) => a.id === data.user.id);
            if (idx !== -1) this.benefactorAccounts[idx] = data.user;
            else this.benefactorAccounts.unshift(data.user);
          }
          this.rebuildProfiles();
          this.saveToStorage();
          this.notify();
        }
      } else if (res.status === 401) {
        // Only clear if the server explicitly confirmed the token was expired or invalid
        const errData = await res.json().catch(() => ({}));
        if (errData?.error?.includes('invalid') || errData?.error?.includes('expired')) {
          localStorage.removeItem('gw_session_token');
          localStorage.removeItem('gw_current_user');
          deleteCookie('gw_token');
          deleteCookie('gw_user_backup');
          if (this.currentUser && this.currentUser.role !== 'admin') {
            this.currentUser = null;
            this.saveToStorage();
            this.notify();
          }
        }
      }
    } catch {
      // Offline / network failure: preserve currentUser! Never log user out on network drops!
    }
  }

  // Real-time Server-Sent Events (SSE) listener for multi-device live sync
  private connectRealtimeSSE() {
    if (typeof window === 'undefined' || !window.EventSource) return;
    try {
      const es = new EventSource('/api/events');

      es.addEventListener('db_change', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          this.handleRealtimeEvent(payload);
          // Always perform full sync to guarantee consistency across all tables
          this.syncWithBackend();
        } catch (err) {
          console.warn('Realtime event parse warning', err);
        }
      });

      es.onerror = () => {
        // EventSource will auto-reconnect automatically in modern browsers
      };
    } catch (err) {
      console.warn('Realtime connection warning', err);
    }
  }

  // Direct Supabase Realtime channel subscription for instant cross-browser updates
  private connectSupabaseRealtime() {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      supabase
        .channel('client_global_sync')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          this.syncWithBackend();
        })
        .subscribe();
    } catch (err) {
      console.warn('Supabase client realtime warning', err);
    }
  }

  private handleRealtimeEvent(payload: { entity: string; action: string; id: string; data?: any; updates?: any }) {
    const { entity, action, id, data, updates } = payload;

    if (action === 'delete') {
      if (entity === 'ngo_accounts') {
        this.ngoAccounts = this.ngoAccounts.filter((a) => a.id !== id);
        this.organizations = this.organizations.filter((o) => o.ngo_id !== id);
        this.posts = this.posts.filter((p) => p.ngo_id !== id);
        this.donations = this.donations.filter((d) => d.ngo_id !== id && d.donor_id !== id);
      } else if (entity === 'benefactor_accounts') {
        this.benefactorAccounts = this.benefactorAccounts.filter((a) => a.id !== id);
        this.donations = this.donations.filter((d) => d.donor_id !== id);
      } else if (entity === 'profiles') {
        this.ngoAccounts = this.ngoAccounts.filter((a) => a.id !== id);
        this.benefactorAccounts = this.benefactorAccounts.filter((a) => a.id !== id);
        this.organizations = this.organizations.filter((o) => o.ngo_id !== id);
        this.posts = this.posts.filter((p) => p.ngo_id !== id);
      } else if (entity === 'posts') {
        this.posts = this.posts.filter((p) => p.id !== id);
      } else if (entity === 'notices') {
        this.notices = this.notices.filter((n) => n.id !== id);
      }

      // If this client was logged in as the deleted account, automatically log out
      if (this.currentUser && this.currentUser.id === id) {
        this.currentUser = null;
        localStorage.removeItem('gw_session_token');
        localStorage.removeItem('gw_current_user');
      }
    } else if (action === 'create' && data) {
      if (entity === 'ngo_accounts') {
        const idx = this.ngoAccounts.findIndex((a) => a.id === id);
        if (idx !== -1) this.ngoAccounts[idx] = data;
        else this.ngoAccounts.unshift(data);
      } else if (entity === 'benefactor_accounts') {
        const idx = this.benefactorAccounts.findIndex((a) => a.id === id);
        if (idx !== -1) this.benefactorAccounts[idx] = data;
        else this.benefactorAccounts.unshift(data);
      } else if (entity === 'organizations') {
        const idx = this.organizations.findIndex((o) => o.id === id || o.ngo_id === data.ngo_id);
        if (idx !== -1) this.organizations[idx] = data;
        else this.organizations.unshift(data);
      } else if (entity === 'posts') {
        if (!this.posts.some((p) => p.id === id)) {
          this.posts.unshift(data);
        }
      } else if (entity === 'donations') {
        if (!this.donations.some((d) => d.id === id)) {
          this.donations.unshift(data);
        }
      } else if (entity === 'notices') {
        if (!this.notices.some((n) => n.id === id)) {
          this.notices.unshift(data);
        }
      }
    } else if (action === 'update' && updates) {
      if (entity === 'ngo_accounts') {
        const idx = this.ngoAccounts.findIndex((a) => a.id === id);
        if (idx !== -1) this.ngoAccounts[idx] = { ...this.ngoAccounts[idx], ...updates };
      } else if (entity === 'benefactor_accounts') {
        const idx = this.benefactorAccounts.findIndex((a) => a.id === id);
        if (idx !== -1) this.benefactorAccounts[idx] = { ...this.benefactorAccounts[idx], ...updates };
      } else if (entity === 'organizations') {
        const idx = this.organizations.findIndex((o) => o.id === id || o.ngo_id === id);
        if (idx !== -1) this.organizations[idx] = { ...this.organizations[idx], ...updates };
      }
      if (this.currentUser && this.currentUser.id === id) {
        this.currentUser = { ...this.currentUser, ...updates };
      }
    }

    this.rebuildProfiles();
    this.saveToStorage();
    this.notify();
  }

  // Wipe previous placeholder mock data from browser localStorage to ensure empty real-world state
  private cleanLegacyStorage() {
    try {
      const version = localStorage.getItem('gw_clean_v12');
      if (!version) {
        localStorage.removeItem('gw_profiles');
        localStorage.removeItem('gw_ngo_accounts');
        localStorage.removeItem('gw_benefactor_accounts');
        localStorage.removeItem('gw_orgs');
        localStorage.removeItem('gw_posts');
        localStorage.removeItem('gw_donations');
        localStorage.removeItem('gw_notices');
        // Clear any non-admin logged in user to strictly maintain only admin governance
        const storedUser = localStorage.getItem('gw_current_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed.role !== 'admin') {
              localStorage.removeItem('gw_current_user');
              localStorage.removeItem('gw_session_token');
              deleteCookie('gw_token');
              deleteCookie('gw_user_backup');
            }
          } catch (e) {
            localStorage.removeItem('gw_current_user');
          }
        }
        localStorage.setItem('gw_clean_v12', 'active');
      }
    } catch (e) {
      // Ignore
    }
  }

  private rebuildProfiles() {
    this.profiles = [
      MASTER_ADMIN,
      ...this.ngoAccounts,
      ...this.benefactorAccounts,
    ];
  }

  private loadFromStorage() {
    try {
      const storedNgos = localStorage.getItem('gw_ngo_accounts');
      const storedBenefactors = localStorage.getItem('gw_benefactor_accounts');
      const storedProfiles = localStorage.getItem('gw_profiles');
      const storedOrgs = localStorage.getItem('gw_orgs');
      const storedPosts = localStorage.getItem('gw_posts');
      const storedDonations = localStorage.getItem('gw_donations');
      const storedNotices = localStorage.getItem('gw_notices');
      const storedUser = localStorage.getItem('gw_current_user') || getCookie('gw_user_backup');

      this.ngoAccounts = storedNgos ? JSON.parse(storedNgos) : [];
      this.benefactorAccounts = storedBenefactors ? JSON.parse(storedBenefactors) : [];

      // Migration from legacy profiles if separate accounts not yet initialized
      if (this.ngoAccounts.length === 0 && this.benefactorAccounts.length === 0 && storedProfiles) {
        try {
          const legacyProfiles: any[] = JSON.parse(storedProfiles);
          legacyProfiles.forEach((p) => {
            if (p.role === 'ngo') {
              this.ngoAccounts.push({
                id: p.id,
                role: 'ngo',
                name: p.name,
                picture: p.picture || 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=400&q=80',
                director_name: p.director_name || 'Executive Director',
                phone: p.phone,
                address: p.address || 'Dhaka, Bangladesh',
                bkash_no: p.bkash_no || null,
                nagad_no: p.nagad_no || null,
                password: p.password || 'password123',
                status: p.status || 'pending',
                created_at: p.created_at || new Date().toISOString(),
              });
            } else if (p.role === 'benefactor') {
              this.benefactorAccounts.push({
                id: p.id,
                role: 'benefactor',
                name: p.name,
                phone: p.phone,
                picture: p.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name)}`,
                bkash_no: p.bkash_no || null,
                nagad_no: p.nagad_no || null,
                password: p.password || 'password123',
                status: p.status || 'approved',
                created_at: p.created_at || new Date().toISOString(),
              });
            }
          });
        } catch (e) {
          // Ignore
        }
      }

      this.rebuildProfiles();
      const rawOrgs = storedOrgs ? JSON.parse(storedOrgs) : INITIAL_ORGS;
      this.organizations = (Array.isArray(rawOrgs) ? rawOrgs : INITIAL_ORGS).map((org: any) => ({
        ...org,
        total_raised: Number(org.total_raised || 0),
        donation_count: Number(org.donation_count || 0),
      }));
      this.posts = storedPosts ? JSON.parse(storedPosts) : INITIAL_POSTS;
      this.donations = storedDonations ? JSON.parse(storedDonations) : INITIAL_DONATIONS;
      this.notices = storedNotices ? JSON.parse(storedNotices) : INITIAL_NOTICES;
      this.currentUser = storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      this.ngoAccounts = [];
      this.benefactorAccounts = [];
      this.rebuildProfiles();
      this.organizations = [...INITIAL_ORGS];
      this.posts = [...INITIAL_POSTS];
      this.donations = [...INITIAL_DONATIONS];
      this.notices = [...INITIAL_NOTICES];
      this.currentUser = null;
    }
  }

  // Asynchronous Supabase backend sync
  public async syncWithBackend() {
    // 1. First attempt sync via full-stack Express backend API routes
    try {
      const [ngoRes, benRes, pRes, oRes, postRes, dRes, nRes] = await Promise.all([
        fetch('/api/ngo-accounts').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/benefactor-accounts').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/profiles').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/organizations').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/posts').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/donations').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/notices').then((r) => (r.ok ? r.json() : null)),
      ]);

      let updated = false;
      if (Array.isArray(ngoRes)) {
        this.ngoAccounts = ngoRes as NgoAccount[];
        updated = true;
      }
      if (Array.isArray(benRes)) {
        this.benefactorAccounts = benRes as BenefactorAccount[];
        updated = true;
      }
      if (Array.isArray(pRes)) {
        const masterAdmin = this.profiles.find((p) => p.role === 'admin') || MASTER_ADMIN;
        const nonAdmin = (pRes as Profile[]).filter((p) => p.role !== 'admin');
        this.profiles = [masterAdmin, ...nonAdmin];
        updated = true;
      } else {
        this.rebuildProfiles();
      }
      if (Array.isArray(oRes)) {
        this.organizations = (oRes as Organization[]).map((org) => ({
          ...org,
          total_raised: Number(org.total_raised || 0),
          donation_count: Number(org.donation_count || 0),
        }));
        updated = true;
      }
      if (Array.isArray(postRes)) {
        this.posts = postRes as Post[];
        updated = true;
      }
      if (Array.isArray(dRes)) {
        this.donations = dRes as Donation[];
        updated = true;
      }
      if (Array.isArray(nRes)) {
        this.notices = nRes as Notice[];
        updated = true;
      }

      if (updated) {
        this.saveToStorage();
        this.notify();
        return;
      }
    } catch (err) {
      // Local or offline fallback
    }

    // 2. Direct Supabase Client fallback
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const [ngoRes, benRes, oRes, postRes, dRes, nRes] = await Promise.all([
        supabase.from('ngo_accounts').select('*'),
        supabase.from('benefactor_accounts').select('*'),
        supabase.from('organizations').select('*'),
        supabase.from('posts').select('*').order('created_at', { ascending: false }),
        supabase.from('donations').select('*').order('created_at', { ascending: false }),
        supabase.from('notices').select('*').order('created_at', { ascending: false }),
      ]);

      let updated = false;
      if (Array.isArray(ngoRes.data)) {
        this.ngoAccounts = ngoRes.data.map((n: any) => ({ ...n, role: 'ngo' }));
        updated = true;
      }
      if (Array.isArray(benRes.data)) {
        this.benefactorAccounts = benRes.data.map((b: any) => ({ ...b, role: 'benefactor' }));
        updated = true;
      }
      if (updated) {
        this.rebuildProfiles();
      }
      if (Array.isArray(oRes.data)) {
        this.organizations = oRes.data.map((org: any) => {
          const match = this.ngoAccounts.find((n) => n.id === org.ngo_id || org.id === n.id);
          return {
            ...org,
            ngo_id: match ? match.id : org.ngo_id,
            total_raised: Number(org.total_raised || 0),
            donation_count: Number(org.donation_count || 0),
          };
        });
        updated = true;
      }
      if (Array.isArray(postRes.data)) {
        this.posts = postRes.data.map((post: any) => {
          const match = this.ngoAccounts.find((n) => n.id === post.ngo_id);
          return match ? { ...post, ngo_id: match.id } : post;
        });
        updated = true;
      }
      if (Array.isArray(dRes.data)) {
        this.donations = dRes.data as Donation[];
        updated = true;
      }
      if (Array.isArray(nRes.data)) {
        this.notices = nRes.data as Notice[];
        updated = true;
      }

      if (updated) {
        this.saveToStorage();
        this.notify();
      }
    } catch (err) {
      console.warn('Backend synchronization idle or offline', err);
    }
  }

  // Trigger server-level bidirectional Supabase sync
  public async syncAllWithSupabase(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/supabase/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      await this.syncWithBackend();
      return { success: res.ok, message: data.message || data.error || 'Synced' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Sync request failed.' };
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('gw_ngo_accounts', JSON.stringify(this.ngoAccounts));
      localStorage.setItem('gw_benefactor_accounts', JSON.stringify(this.benefactorAccounts));
      localStorage.setItem('gw_profiles', JSON.stringify(this.profiles));
      localStorage.setItem('gw_orgs', JSON.stringify(this.organizations));
      localStorage.setItem('gw_posts', JSON.stringify(this.posts));
      localStorage.setItem('gw_donations', JSON.stringify(this.donations));
      localStorage.setItem('gw_notices', JSON.stringify(this.notices));
      if (this.currentUser) {
        localStorage.setItem('gw_current_user', JSON.stringify(this.currentUser));
        setCookie('gw_user_backup', JSON.stringify(this.currentUser), 365);
      } else {
        localStorage.removeItem('gw_current_user');
        deleteCookie('gw_user_backup');
      }
    } catch (e) {
      console.error('Storage write error', e);
    }
    this.notify();
  }

  public subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public setCurrentUser(user: Profile | null) {
    this.currentUser = user;
    this.saveToStorage();
  }

  public getProfiles(): Profile[] {
    return [...this.profiles];
  }

  public getNgoAccounts(): NgoAccount[] {
    return [...this.ngoAccounts];
  }

  public getBenefactorAccounts(): BenefactorAccount[] {
    return [...this.benefactorAccounts];
  }

  public getOrganizations(): Organization[] {
    return [...this.organizations];
  }

  public getPosts(): Post[] {
    return [...this.posts];
  }

  public getDonations(): Donation[] {
    return [...this.donations];
  }

  public getNotices(): Notice[] {
    return [...this.notices];
  }

  public resetToDefaults() {
    this.ngoAccounts = [];
    this.benefactorAccounts = [];
    this.rebuildProfiles();
    this.organizations = [...INITIAL_ORGS];
    this.posts = [...INITIAL_POSTS];
    this.donations = [...INITIAL_DONATIONS];
    this.notices = [...INITIAL_NOTICES];
    this.currentUser = null;
    this.saveToStorage();
  }

  // --- MUTATION ACTIONS (SYNCED TO SEPARATE SUPABASE TABLES & SERVER API) ---

  // NGO Sign Up: Name, picture, director name, phone number, address, bkash or Nagad (either 1 mandatory), password
  public async signUpNgo(data: {
    name: string;
    picture: string;
    director_name: string;
    phone: string;
    address: string;
    bkash_no?: string;
    nagad_no?: string;
    password: string;
  }): Promise<NgoAccount> {
    const id = `ngo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newNgo: NgoAccount = {
      id,
      role: 'ngo',
      name: data.name.trim(),
      picture: data.picture.trim(),
      director_name: data.director_name.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      bkash_no: data.bkash_no?.trim() || null,
      nagad_no: data.nagad_no?.trim() || null,
      password: data.password,
      status: 'approved',
      created_at: new Date().toISOString(),
    };

    // 1. Post to server database endpoint
    const res = await fetch('/api/ngo-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNgo),
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || 'Failed to register NGO account.');
    }

    if (resData.token) {
      localStorage.setItem('gw_session_token', resData.token);
      setCookie('gw_token', resData.token, 365);
    }

    const savedNgo = { ...newNgo, ...(resData.id ? resData : {}) };

    const existingIdx = this.ngoAccounts.findIndex((a) => a.id === savedNgo.id);
    if (existingIdx !== -1) {
      this.ngoAccounts[existingIdx] = savedNgo;
    } else {
      this.ngoAccounts.unshift(savedNgo);
    }

    this.rebuildProfiles();
    this.currentUser = savedNgo;

    // Automatically create corresponding organization entry for verified listing registry
    const newOrg: Organization = {
      id: `org-${savedNgo.id}`,
      ngo_id: savedNgo.id,
      name: savedNgo.name,
      date_created: new Date().toISOString().split('T')[0],
      director_name: savedNgo.director_name,
      address: savedNgo.address,
      logo_url: savedNgo.picture,
      bkash_no: savedNgo.bkash_no || '',
      nagad_no: savedNgo.nagad_no || '',
      total_raised: 0,
      donation_count: 0,
      fee_status: 'exempt',
      next_fee_due_date: null,
      created_at: new Date().toISOString(),
    };
    if (!this.organizations.some((o) => o.ngo_id === savedNgo.id)) {
      this.organizations.unshift(newOrg);
    }

    this.saveToStorage();

    const supabase = getSupabase();
    if (supabase) {
      const cleanNgo = {
        id: String(savedNgo.id),
        name: String(savedNgo.name || 'Unnamed NGO'),
        picture: String(savedNgo.picture || 'https://images.unsplash.com/photo-1542810634-71277d95dcbb'),
        director_name: String(savedNgo.director_name || 'Executive Director'),
        phone: String(savedNgo.phone || ''),
        address: String(savedNgo.address || 'Dhaka, Bangladesh'),
        bkash_no: savedNgo.bkash_no || null,
        nagad_no: savedNgo.nagad_no || null,
        password: String(savedNgo.password || 'password123'),
        status: savedNgo.status || 'approved',
        created_at: savedNgo.created_at || new Date().toISOString(),
      };
      asyncPush(supabase.from('ngo_accounts').upsert([cleanNgo]));
    }

    return savedNgo;
  }

  // Benefactor Sign Up: Name, Phone Number, picture, Bkash or Nagad (either 1 mandatory), password
  public async signUpBenefactor(data: {
    name: string;
    phone: string;
    picture: string;
    bkash_no?: string;
    nagad_no?: string;
    password: string;
  }): Promise<BenefactorAccount> {
    const id = `ben-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newBenefactor: BenefactorAccount = {
      id,
      role: 'benefactor',
      name: data.name.trim(),
      phone: data.phone.trim(),
      picture: data.picture.trim(),
      bkash_no: data.bkash_no?.trim() || null,
      nagad_no: data.nagad_no?.trim() || null,
      password: data.password,
      status: 'approved',
      created_at: new Date().toISOString(),
    };

    const res = await fetch('/api/benefactor-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBenefactor),
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || 'Failed to register Benefactor account.');
    }

    if (resData.token) {
      localStorage.setItem('gw_session_token', resData.token);
      setCookie('gw_token', resData.token, 365);
    }

    const savedBen = { ...newBenefactor, ...(resData.id ? resData : {}) };

    const existingIdx = this.benefactorAccounts.findIndex((a) => a.id === savedBen.id);
    if (existingIdx !== -1) {
      this.benefactorAccounts[existingIdx] = savedBen;
    } else {
      this.benefactorAccounts.unshift(savedBen);
    }

    this.rebuildProfiles();
    this.currentUser = savedBen;
    this.saveToStorage();

    const supabase = getSupabase();
    if (supabase) {
      const cleanBen = {
        id: String(savedBen.id),
        name: String(savedBen.name || 'Anonymous Benefactor'),
        phone: String(savedBen.phone || ''),
        picture: String(savedBen.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'),
        bkash_no: savedBen.bkash_no || null,
        nagad_no: savedBen.nagad_no || null,
        password: String(savedBen.password || 'password123'),
        status: savedBen.status || 'approved',
        created_at: savedBen.created_at || new Date().toISOString(),
      };
      asyncPush(supabase.from('benefactor_accounts').upsert([cleanBen]));
    }

    return savedBen;
  }

  // Unified or Role-based Account Login: Name, Phone number, Password
  public async loginAccount(
    role: 'ngo' | 'benefactor',
    credentials: { name: string; phone: string; password: string }
  ): Promise<Profile> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          name: credentials.name.trim(),
          phone: credentials.phone.trim(),
          password: credentials.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication denied. Please verify your credentials.');
      }

      if (data.token) {
        localStorage.setItem('gw_session_token', data.token);
        setCookie('gw_token', data.token, 365);
      }

      const user = data.user;
      this.currentUser = user;
      localStorage.setItem('gw_current_user', JSON.stringify(user));
      setCookie('gw_user_backup', JSON.stringify(user), 365);

      if (role === 'ngo') {
        const idx = this.ngoAccounts.findIndex((a) => a.id === user.id);
        if (idx !== -1) this.ngoAccounts[idx] = user;
        else this.ngoAccounts.unshift(user);
      } else {
        const idx = this.benefactorAccounts.findIndex((a) => a.id === user.id);
        if (idx !== -1) this.benefactorAccounts[idx] = user;
        else this.benefactorAccounts.unshift(user);
      }

      this.rebuildProfiles();
      this.saveToStorage();
      return user;
    } catch (err: any) {
      // If server unreachable, attempt local fallback with explicit validation
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }

      const cleanPhone = credentials.phone.trim().replace(/\D/g, '');
      const cleanName = credentials.name.trim().toLowerCase();
      const targetList = role === 'ngo' ? this.ngoAccounts : this.benefactorAccounts;

      const found = targetList.find((acc) => {
        const pClean = acc.phone.replace(/\D/g, '');
        const nClean = acc.name.trim().toLowerCase();
        return (pClean === cleanPhone || acc.phone.trim() === credentials.phone.trim()) && nClean === cleanName;
      });

      if (!found) {
        throw new Error(`No registered ${role.toUpperCase()} account found with this Name and Phone Number.`);
      }
      if (found.password && found.password !== credentials.password) {
        throw new Error('Incorrect password for this account.');
      }

      this.currentUser = found;
      this.saveToStorage();
      return found;
    }
  }

  // Cross-device logout
  public async logout() {
    const token = localStorage.getItem('gw_session_token') || getCookie('gw_token');
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    }

    localStorage.removeItem('gw_session_token');
    localStorage.removeItem('gw_admin_token');
    localStorage.removeItem('gw_current_user');
    deleteCookie('gw_token');
    deleteCookie('gw_user_backup');
    deleteCookie('gw_admin_token');
    this.currentUser = null;
    this.saveToStorage();
    this.notify();
  }

  // Master Admin Verification against Server Backend
  public async verifyAdminPasscode(passcode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setAdminToken(data.token);
        const adminProfile = this.profiles.find((p) => p.role === 'admin') || {
          id: 'p-admin-master',
          role: 'admin',
          name: 'Governance Administrator',
          phone: '+8801700000000',
          status: 'approved',
          created_at: '2026-01-01T00:00:00Z',
        };
        this.setCurrentUser(adminProfile);
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid master admin passcode.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error during admin authentication.' };
    }
  }

  // Legacy fallback
  public signUp(data: {
    role: 'ngo' | 'benefactor';
    name: string;
    phone: string;
    address?: string;
    bkash_no?: string;
    nagad_no?: string;
    picture?: string;
    director_name?: string;
    password?: string;
  }): Promise<Profile> {
    if (data.role === 'ngo') {
      return this.signUpNgo({
        name: data.name,
        picture: data.picture || 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=400&q=80',
        director_name: data.director_name || 'Executive Director',
        phone: data.phone,
        address: data.address || 'Dhaka, Bangladesh',
        bkash_no: data.bkash_no,
        nagad_no: data.nagad_no,
        password: data.password || 'password123',
      });
    } else {
      return this.signUpBenefactor({
        name: data.name,
        phone: data.phone,
        picture: data.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}`,
        bkash_no: data.bkash_no,
        nagad_no: data.nagad_no,
        password: data.password || 'password123',
      });
    }
  }

  // Direct login by mobile phone
  public loginWithPhone(phone: string): Profile | null {
    const normalized = phone.trim().toLowerCase();
    const found = this.profiles.find((p) => p.phone.toLowerCase() === normalized || p.phone.replace(/\D/g, '') === normalized.replace(/\D/g, ''));
    if (found) {
      this.currentUser = found;
      this.saveToStorage();
      return found;
    }
    return null;
  }

  public registerOrganization(data: {
    ngo_id: string;
    name: string;
    date_created: string;
    director_name: string;
    address: string;
    logo_url: string;
    bkash_no: string;
    nagad_no: string;
  }): Organization {
    // Only registered NGO accounts can create organizations
    const isNgo = this.ngoAccounts.some((n) => n.id === data.ngo_id) || (this.currentUser?.role === 'ngo' && this.currentUser.id === data.ngo_id);
    if (!isNgo) {
      throw new Error('Access Denied: Only registered NGO accounts can create organizations.');
    }

    const tempId = `org-${Date.now()}`;
    const newOrg: Organization = {
      id: tempId,
      ngo_id: data.ngo_id,
      name: data.name,
      date_created: data.date_created,
      director_name: data.director_name,
      address: data.address,
      logo_url: data.logo_url || 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=400&q=80',
      bkash_no: data.bkash_no,
      nagad_no: data.nagad_no,
      total_raised: 0,
      donation_count: 0,
      fee_status: 'exempt',
      next_fee_due_date: null,
      created_at: new Date().toISOString(),
    };

    this.organizations.unshift(newOrg);
    this.saveToStorage();
    this.notify();

    // Single Authoritative Gateway Write
    apiPost('/api/organizations', newOrg);

    return newOrg;
  }

  public async createPost(data: { ngo_id: string; caption: string; media_url: string }): Promise<Post> {
    const tempId = `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newPost: Post = {
      id: tempId,
      ngo_id: data.ngo_id,
      caption: data.caption,
      media_url: data.media_url,
      created_at: new Date().toISOString(),
    };

    // Optimistic insert into local stream
    this.posts.unshift(newPost);
    this.saveToStorage();
    this.notify();

    // Authoritative Server Write with in-place ID Reconciliation
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newPost),
      });

      if (res.ok) {
        const canonical = await res.json();
        if (canonical && canonical.id) {
          const idx = this.posts.findIndex((p) => p.id === tempId);
          if (idx !== -1) {
            this.posts[idx] = { ...newPost, ...canonical };
            this.saveToStorage();
            this.notify();
          }
          return canonical;
        }
      }
    } catch {
      // Retain optimistic post if network is offline
    }

    return newPost;
  }

  public async deletePost(postId: string) {
    this.posts = this.posts.filter((p) => p.id !== postId);
    this.saveToStorage();
    this.notify();

    apiDelete(`/api/posts/${encodeURIComponent(postId)}`);
  }

  public async recordDonation(data: {
    donor_id: string;
    ngo_id: string;
    amount: number;
    method: 'bKash' | 'Nagad';
    mfs_account: string;
    reference: string;
    verification_hash?: string;
  }): Promise<Donation> {
    const verification_hash =
      data.verification_hash ||
      `GW-MFS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newDonation: Donation = {
      id: `don-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      donor_id: data.donor_id,
      ngo_id: data.ngo_id,
      amount: data.amount,
      method: data.method,
      mfs_account: data.mfs_account,
      reference: data.reference,
      verification_hash,
      created_at: new Date().toISOString(),
    };

    this.donations.unshift(newDonation);

    // Update organization stats locally
    const orgIndex = this.organizations.findIndex((o) => o.ngo_id === data.ngo_id || o.id === data.ngo_id);
    if (orgIndex !== -1) {
      const org = { ...this.organizations[orgIndex] };
      org.donation_count = Number(org.donation_count || 0) + 1;
      org.total_raised = Number(org.total_raised || 0) + Number(data.amount);

      if (org.donation_count === 4) {
        org.fee_status = 'active';
        const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        org.next_fee_due_date = twoWeeksLater.toISOString();
      }

      this.organizations[orgIndex] = org;
    }

    this.saveToStorage();
    this.notify();

    // Single Authoritative Gateway Write to Server
    apiPost('/api/donations', newDonation);

    return newDonation;
  }

  public payOrganizationFee(ngo_id: string) {
    const orgIndex = this.organizations.findIndex((o) => o.ngo_id === ngo_id || o.id === ngo_id);
    if (orgIndex !== -1) {
      const org = { ...this.organizations[orgIndex] };
      org.fee_status = 'active';
      const currentDue = org.next_fee_due_date ? new Date(org.next_fee_due_date).getTime() : Date.now();
      const nextDue = Math.max(Date.now(), currentDue) + 14 * 24 * 60 * 60 * 1000;
      org.next_fee_due_date = new Date(nextDue).toISOString();
      this.organizations[orgIndex] = org;
      this.saveToStorage();
      this.notify();

      apiPatch(`/api/organizations/${encodeURIComponent(ngo_id)}`, {
        fee_status: org.fee_status,
        next_fee_due_date: org.next_fee_due_date,
      });
    }
  }

  public updateProfileStatus(profileId: string, status: 'approved' | 'rejected' | 'restricted') {
    const pIndex = this.profiles.findIndex((p) => p.id === profileId);
    if (pIndex !== -1) {
      this.profiles[pIndex] = { ...this.profiles[pIndex], status };
    }

    const nIndex = this.ngoAccounts.findIndex((p) => p.id === profileId);
    if (nIndex !== -1) {
      this.ngoAccounts[nIndex] = { ...this.ngoAccounts[nIndex], status };
      apiPatch(`/api/ngo-accounts/${encodeURIComponent(profileId)}`, { status });
    }

    const bIndex = this.benefactorAccounts.findIndex((p) => p.id === profileId);
    if (bIndex !== -1) {
      this.benefactorAccounts[bIndex] = { ...this.benefactorAccounts[bIndex], status };
      apiPatch(`/api/benefactor-accounts/${encodeURIComponent(profileId)}`, { status });
    }

    if (this.currentUser && this.currentUser.id === profileId) {
      this.currentUser = { ...this.currentUser, status };
    }
    this.rebuildProfiles();
    this.saveToStorage();
    this.notify();

    apiPatch(`/api/profiles/${encodeURIComponent(profileId)}`, { status });
  }

  public deleteProfile(profileId: string) {
    this.ngoAccounts = this.ngoAccounts.filter((p) => p.id !== profileId);
    this.benefactorAccounts = this.benefactorAccounts.filter((p) => p.id !== profileId);
    this.rebuildProfiles();
    this.organizations = this.organizations.filter((o) => o.ngo_id !== profileId && o.id !== profileId);
    this.posts = this.posts.filter((post) => post.ngo_id !== profileId);
    this.donations = this.donations.filter((d) => d.donor_id !== profileId && d.ngo_id !== profileId);
    if (this.currentUser && this.currentUser.id === profileId) {
      this.currentUser = null;
    }
    this.saveToStorage();
    this.notify();

    apiDelete(`/api/profiles/${encodeURIComponent(profileId)}`);
    apiDelete(`/api/ngo-accounts/${encodeURIComponent(profileId)}`);
    apiDelete(`/api/benefactor-accounts/${encodeURIComponent(profileId)}`);
  }

  public updateFeeStatus(orgId: string, status: 'exempt' | 'active' | 'unpaid') {
    const index = this.organizations.findIndex((o) => o.id === orgId || o.ngo_id === orgId);
    if (index !== -1) {
      this.organizations[index] = { ...this.organizations[index], fee_status: status };
      this.saveToStorage();
      this.notify();

      apiPatch(`/api/organizations/${encodeURIComponent(orgId)}`, { fee_status: status });
    }
  }

  public createNotice(title: string, content: string): Notice {
    const newNotice: Notice = {
      id: `not-${Date.now()}`,
      title,
      content,
      created_at: new Date().toISOString(),
    };
    this.notices.unshift(newNotice);
    this.saveToStorage();
    this.notify();

    apiPost('/api/notices', newNotice);

    return newNotice;
  }

  public deleteNotice(noticeId: string) {
    this.notices = this.notices.filter((n) => n.id !== noticeId);
    this.saveToStorage();
    this.notify();

    apiDelete(`/api/notices/${encodeURIComponent(noticeId)}`);
  }

  public getDonorDonationCount(donorId: string): number {
    return this.donations.filter((d) => d.donor_id === donorId).length;
  }

  public getDonorTotalGiven(donorId: string): number {
    return this.donations
      .filter((d) => d.donor_id === donorId)
      .reduce((sum, d) => sum + Number(d.amount), 0);
  }
}

export const dataStore = new GoodwillDataStore();
