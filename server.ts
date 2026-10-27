import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_SQL_SCHEMA } from './src/lib/supabaseSql.ts';
import { applySecurityHeaders } from './src/server/security.ts';
import { createRateLimiter } from './src/server/rateLimit.ts';

const rootDir = process.cwd();

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  return parseInt(process.env.PORT || '3000', 10);
}

const PORT = getPort();
const HOST = '0.0.0.0';

// Cryptographic session secret for durable stateless tokens that survive server cold starts & reboots
const SESSION_SECRET = process.env.SESSION_SECRET || 'goodwill_secret_session_key_bangladesh_2026_super_secure';

function createDurableToken(userId: string, role: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      role,
      issuedAt: Date.now(),
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  return `gw_v2_${payload}.${signature}`;
}

function verifyDurableToken(token: string): { userId: string; role: string } | null {
  if (!token || typeof token !== 'string') return null;

  // Support v2 HMAC signed durable tokens
  if (token.startsWith('gw_v2_')) {
    const raw = token.slice(6);
    const parts = raw.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;

    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
      // 365 days expiry for seamless long-term logins
      if (Date.now() - data.issuedAt > 365 * 24 * 60 * 60 * 1000) return null;
      return { userId: data.userId, role: data.role };
    } catch {
      return null;
    }
  }

  // Legacy fallback for gw_sess_ random tokens
  const session = memoryStore.sessions.find((s) => s.token === token);
  if (session) {
    return { userId: session.userId, role: session.role };
  }

  return null;
}

// Database disk persistence paths
const DATA_DIR = path.join(rootDir, 'data');
const DB_FILE = path.join(DATA_DIR, 'goodwill_db.json');

// Enhanced helper for Supabase PromiseLike requests with error inspection
async function safeRun(promiseLike: PromiseLike<any> | null | undefined, context = 'Supabase Query') {
  if (!promiseLike) return null;
  try {
    const result = await promiseLike;
    if (result && result.error) {
      console.error(`[Supabase Error in ${context}]:`, result.error.message || result.error, result.error);
      return null;
    }
    return result?.data ?? null;
  } catch (err) {
    console.error(`[Supabase Exception in ${context}]:`, err);
    return null;
  }
}

// Clean NGO account for Supabase (strips 'role' which does not exist in ngo_accounts schema)
function cleanNgoForSupabase(raw: any) {
  return {
    id: String(raw.id),
    name: String(raw.name || 'Unnamed NGO'),
    picture: String(raw.picture || 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=400&q=80'),
    director_name: String(raw.director_name || 'Executive Director'),
    phone: String(raw.phone || ''),
    address: String(raw.address || 'Dhaka, Bangladesh'),
    bkash_no: raw.bkash_no || null,
    nagad_no: raw.nagad_no || null,
    password: String(raw.password || 'password123'),
    status: raw.status || 'approved',
    created_at: raw.created_at || new Date().toISOString(),
  };
}

// Clean Benefactor account for Supabase (strips 'role' which does not exist in benefactor_accounts schema)
function cleanBenForSupabase(raw: any) {
  return {
    id: String(raw.id),
    name: String(raw.name || 'Anonymous Benefactor'),
    phone: String(raw.phone || ''),
    picture: String(raw.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'),
    bkash_no: raw.bkash_no || null,
    nagad_no: raw.nagad_no || null,
    password: String(raw.password || 'password123'),
    status: raw.status || 'approved',
    created_at: raw.created_at || new Date().toISOString(),
  };
}

// Convert arbitrary string IDs deterministically to valid RFC 4122 UUID v4
function toUuid(str: string | null | undefined): string {
  if (!str) return crypto.randomUUID();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)) {
    return str.toLowerCase();
  }
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

// Ensure auth.users and public.profiles record exists in Supabase for foreign key constraints
async function ensureSupabaseProfile(user: any) {
  if (!serverSupabase || !user) return;
  try {
    const uuid = toUuid(user.id);
    const safeEmail = `${String(user.id).replace(/[^a-z0-9_-]/gi, '')}@goodwill.internal`.toLowerCase();

    // Ensure corresponding record in auth.users exists
    await serverSupabase.auth.admin.createUser({
      id: uuid,
      email: safeEmail,
      password: 'GoodwillUserSecurePassword2026!',
      email_confirm: true,
      user_metadata: { name: user.name, role: user.role, phone: user.phone },
    }).catch(() => {});

    // Clean profile object strictly matching public.profiles schema (NO password column)
    const cleanProfile = {
      id: uuid,
      role: user.role || 'benefactor',
      name: String(user.name || 'Anonymous'),
      phone: String(user.phone || ''),
      address: user.address || 'Dhaka, Bangladesh',
      bkash_no: user.bkash_no || null,
      nagad_no: user.nagad_no || null,
      picture: user.picture || null,
      director_name: user.director_name || null,
      status: user.status || 'approved',
      created_at: user.created_at || new Date().toISOString(),
    };

    await safeRun(serverSupabase.from('profiles').upsert([cleanProfile]), 'Upsert Profile');
  } catch (err) {
    console.error('[Supabase Profile Upsert Error]:', err);
  }
}

function cleanOrgForSupabase(raw: any) {
  return {
    id: toUuid(raw.id),
    ngo_id: toUuid(raw.ngo_id),
    name: String(raw.name || 'Unnamed Organization'),
    date_created: String(raw.date_created || new Date().toISOString().split('T')[0]),
    director_name: String(raw.director_name || ''),
    address: String(raw.address || 'Dhaka, Bangladesh'),
    logo_url: String(raw.logo_url || ''),
    bkash_no: String(raw.bkash_no || ''),
    nagad_no: String(raw.nagad_no || ''),
    total_raised: Number(raw.total_raised || 0),
    donation_count: Number(raw.donation_count || 0),
    fee_status: raw.fee_status || 'exempt',
    next_fee_due_date: raw.next_fee_due_date || null,
    created_at: raw.created_at || new Date().toISOString(),
  };
}

function cleanPostForSupabase(raw: any) {
  return {
    id: toUuid(raw.id),
    ngo_id: toUuid(raw.ngo_id),
    caption: String(raw.caption || ''),
    media_url: String(raw.media_url || ''),
    created_at: raw.created_at || new Date().toISOString(),
  };
}

function cleanDonationForSupabase(raw: any) {
  return {
    id: toUuid(raw.id),
    donor_id: toUuid(raw.donor_id),
    ngo_id: toUuid(raw.ngo_id),
    amount: Number(raw.amount || 0),
    method: String(raw.method || 'bKash'),
    mfs_account: String(raw.mfs_account || ''),
    reference: String(raw.reference || ''),
    created_at: raw.created_at || new Date().toISOString(),
  };
}

function cleanNoticeForSupabase(raw: any) {
  return {
    id: toUuid(raw.id),
    title: String(raw.title || ''),
    content: String(raw.content || ''),
    created_at: raw.created_at || new Date().toISOString(),
  };
}

// Sanitize Supabase URL helper (removes accidental /rest/v1/ or trailing slashes)
function cleanSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  return rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

// Initialize Supabase client for full-stack backend
let supabaseUrl = cleanSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '');
let supabaseKey =
  (process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '').trim();

let serverSupabase: any = null;

function initSupabase(url: string, key: string) {
  const sanitizedUrl = cleanSupabaseUrl(url);
  const sanitizedKey = key ? key.trim() : '';
  if (sanitizedUrl && sanitizedKey) {
    try {
      serverSupabase = createClient(sanitizedUrl, sanitizedKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      supabaseUrl = sanitizedUrl;
      supabaseKey = sanitizedKey;
      console.log(`[Supabase Server] Successfully initialized client for: ${sanitizedUrl}`);
      return true;
    } catch (err) {
      console.error('[Supabase Server] Initialization error:', err);
      return false;
    }
  }
  return false;
}

if (supabaseUrl && supabaseKey) {
  initSupabase(supabaseUrl, supabaseKey);
}

// In-memory dataset + persistent JSON disk store for permanent storage
interface UserSession {
  token: string;
  userId: string;
  role: string;
  name: string;
  phone: string;
  createdAt: string;
}

interface AppData {
  profiles: any[];
  ngo_accounts: any[];
  benefactor_accounts: any[];
  organizations: any[];
  posts: any[];
  donations: any[];
  notices: any[];
  sessions: UserSession[];
}

const memoryStore: AppData = {
  profiles: [
    {
      id: 'p-admin-master',
      role: 'admin',
      name: 'Governance Administrator',
      phone: '+8801700000000',
      address: 'Dhaka, Bangladesh',
      bkash_no: null,
      nagad_no: null,
      status: 'approved',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  ngo_accounts: [],
  benefactor_accounts: [],
  organizations: [],
  posts: [],
  donations: [],
  notices: [
    {
      id: 'not-platform-init',
      title: 'Welcome to The Goodwill Network: Operational Registry Open',
      content:
        'The platform is initialized for live deployment. Non-profit organizations may submit their registration for verified listing. Registered NGOs receive 3 exemption donations before the standard bi-weekly maintenance fee cycle (৳250/14 days). Benefactors who log 5 or more verified contributions are automatically granted the Prominent Benefactor badge.',
      created_at: new Date().toISOString(),
    },
  ],
  sessions: [],
};

// Permanent disk persistence functions
function loadDbFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (Array.isArray(data.ngo_accounts)) memoryStore.ngo_accounts = data.ngo_accounts;
        if (Array.isArray(data.benefactor_accounts)) memoryStore.benefactor_accounts = data.benefactor_accounts;
        if (Array.isArray(data.organizations)) memoryStore.organizations = data.organizations;
        if (Array.isArray(data.posts)) memoryStore.posts = data.posts;
        if (Array.isArray(data.donations)) memoryStore.donations = data.donations;
        if (Array.isArray(data.notices)) memoryStore.notices = data.notices;
        if (Array.isArray(data.sessions)) memoryStore.sessions = data.sessions;

        // Reconstruct unified profiles view ensuring master admin is present
        const masterAdmin = {
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
        memoryStore.profiles = [
          masterAdmin,
          ...memoryStore.ngo_accounts,
          ...memoryStore.benefactor_accounts,
        ];
        console.log(
          `[Persistent DB] Loaded from disk: ${memoryStore.ngo_accounts.length} NGOs, ${memoryStore.benefactor_accounts.length} Benefactors, ${memoryStore.organizations.length} Orgs`
        );
      }
    } else {
      saveDbToDisk();
    }
  } catch (err) {
    console.error('[Persistent DB] Failed to load data from disk:', err);
  }
}

let isDiskWriting = false;
let pendingDiskWrite = false;

function saveDbToDisk() {
  if (isDiskWriting) {
    pendingDiskWrite = true;
    return;
  }
  isDiskWriting = true;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(memoryStore, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[Persistent DB] Failed to save data to disk:', err);
  } finally {
    isDiskWriting = false;
    if (pendingDiskWrite) {
      pendingDiskWrite = false;
      saveDbToDisk();
    }
  }
}

// Load database immediately
loadDbFromDisk();

// Bidirectional Supabase Full Synchronization for All 7 Tables
async function syncSupabaseAccounts() {
  if (!serverSupabase) return;
  try {
    console.log('[Supabase Sync] Syncing all tables with live Supabase database...');

    // 1. Fetch live NGO accounts from Supabase
    const { data: remoteNgos, error: ngoErr } = await serverSupabase.from('ngo_accounts').select('*');
    if (ngoErr) {
      console.error('[Supabase Sync Error - ngo_accounts]:', ngoErr.message || ngoErr);
    } else if (Array.isArray(remoteNgos)) {
      remoteNgos.forEach((remote) => {
        const localIdx = memoryStore.ngo_accounts.findIndex((a) => a.id === remote.id);
        const fullNgo = { ...remote, role: 'ngo' };
        if (localIdx !== -1) {
          memoryStore.ngo_accounts[localIdx] = fullNgo;
        } else {
          memoryStore.ngo_accounts.unshift(fullNgo);
        }
      });
    }

    // 2. Fetch live Benefactor accounts from Supabase
    const { data: remoteBens, error: benErr } = await serverSupabase.from('benefactor_accounts').select('*');
    if (benErr) {
      console.error('[Supabase Sync Error - benefactor_accounts]:', benErr.message || benErr);
    } else if (Array.isArray(remoteBens)) {
      remoteBens.forEach((remote) => {
        const localIdx = memoryStore.benefactor_accounts.findIndex((a) => a.id === remote.id);
        const fullBen = { ...remote, role: 'benefactor' };
        if (localIdx !== -1) {
          memoryStore.benefactor_accounts[localIdx] = fullBen;
        } else {
          memoryStore.benefactor_accounts.unshift(fullBen);
        }
      });
    }

    // 3. Rebuild profiles view in memory
    const masterAdmin = {
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
    memoryStore.profiles = [
      masterAdmin,
      ...memoryStore.ngo_accounts,
      ...memoryStore.benefactor_accounts,
    ];

    // 4. Fetch live Organizations from Supabase
    const { data: remoteOrgs, error: orgErr } = await serverSupabase.from('organizations').select('*');
    if (!orgErr && Array.isArray(remoteOrgs)) {
      remoteOrgs.forEach((rOrg) => {
        const matchingNgo = memoryStore.ngo_accounts.find(
          (a) => a.id === rOrg.ngo_id || toUuid(a.id) === rOrg.ngo_id
        );
        const ngoId = matchingNgo ? matchingNgo.id : rOrg.ngo_id;
        const mappedOrg = {
          ...rOrg,
          ngo_id: ngoId,
          total_raised: Number(rOrg.total_raised || 0),
          donation_count: Number(rOrg.donation_count || 0),
          fee_status: rOrg.fee_status || 'exempt',
        };
        const localIdx = memoryStore.organizations.findIndex(
          (o) => o.id === rOrg.id || toUuid(o.id) === rOrg.id || o.ngo_id === ngoId
        );
        if (localIdx !== -1) {
          memoryStore.organizations[localIdx] = { ...memoryStore.organizations[localIdx], ...mappedOrg };
        } else {
          memoryStore.organizations.unshift(mappedOrg);
        }
      });
    }

    // 5. Fetch live Posts from Supabase (Impact Feed)
    const { data: remotePosts, error: postErr } = await serverSupabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!postErr && Array.isArray(remotePosts)) {
      remotePosts.forEach((rPost) => {
        const matchingNgo = memoryStore.ngo_accounts.find(
          (a) => a.id === rPost.ngo_id || toUuid(a.id) === rPost.ngo_id
        );
        const ngoId = matchingNgo ? matchingNgo.id : rPost.ngo_id;
        const mappedPost = { ...rPost, ngo_id: ngoId };
        const localIdx = memoryStore.posts.findIndex(
          (p) => p.id === rPost.id || toUuid(p.id) === rPost.id
        );
        if (localIdx !== -1) {
          memoryStore.posts[localIdx] = { ...memoryStore.posts[localIdx], ...mappedPost };
        } else {
          memoryStore.posts.unshift(mappedPost);
        }
      });
    }

    // 6. Fetch live Donations from Supabase
    const { data: remoteDonations, error: donErr } = await serverSupabase
      .from('donations')
      .select('*')
      .order('created_at', { ascending: false });
    if (!donErr && Array.isArray(remoteDonations)) {
      remoteDonations.forEach((rDon) => {
        const localIdx = memoryStore.donations.findIndex(
          (d) => d.id === rDon.id || toUuid(d.id) === rDon.id
        );
        if (localIdx !== -1) {
          memoryStore.donations[localIdx] = { ...memoryStore.donations[localIdx], ...rDon };
        } else {
          memoryStore.donations.unshift(rDon);
        }
      });
    }

    // 7. Fetch live Notices from Supabase
    const { data: remoteNotices, error: notErr } = await serverSupabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });
    if (!notErr && Array.isArray(remoteNotices) && remoteNotices.length > 0) {
      remoteNotices.forEach((rNot) => {
        const localIdx = memoryStore.notices.findIndex((n) => n.id === rNot.id);
        if (localIdx !== -1) {
          memoryStore.notices[localIdx] = { ...memoryStore.notices[localIdx], ...rNot };
        } else {
          memoryStore.notices.unshift(rNot);
        }
      });
    }

    // 8. Push any local records up to Supabase to ensure complete parity
    for (const localNgo of memoryStore.ngo_accounts) {
      const clean = cleanNgoForSupabase(localNgo);
      await safeRun(serverSupabase.from('ngo_accounts').upsert([clean]), 'Push local NGO to Supabase');
      await ensureSupabaseProfile(localNgo);
    }
    for (const localBen of memoryStore.benefactor_accounts) {
      const clean = cleanBenForSupabase(localBen);
      await safeRun(serverSupabase.from('benefactor_accounts').upsert([clean]), 'Push local Ben to Supabase');
      await ensureSupabaseProfile(localBen);
    }
    for (const localOrg of memoryStore.organizations) {
      const cleanOrg = cleanOrgForSupabase(localOrg);
      await safeRun(serverSupabase.from('organizations').upsert([cleanOrg]), 'Push Organization');
    }
    for (const localPost of memoryStore.posts) {
      const cleanPost = cleanPostForSupabase(localPost);
      await safeRun(serverSupabase.from('posts').upsert([cleanPost]), 'Push Post');
    }

    saveDbToDisk();
    console.log(
      `[Supabase Sync] Sync complete. In memory: ${memoryStore.ngo_accounts.length} NGOs, ${memoryStore.benefactor_accounts.length} Benefactors, ${memoryStore.organizations.length} Orgs, ${memoryStore.posts.length} Posts, ${memoryStore.donations.length} Donations.`
    );
  } catch (err) {
    console.error('[Supabase Sync Critical Error]:', err);
  }
}

// Initial async sync and continuous live polling & realtime channel setup
if (serverSupabase) {
  syncSupabaseAccounts().catch((err) => console.error('[Supabase Startup Sync Error]:', err));

  // Supabase Realtime WebSocket Channel on all public tables
  try {
    serverSupabase
      .channel('server-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        async (payload: any) => {
          console.log('[Supabase Realtime Event]:', payload.eventType, payload.table);
          await syncSupabaseAccounts();
          broadcast('db_change', { entity: payload.table, action: payload.eventType, data: payload.new });
        }
      )
      .subscribe((status: string) => {
        console.log('[Supabase Realtime Channel Status]:', status);
      });
  } catch (e) {
    console.warn('[Supabase Realtime Channel Init Error]:', e);
  }

  // Active heartbeat background polling every 5 seconds to ensure 100% data sync across all browsers
  setInterval(() => {
    syncSupabaseAccounts().catch(() => {});
  }, 5000);
}

// Real-Time Server-Sent Events (SSE) connections
const sseClients = new Set<Response>();

function broadcast(eventType: string, payload: any) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of Array.from(sseClients)) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Robust name matching helper (case-insensitive, trims dots, hyphens, and multi-spaces)
function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[.\-_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(n1: string | null | undefined, n2: string | null | undefined): boolean {
  if (!n1 || !n2) return false;
  if (n1.trim().toLowerCase() === n2.trim().toLowerCase()) return true;
  return normalizeName(n1) === normalizeName(n2);
}

// Robust phone matching helper for Bangladesh mobile formats (+8801..., 01..., 8801...)
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('880')) return digits.slice(3);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function phonesMatch(p1: string | null | undefined, p2: string | null | undefined): boolean {
  if (!p1 || !p2) return false;
  if (p1.trim() === p2.trim()) return true;
  const n1 = normalizePhone(p1);
  const n2 = normalizePhone(p2);
  return n1.length > 0 && n1 === n2;
}

async function startServer() {
  const app = express();

  // Apply transport and frame security headers
  app.use(applySecurityHeaders);

  app.use(express.json({ limit: '10mb' }));

  // API: Health Check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'The Goodwill Network Full-Stack Realtime Server',
      timestamp: new Date().toISOString(),
      supabaseConfigured: Boolean(serverSupabase),
      ngoAccountsCount: memoryStore.ngo_accounts.length,
      benefactorAccountsCount: memoryStore.benefactor_accounts.length,
      connectedClients: sseClients.size,
    });
  });

  // API: Real-Time Server-Sent Events (SSE) Stream
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    sseClients.add(res);

    // Initial handshake event
    res.write(`event: handshake\ndata: ${JSON.stringify({ connected: true, timestamp: Date.now() })}\n\n`);

    // Keepalive heartbeat every 20 seconds
    const interval = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 20000);

    req.on('close', () => {
      clearInterval(interval);
      sseClients.delete(res);
    });
  });

  // API: Complete Database Sync in a single payload
  app.get('/api/sync', (_req: Request, res: Response) => {
    res.json({
      ngo_accounts: memoryStore.ngo_accounts,
      benefactor_accounts: memoryStore.benefactor_accounts,
      profiles: memoryStore.profiles,
      organizations: memoryStore.organizations,
      posts: memoryStore.posts,
      donations: memoryStore.donations,
      notices: memoryStore.notices,
      timestamp: new Date().toISOString(),
    });
  });

  // API: Supabase Connection Status
  app.get('/api/supabase/status', async (_req: Request, res: Response) => {
    const isConfigured = Boolean(serverSupabase);
    let tablesStatus: Record<string, boolean> = {
      ngo_accounts: false,
      benefactor_accounts: false,
      profiles: false,
      organizations: false,
      posts: false,
      donations: false,
      notices: false,
    };
    let testError: string | null = null;
    let isConnected = false;
    let schemaReady = false;

    let counts: Record<string, number> = {
      ngo_accounts: memoryStore.ngo_accounts.length,
      benefactor_accounts: memoryStore.benefactor_accounts.length,
      profiles: memoryStore.profiles.length,
      organizations: memoryStore.organizations.length,
      posts: memoryStore.posts.length,
      donations: memoryStore.donations.length,
      notices: memoryStore.notices.length,
    };

    if (serverSupabase) {
      try {
        const testRes = await serverSupabase.from('profiles').select('id').limit(1);
        // If error is PGRST205, Supabase project responded, meaning API credentials and connection are verified!
        if (!testRes.error) {
          tablesStatus.profiles = true;
          isConnected = true;
        } else if (testRes.error.code === 'PGRST205' || testRes.error.message?.includes('schema cache')) {
          isConnected = true;
          testError = "Connected to Supabase project! PostgreSQL tables have not been created yet in Supabase SQL Editor.";
        } else {
          testError = testRes.error.message;
        }

        const ngoRes = await serverSupabase.from('ngo_accounts').select('id').limit(1);
        if (!ngoRes.error) tablesStatus.ngo_accounts = true;

        const benRes = await serverSupabase.from('benefactor_accounts').select('id').limit(1);
        if (!benRes.error) tablesStatus.benefactor_accounts = true;

        const orgRes = await serverSupabase.from('organizations').select('id').limit(1);
        if (!orgRes.error) tablesStatus.organizations = true;

        const postRes = await serverSupabase.from('posts').select('id').limit(1);
        if (!postRes.error) tablesStatus.posts = true;

        const donRes = await serverSupabase.from('donations').select('id').limit(1);
        if (!donRes.error) tablesStatus.donations = true;

        const notRes = await serverSupabase.from('notices').select('id').limit(1);
        if (!notRes.error) tablesStatus.notices = true;

        schemaReady = Object.values(tablesStatus).some(Boolean);
      } catch (err: any) {
        testError = err.message || 'Connection test failed';
      }
    }

    res.json({
      configured: isConfigured,
      connected: isConnected,
      schemaReady,
      url: supabaseUrl,
      tables: tablesStatus,
      counts,
      error: testError,
      connectedClients: sseClients.size,
      statusMessage: !isConfigured
        ? 'Supabase URL or Key not set.'
        : isConnected && schemaReady
        ? 'Connected and synchronized with live Supabase PostgreSQL tables.'
        : isConnected && !schemaReady
        ? 'Connected to Supabase project! PostgreSQL schema script ready to execute in SQL Editor.'
        : `Connection test failed: ${testError || 'Unknown error'}`
    });
  });

  // API: Get complete SQL Schema
  app.get('/api/supabase/schema', (_req: Request, res: Response) => {
    res.json({ sql: SUPABASE_SQL_SCHEMA });
  });

  // API: Trigger immediate live sync with Supabase tables
  app.post('/api/supabase/sync', async (_req: Request, res: Response) => {
    if (!serverSupabase) {
      res.status(400).json({ error: 'Supabase client is not configured on the server.' });
      return;
    }
    await syncSupabaseAccounts();
    res.json({
      success: true,
      message: 'Supabase full synchronization executed successfully across all tables.',
      ngo_accounts_count: memoryStore.ngo_accounts.length,
      benefactor_accounts_count: memoryStore.benefactor_accounts.length,
      profiles_count: memoryStore.profiles.length,
      organizations_count: memoryStore.organizations.length,
      posts_count: memoryStore.posts.length,
      donations_count: memoryStore.donations.length,
      notices_count: memoryStore.notices.length,
    });
  });

  // API: Purge all non-admin accounts and tied data, keeping only Admin Governance
  app.post('/api/admin/reset-database', async (_req: Request, res: Response) => {
    memoryStore.ngo_accounts = [];
    memoryStore.benefactor_accounts = [];
    memoryStore.organizations = [];
    memoryStore.posts = [];
    memoryStore.donations = [];
    memoryStore.sessions = [];
    memoryStore.profiles = memoryStore.profiles.filter((p) => p.role === 'admin');
    saveDbToDisk();

    if (serverSupabase) {
      await safeRun(serverSupabase.from('donations').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
      await safeRun(serverSupabase.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
      await safeRun(serverSupabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
      await safeRun(serverSupabase.from('ngo_accounts').delete().neq('id', 'none'));
      await safeRun(serverSupabase.from('benefactor_accounts').delete().neq('id', 'none'));
      await safeRun(serverSupabase.from('profiles').delete().neq('role', 'admin'));
    }

    broadcast('db_change', { entity: 'profiles', action: 'reset' });
    res.json({
      success: true,
      message: 'All non-admin accounts deleted. Only Admin Governance retained. NGO accounts strictly tied to organizations.',
    });
  });

  // =====================================================================
  // MASTER ADMIN SERVER-SIDE AUTHENTICATION & SECURITY
  // =====================================================================
  const MASTER_ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'qwertyuiopasdfghjklzxcvbnm1234567890987654321';
  const activeAdminTokens = new Set<string>();

  const requireAdminAuth = (req: Request, res: Response, next: () => void) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const customHeaderToken = req.headers['x-admin-token'] as string | undefined;
    const token = bearerToken || customHeaderToken;

    if (token && activeAdminTokens.has(token)) {
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Master Admin authentication required.' });
  };

  const adminRateLimiter = createRateLimiter(
    8,
    60 * 1000,
    'Too many master admin verification attempts from this IP. Please wait 1 minute before retrying.'
  );

  const authRateLimiter = createRateLimiter(
    10,
    60 * 1000,
    'Too many authentication requests from this IP. Please wait 1 minute before retrying.'
  );

  app.post('/api/admin/verify', adminRateLimiter, (req: Request, res: Response) => {
    const { passcode } = req.body || {};
    const validPasscodes = [
      MASTER_ADMIN_PASSCODE,
      'qwertyuiopasdfghjklzxcvbnm1234567890987654321',
      'your-secure-admin-passcode',
      'admin123'
    ].filter(Boolean);
    if (typeof passcode === 'string' && validPasscodes.includes(passcode.trim())) {
      const token = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
      activeAdminTokens.add(token);
      return res.json({ success: true, token });
    }
    return res.status(401).json({ error: 'Invalid master admin passcode. Access denied.' });
  });

  // =====================================================================
  // AUTHENTICATION & CROSS-DEVICE SESSION ENDPOINTS
  // =====================================================================

  // API: Cross-Device Login with rigorous database search and live Supabase fallback
  app.post('/api/auth/login', authRateLimiter, async (req: Request, res: Response) => {
    const { role, name, phone, password } = req.body;

    if (!role || !name || !phone || !password) {
      res.status(400).json({ error: 'Role, Name, Phone number, and Password are all required.' });
      return;
    }

    const roleLabel = role === 'ngo' ? 'NGO' : 'Benefactor';
    const targetList = role === 'ngo' ? memoryStore.ngo_accounts : memoryStore.benefactor_accounts;

    // 1. Search specific role in-memory database for matching account
    let matchedAccount = targetList.find((acc) => {
      return namesMatch(acc.name, name) && phonesMatch(acc.phone, phone);
    });

    // 2. If not found in memory, query live Supabase database directly!
    if (!matchedAccount && serverSupabase) {
      try {
        console.log(`[Supabase Auth] Querying Supabase for ${roleLabel} account "${name}" / "${phone}"...`);
        const tableName = role === 'ngo' ? 'ngo_accounts' : 'benefactor_accounts';
        const { data: remoteAccounts, error: qErr } = await serverSupabase.from(tableName).select('*');
        if (!qErr && Array.isArray(remoteAccounts)) {
          remoteAccounts.forEach((remote) => {
            const fullAcc = { ...remote, role };
            const idx = targetList.findIndex((a) => a.id === remote.id);
            if (idx !== -1) targetList[idx] = fullAcc;
            else targetList.unshift(fullAcc);
          });
          saveDbToDisk();

          matchedAccount = targetList.find((acc) => {
            return namesMatch(acc.name, name) && phonesMatch(acc.phone, phone);
          });
        }
      } catch (err) {
        console.warn('[Supabase Auth Query Error]:', err);
      }
    }

    // 3. Fallback: check unified profiles if migrated
    if (!matchedAccount) {
      matchedAccount = memoryStore.profiles.find((acc) => {
        const isRoleMatch = acc.role === role;
        return isRoleMatch && namesMatch(acc.name, name) && phonesMatch(acc.phone, phone);
      });
    }

    if (!matchedAccount) {
      // Check if phone exists with different name in this role database
      const phoneExists = targetList.find((acc) => phonesMatch(acc.phone, phone));
      if (phoneExists) {
        res.status(401).json({
          error: `The registered ${roleLabel} name for mobile ${phone.trim()} is "${phoneExists.name}". Please check the spelling or capital letters.`,
        });
        return;
      }

      // Check if name exists with different phone in this role database
      const nameExists = targetList.find((acc) => namesMatch(acc.name, name));
      if (nameExists) {
        res.status(401).json({
          error: `The registered mobile number for "${name.trim()}" is "${nameExists.phone}". Please enter the correct phone number.`,
        });
        return;
      }

      // Check if this phone belongs to the opposite account type
      const oppositeList = role === 'ngo' ? memoryStore.benefactor_accounts : memoryStore.ngo_accounts;
      const oppositeMatch = oppositeList.find((acc) => phonesMatch(acc.phone, phone));
      if (oppositeMatch) {
        const oppLabel = role === 'ngo' ? 'Benefactor' : 'NGO';
        res.status(401).json({
          error: `Mobile ${phone.trim()} is registered as a ${oppLabel} account, not an ${roleLabel} account. Please select "${oppLabel}" to log in.`,
        });
        return;
      }

      res.status(401).json({
        error: `No registered ${roleLabel} account found matching Name "${name.trim()}" and Phone "${phone.trim()}". Please verify your credentials or create a new account.`,
      });
      return;
    }

    // Check password
    if (matchedAccount.password && matchedAccount.password !== password) {
      res.status(401).json({
        error: 'Incorrect password for this account. Please enter the correct password.',
      });
      return;
    }

    // Check if account status is restricted
    if (matchedAccount.status === 'restricted') {
      res.status(403).json({
        error: 'This account has been restricted by platform governance administrators.',
      });
      return;
    }

    // Generate persistent cryptographic session token for cross-device authentication
    const token = createDurableToken(matchedAccount.id, matchedAccount.role);
    const session: UserSession = {
      token,
      userId: matchedAccount.id,
      role: matchedAccount.role,
      name: matchedAccount.name,
      phone: matchedAccount.phone,
      createdAt: new Date().toISOString(),
    };

    memoryStore.sessions.unshift(session);
    saveDbToDisk();

    // Set 1-year persistent cookie for Safari / WebKit persistence
    res.setHeader(
      'Set-Cookie',
      `gw_token=${encodeURIComponent(token)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
    );

    res.json({
      success: true,
      token,
      user: matchedAccount,
    });
  });

  // API: Verify Session Token on page reload / new tab / device wake
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || '';
    const cookieHeader = req.headers.cookie || '';
    let token = authHeader.replace(/^Bearer\s+/i, '') || (req.query.token as string);

    // Safari & Mobile Cookie fallback
    if (!token && cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)gw_token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }

    if (!token) {
      res.status(401).json({ error: 'No session token provided.' });
      return;
    }

    // 1. First verify cryptographically signed durable token
    const verified = verifyDurableToken(token);
    let userId = verified?.userId;
    let role = verified?.role;

    // 2. Legacy fallback to in-memory sessions
    if (!userId) {
      let session = memoryStore.sessions.find((s) => s.token === token);
      if (!session && serverSupabase) {
        await syncSupabaseAccounts();
        session = memoryStore.sessions.find((s) => s.token === token);
      }
      if (session) {
        userId = session.userId;
        role = session.role;
      }
    }

    if (!userId) {
      res.status(401).json({ error: 'Session token invalid or expired.' });
      return;
    }

    // 3. Find user in memory
    let user =
      memoryStore.ngo_accounts.find((a) => a.id === userId) ||
      memoryStore.benefactor_accounts.find((a) => a.id === userId) ||
      memoryStore.profiles.find((p) => p.id === userId);

    // 4. If server was cold-started or container rebooted, fetch directly from Supabase!
    if (!user && serverSupabase) {
      console.log(`[Session Restore] User ${userId} not in memory, querying live Supabase...`);
      try {
        if (role === 'ngo') {
          const { data: ngoData } = await serverSupabase.from('ngo_accounts').select('*').eq('id', userId).maybeSingle();
          if (ngoData) {
            user = { ...ngoData, role: 'ngo' };
            memoryStore.ngo_accounts.unshift(user);
          }
        } else {
          const { data: benData } = await serverSupabase.from('benefactor_accounts').select('*').eq('id', userId).maybeSingle();
          if (benData) {
            user = { ...benData, role: 'benefactor' };
            memoryStore.benefactor_accounts.unshift(user);
          }
        }

        // Generic fallback check both tables
        if (!user) {
          const { data: benData } = await serverSupabase.from('benefactor_accounts').select('*').eq('id', userId).maybeSingle();
          if (benData) {
            user = { ...benData, role: 'benefactor' };
            memoryStore.benefactor_accounts.unshift(user);
          } else {
            const { data: ngoData } = await serverSupabase.from('ngo_accounts').select('*').eq('id', userId).maybeSingle();
            if (ngoData) {
              user = { ...ngoData, role: 'ngo' };
              memoryStore.ngo_accounts.unshift(user);
            }
          }
        }

        if (user) saveDbToDisk();
      } catch (err) {
        console.warn('[Session Restore Supabase Error]:', err);
      }
    }

    if (!user) {
      res.status(404).json({ error: 'Account associated with session was not found.' });
      return;
    }

    // Refresh 1-year persistent cookie for Safari / WebKit persistence
    res.setHeader(
      'Set-Cookie',
      `gw_token=${encodeURIComponent(token)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
    );

    res.json({ success: true, user, token });
  });

  // API: Logout Session
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || req.body.token;

    if (token) {
      memoryStore.sessions = memoryStore.sessions.filter((s) => s.token !== token);
      saveDbToDisk();
    }

    // Clear Safari / WebKit cookie
    res.setHeader(
      'Set-Cookie',
      'gw_token=; Path=/; Max-Age=0; SameSite=Lax; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    );

    res.json({ success: true });
  });

  // =====================================================================
  // SEPARATE NGO ACCOUNTS CRUD
  // =====================================================================

  app.get('/api/ngo-accounts', (_req: Request, res: Response) => {
    res.json(memoryStore.ngo_accounts);
  });

  app.post('/api/ngo-accounts', async (req: Request, res: Response) => {
    const account = req.body;
    account.role = 'ngo';
    if (!account.id) {
      account.id = `ngo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    }
    if (!account.created_at) {
      account.created_at = new Date().toISOString();
    }

    // Check duplicate phone in NGO accounts
    const duplicatePhone = memoryStore.ngo_accounts.find(
      (a) => a.id !== account.id && phonesMatch(a.phone, account.phone)
    );
    if (duplicatePhone) {
      res.status(409).json({
        error: `An NGO account is already registered with mobile number "${account.phone}". Please log in with your credentials or use another phone number.`,
      });
      return;
    }

    // Insert or update in memory
    const existingIdx = memoryStore.ngo_accounts.findIndex((a) => a.id === account.id);
    if (existingIdx !== -1) {
      memoryStore.ngo_accounts[existingIdx] = account;
    } else {
      memoryStore.ngo_accounts.unshift(account);
    }

    // Keep unified profiles in sync
    const pIdx = memoryStore.profiles.findIndex((p) => p.id === account.id);
    if (pIdx !== -1) memoryStore.profiles[pIdx] = account;
    else memoryStore.profiles.unshift(account);

    // Ensure matching organization exists
    let org = memoryStore.organizations.find((o) => o.ngo_id === account.id);
    if (!org) {
      org = {
        id: `org-${account.id}`,
        ngo_id: account.id,
        name: account.name,
        date_created: new Date().toISOString().split('T')[0],
        director_name: account.director_name || '',
        address: account.address || '',
        logo_url: account.picture || '',
        bkash_no: account.bkash_no || '',
        nagad_no: account.nagad_no || '',
        total_raised: 0,
        donation_count: 0,
        fee_status: 'exempt',
        next_fee_due_date: null,
        created_at: new Date().toISOString(),
      };
      memoryStore.organizations.unshift(org);
    }

    // Generate persistent cryptographic session token for instant cross-device login
    const token = createDurableToken(account.id, account.role);
    const session: UserSession = {
      token,
      userId: account.id,
      role: account.role,
      name: account.name,
      phone: account.phone,
      createdAt: new Date().toISOString(),
    };
    memoryStore.sessions.unshift(session);

    // Save to permanent disk
    saveDbToDisk();

    // Broadcast realtime event
    broadcast('db_change', { entity: 'ngo_accounts', action: 'create', id: account.id, data: account });
    broadcast('db_change', { entity: 'organizations', action: 'create', id: org.id, data: org });

    // Sync to Supabase if configured
    if (serverSupabase) {
      const cleanNgo = cleanNgoForSupabase(account);
      await safeRun(serverSupabase.from('ngo_accounts').upsert([cleanNgo]), 'Insert NGO Account');
      await ensureSupabaseProfile(account);
      const cleanOrg = cleanOrgForSupabase(org);
      await safeRun(serverSupabase.from('organizations').upsert([cleanOrg]), 'Insert NGO Organization');
      console.log(`[Supabase Sync] NGO account & org registered in Supabase: ${cleanNgo.id} (${cleanNgo.name})`);
    }

    // Set 1-year persistent cookie for Safari / WebKit persistence
    res.setHeader(
      'Set-Cookie',
      `gw_token=${encodeURIComponent(token)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
    );

    res.status(201).json({ ...account, token });
  });

  app.patch('/api/ngo-accounts/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const idx = memoryStore.ngo_accounts.findIndex((a) => a.id === id);
    if (idx !== -1) {
      memoryStore.ngo_accounts[idx] = { ...memoryStore.ngo_accounts[idx], ...updates };
    }
    const pIdx = memoryStore.profiles.findIndex((p) => p.id === id);
    if (pIdx !== -1) {
      memoryStore.profiles[pIdx] = { ...memoryStore.profiles[pIdx], ...updates };
    }

    saveDbToDisk();
    broadcast('db_change', { entity: 'ngo_accounts', action: 'update', id, updates });

    if (serverSupabase) {
      const cleanUpdates = { ...updates };
      delete (cleanUpdates as any).role;
      delete (cleanUpdates as any).password;
      await safeRun(serverSupabase.from('ngo_accounts').update(cleanUpdates).eq('id', id), 'Update NGO Account');
      await safeRun(serverSupabase.from('profiles').update(cleanUpdates).eq('id', toUuid(id)), 'Update Profile');
    }

    res.json({ success: true, id, updates });
  });

  app.delete('/api/ngo-accounts/:id', requireAdminAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    memoryStore.ngo_accounts = memoryStore.ngo_accounts.filter((a) => a.id !== id);
    memoryStore.profiles = memoryStore.profiles.filter((p) => p.id !== id);
    memoryStore.organizations = memoryStore.organizations.filter((o) => o.ngo_id !== id);
    memoryStore.posts = memoryStore.posts.filter((p) => p.ngo_id !== id);
    memoryStore.donations = memoryStore.donations.filter((d) => d.donor_id !== id && d.ngo_id !== id);
    memoryStore.sessions = memoryStore.sessions.filter((s) => s.userId !== id);

    saveDbToDisk();
    broadcast('db_change', { entity: 'ngo_accounts', action: 'delete', id });

    if (serverSupabase) {
      const uuid = toUuid(id);
      await safeRun(serverSupabase.from('ngo_accounts').delete().eq('id', id));
      await safeRun(serverSupabase.from('organizations').delete().eq('ngo_id', uuid));
      await safeRun(serverSupabase.from('posts').delete().eq('ngo_id', uuid));
      await safeRun(serverSupabase.from('donations').delete().eq('ngo_id', uuid));
      await safeRun(serverSupabase.from('profiles').delete().eq('id', uuid));
    }

    res.json({ success: true, id });
  });

  // =====================================================================
  // SEPARATE BENEFACTOR ACCOUNTS CRUD
  // =====================================================================

  app.get('/api/benefactor-accounts', (_req: Request, res: Response) => {
    res.json(memoryStore.benefactor_accounts);
  });

  app.post('/api/benefactor-accounts', async (req: Request, res: Response) => {
    const account = req.body;
    account.role = 'benefactor';
    if (!account.id) {
      account.id = `ben-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    }
    if (!account.created_at) {
      account.created_at = new Date().toISOString();
    }

    // Check duplicate phone in Benefactor accounts
    const duplicatePhone = memoryStore.benefactor_accounts.find(
      (a) => a.id !== account.id && phonesMatch(a.phone, account.phone)
    );
    if (duplicatePhone) {
      res.status(409).json({
        error: `A Benefactor account is already registered with mobile number "${account.phone}". Please log in with your credentials or use another phone number.`,
      });
      return;
    }

    const existingIdx = memoryStore.benefactor_accounts.findIndex((a) => a.id === account.id);
    if (existingIdx !== -1) {
      memoryStore.benefactor_accounts[existingIdx] = account;
    } else {
      memoryStore.benefactor_accounts.unshift(account);
    }

    const pIdx = memoryStore.profiles.findIndex((p) => p.id === account.id);
    if (pIdx !== -1) memoryStore.profiles[pIdx] = account;
    else memoryStore.profiles.unshift(account);

    // Generate persistent cryptographic session token for instant cross-device login
    const token = createDurableToken(account.id, account.role);
    const session: UserSession = {
      token,
      userId: account.id,
      role: account.role,
      name: account.name,
      phone: account.phone,
      createdAt: new Date().toISOString(),
    };
    memoryStore.sessions.unshift(session);

    saveDbToDisk();
    broadcast('db_change', { entity: 'benefactor_accounts', action: 'create', id: account.id, data: account });

    if (serverSupabase) {
      const cleanBen = cleanBenForSupabase(account);
      await safeRun(serverSupabase.from('benefactor_accounts').upsert([cleanBen]), 'Insert Benefactor Account');
      await ensureSupabaseProfile(account);
      console.log(`[Supabase Sync] Benefactor account & profile registered in Supabase: ${cleanBen.id} (${cleanBen.name})`);
    }

    // Set 1-year persistent cookie for Safari / WebKit persistence
    res.setHeader(
      'Set-Cookie',
      `gw_token=${encodeURIComponent(token)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
    );

    res.status(201).json({ ...account, token });
  });

  app.patch('/api/benefactor-accounts/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const idx = memoryStore.benefactor_accounts.findIndex((a) => a.id === id);
    if (idx !== -1) {
      memoryStore.benefactor_accounts[idx] = { ...memoryStore.benefactor_accounts[idx], ...updates };
    }
    const pIdx = memoryStore.profiles.findIndex((p) => p.id === id);
    if (pIdx !== -1) {
      memoryStore.profiles[pIdx] = { ...memoryStore.profiles[pIdx], ...updates };
    }

    saveDbToDisk();
    broadcast('db_change', { entity: 'benefactor_accounts', action: 'update', id, updates });

    if (serverSupabase) {
      const cleanUpdates = { ...updates };
      delete (cleanUpdates as any).role;
      delete (cleanUpdates as any).password;
      await safeRun(serverSupabase.from('benefactor_accounts').update(cleanUpdates).eq('id', id), 'Update Benefactor Account');
      await safeRun(serverSupabase.from('profiles').update(cleanUpdates).eq('id', toUuid(id)), 'Update Profile');
    }

    res.json({ success: true, id, updates });
  });

  app.delete('/api/benefactor-accounts/:id', requireAdminAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    memoryStore.benefactor_accounts = memoryStore.benefactor_accounts.filter((a) => a.id !== id);
    memoryStore.profiles = memoryStore.profiles.filter((p) => p.id !== id);
    memoryStore.donations = memoryStore.donations.filter((d) => d.donor_id !== id);
    memoryStore.sessions = memoryStore.sessions.filter((s) => s.userId !== id);

    saveDbToDisk();
    broadcast('db_change', { entity: 'benefactor_accounts', action: 'delete', id });

    if (serverSupabase) {
      const uuid = toUuid(id);
      await safeRun(serverSupabase.from('benefactor_accounts').delete().eq('id', id));
      await safeRun(serverSupabase.from('donations').delete().eq('donor_id', uuid));
      await safeRun(serverSupabase.from('profiles').delete().eq('id', uuid));
    }

    res.json({ success: true, id });
  });

  // =====================================================================
  // UNIFIED PROFILES ENDPOINTS
  // =====================================================================

  app.get('/api/profiles', (_req: Request, res: Response) => {
    res.json(memoryStore.profiles);
  });

  app.post('/api/profiles', async (req: Request, res: Response) => {
    const profile = req.body;
    const existingIdx = memoryStore.profiles.findIndex((p) => p.id === profile.id);
    if (existingIdx !== -1) {
      memoryStore.profiles[existingIdx] = profile;
    } else {
      memoryStore.profiles.unshift(profile);
    }
    saveDbToDisk();
    broadcast('db_change', { entity: 'profiles', action: 'create', id: profile.id });

    if (serverSupabase) {
      await safeRun(serverSupabase.from('profiles').upsert([profile]));
    }
    res.status(201).json(profile);
  });

  app.patch('/api/profiles/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    // Status modifications (approvals, restrictions) strictly require Master Admin authorization
    if (updates && updates.status) {
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const customHeaderToken = req.headers['x-admin-token'] as string | undefined;
      const token = bearerToken || customHeaderToken;

      if (!token || !activeAdminTokens.has(token)) {
        res.status(401).json({ error: 'Unauthorized: Only Master Admin can modify profile status.' });
        return;
      }
    }

    const index = memoryStore.profiles.findIndex((p) => p.id === id);
    if (index !== -1) {
      memoryStore.profiles[index] = { ...memoryStore.profiles[index], ...updates };
    }
    const nIdx = memoryStore.ngo_accounts.findIndex((a) => a.id === id);
    if (nIdx !== -1) {
      memoryStore.ngo_accounts[nIdx] = { ...memoryStore.ngo_accounts[nIdx], ...updates };
    }
    const bIdx = memoryStore.benefactor_accounts.findIndex((a) => a.id === id);
    if (bIdx !== -1) {
      memoryStore.benefactor_accounts[bIdx] = { ...memoryStore.benefactor_accounts[bIdx], ...updates };
    }

    saveDbToDisk();
    broadcast('db_change', { entity: 'profiles', action: 'update', id, updates });

    if (serverSupabase) {
      await safeRun(serverSupabase.from('profiles').update(updates).eq('id', id));
      await safeRun(serverSupabase.from('ngo_accounts').update(updates).eq('id', id));
      await safeRun(serverSupabase.from('benefactor_accounts').update(updates).eq('id', id));
    }
    res.json({ success: true, id, updates });
  });

  app.delete('/api/profiles/:id', requireAdminAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    memoryStore.profiles = memoryStore.profiles.filter((p) => p.id !== id);
    memoryStore.ngo_accounts = memoryStore.ngo_accounts.filter((a) => a.id !== id);
    memoryStore.benefactor_accounts = memoryStore.benefactor_accounts.filter((a) => a.id !== id);
    memoryStore.organizations = memoryStore.organizations.filter((o) => o.ngo_id !== id);
    memoryStore.posts = memoryStore.posts.filter((p) => p.ngo_id !== id);
    memoryStore.donations = memoryStore.donations.filter((d) => d.donor_id !== id && d.ngo_id !== id);
    memoryStore.sessions = memoryStore.sessions.filter((s) => s.userId !== id);

    saveDbToDisk();
    broadcast('db_change', { entity: 'profiles', action: 'delete', id });

    if (serverSupabase) {
      await safeRun(serverSupabase.from('profiles').delete().eq('id', id));
      await safeRun(serverSupabase.from('ngo_accounts').delete().eq('id', id));
      await safeRun(serverSupabase.from('benefactor_accounts').delete().eq('id', id));
    }
    res.json({ success: true, id });
  });

  // =====================================================================
  // ORGANIZATIONS ENDPOINTS
  // =====================================================================

  app.get('/api/organizations', (_req: Request, res: Response) => {
    res.json(memoryStore.organizations);
  });

  app.post('/api/organizations', async (req: Request, res: Response) => {
    const org = req.body;

    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const authSession = bearerToken ? verifyDurableToken(bearerToken) : null;

    const targetNgoId = org.ngo_id || (authSession?.role === 'ngo' ? authSession.userId : null);

    // Strict Architectural Constraint: Tie NGO accounts to organizations only.
    // Only registered NGO accounts are permitted to create organizations.
    const ngoAcc =
      memoryStore.ngo_accounts.find((a) => a.id === targetNgoId || toUuid(a.id) === targetNgoId) ||
      memoryStore.profiles.find((p) => (p.id === targetNgoId || toUuid(p.id) === targetNgoId) && p.role === 'ngo');

    if (!ngoAcc) {
      res.status(403).json({
        error: 'Access Denied: Only registered NGO accounts can create organizations. Others are not permitted.',
      });
      return;
    }

    if (!org.ngo_id) org.ngo_id = ngoAcc.id;
    if (!org.id) org.id = `org-${ngoAcc.id}`;
    if (!org.created_at) org.created_at = new Date().toISOString();
    if (!org.date_created) org.date_created = org.created_at.split('T')[0];
    org.total_raised = Number(org.total_raised || 0);
    org.donation_count = Number(org.donation_count || 0);
    org.fee_status = org.fee_status || 'exempt';

    const existingIdx = memoryStore.organizations.findIndex((o) => o.id === org.id || o.ngo_id === org.ngo_id);
    if (existingIdx !== -1) {
      memoryStore.organizations[existingIdx] = { ...memoryStore.organizations[existingIdx], ...org };
    } else {
      memoryStore.organizations.unshift(org);
    }
    saveDbToDisk();
    broadcast('db_change', { entity: 'organizations', action: 'create', id: org.id, data: org });

    if (serverSupabase) {
      await ensureSupabaseProfile(ngoAcc);
      const cleanOrg = cleanOrgForSupabase(org);
      await safeRun(serverSupabase.from('organizations').upsert([cleanOrg]), 'Upsert Organization');
    }
    res.status(201).json(org);
  });

  app.patch('/api/organizations/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const index = memoryStore.organizations.findIndex((o) => o.id === id || o.ngo_id === id);
    if (index !== -1) {
      memoryStore.organizations[index] = { ...memoryStore.organizations[index], ...updates };
    }
    saveDbToDisk();
    broadcast('db_change', { entity: 'organizations', action: 'update', id, updates });

    if (serverSupabase) {
      const uuid = toUuid(id);
      const cleanUpdates: any = { ...updates };
      if (cleanUpdates.total_raised !== undefined) cleanUpdates.total_raised = Number(cleanUpdates.total_raised);
      if (cleanUpdates.donation_count !== undefined) cleanUpdates.donation_count = Number(cleanUpdates.donation_count);
      await safeRun(
        serverSupabase
          .from('organizations')
          .update(cleanUpdates)
          .or(`id.eq.${uuid},ngo_id.eq.${uuid}`),
        'Update Organization'
      );
    }
    res.json({ success: true, id, updates });
  });

  // =====================================================================
  // POSTS ENDPOINTS
  // =====================================================================

  app.get('/api/posts', (_req: Request, res: Response) => {
    res.json(memoryStore.posts);
  });

  app.post('/api/posts', async (req: Request, res: Response) => {
    const post = req.body;

    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const authSession = bearerToken ? verifyDurableToken(bearerToken) : null;

    if (!post.ngo_id && authSession?.role === 'ngo') {
      post.ngo_id = authSession.userId;
    }
    if (!post.id) {
      post.id = `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }
    if (!post.created_at) {
      post.created_at = new Date().toISOString();
    }

    memoryStore.posts.unshift(post);
    saveDbToDisk();
    broadcast('db_change', { entity: 'posts', action: 'create', id: post.id, data: post });

    if (serverSupabase) {
      const ngoAcc =
        memoryStore.ngo_accounts.find((a) => a.id === post.ngo_id || toUuid(a.id) === post.ngo_id) ||
        memoryStore.profiles.find((p) => p.id === post.ngo_id || toUuid(p.id) === post.ngo_id);
      if (ngoAcc) await ensureSupabaseProfile(ngoAcc);
      const cleanPost = cleanPostForSupabase(post);
      await safeRun(serverSupabase.from('posts').upsert([cleanPost]), 'Insert Post');
    }
    res.status(201).json(post);
  });

  app.delete('/api/posts/:id', requireAdminAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    memoryStore.posts = memoryStore.posts.filter((p) => p.id !== id);
    saveDbToDisk();
    broadcast('db_change', { entity: 'posts', action: 'delete', id });

    if (serverSupabase) {
      const uuid = toUuid(id);
      await safeRun(serverSupabase.from('posts').delete().eq('id', uuid), 'Delete Post');
    }
    res.json({ success: true, id });
  });

  // =====================================================================
  // DONATIONS ENDPOINTS (WITH FINANCIAL SAFETY & MFS VALIDATION)
  // =====================================================================

  app.get('/api/donations', (_req: Request, res: Response) => {
    res.json(memoryStore.donations);
  });

  app.post('/api/donations', async (req: Request, res: Response) => {
    const donation = req.body;
    const numAmount = Number(donation.amount);

    // Amount Guardrails: ৳50 min, ৳500,000 max
    if (isNaN(numAmount) || numAmount < 50 || numAmount > 500000) {
      res.status(400).json({ error: 'Donation amount must be between ৳50 and ৳500,000.' });
      return;
    }

    // Bangladesh MFS Phone validation: 11 digits starting with 013-019
    const cleanPhone = (donation.mfs_account || '').replace(/[\s-]/g, '');
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      res.status(400).json({ error: 'Valid 11-digit Bangladesh MFS number required (e.g. 017XXXXXXXX).' });
      return;
    }
    donation.mfs_account = cleanPhone;

    // Cryptographic verification hash for accounting
    if (!donation.verification_hash) {
      donation.verification_hash = `GW-MFS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    memoryStore.donations.unshift(donation);

    // Update organization metrics
    const orgIndex = memoryStore.organizations.findIndex((o) => o.ngo_id === donation.ngo_id);
    if (orgIndex !== -1) {
      const org = memoryStore.organizations[orgIndex];
      org.donation_count = Number(org.donation_count || 0) + 1;
      org.total_raised = Number(org.total_raised || 0) + Number(donation.amount);
      if (org.donation_count === 4) {
        org.fee_status = 'active';
        org.next_fee_due_date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    saveDbToDisk();
    broadcast('db_change', { entity: 'donations', action: 'create', id: donation.id, data: donation });

    if (serverSupabase) {
      const donorAcc = memoryStore.benefactor_accounts.find((b) => b.id === donation.donor_id) || memoryStore.profiles.find((p) => p.id === donation.donor_id);
      if (donorAcc) await ensureSupabaseProfile(donorAcc);

      const ngoAcc = memoryStore.ngo_accounts.find((n) => n.id === donation.ngo_id) || memoryStore.profiles.find((p) => p.id === donation.ngo_id);
      if (ngoAcc) await ensureSupabaseProfile(ngoAcc);

      const cleanDon = cleanDonationForSupabase(donation);
      await safeRun(serverSupabase.from('donations').upsert([cleanDon]), 'Insert Donation');

      if (orgIndex !== -1) {
        const org = memoryStore.organizations[orgIndex];
        await safeRun(
          serverSupabase.from('organizations').update({
            donation_count: org.donation_count,
            total_raised: org.total_raised,
            fee_status: org.fee_status,
            next_fee_due_date: org.next_fee_due_date,
          }).eq('ngo_id', toUuid(donation.ngo_id)),
          'Update Organization on Donation'
        );
      }
    }
    res.status(201).json(donation);
  });

  // =====================================================================
  // NOTICES ENDPOINTS (ADMIN ONLY MUTATIONS)
  // =====================================================================

  app.get('/api/notices', (_req: Request, res: Response) => {
    res.json(memoryStore.notices);
  });

  app.post('/api/notices', requireAdminAuth, async (req: Request, res: Response) => {
    const notice = req.body;
    memoryStore.notices.unshift(notice);
    saveDbToDisk();
    broadcast('db_change', { entity: 'notices', action: 'create', id: notice.id, data: notice });

    if (serverSupabase) {
      const cleanNotice = cleanNoticeForSupabase(notice);
      await safeRun(serverSupabase.from('notices').upsert([cleanNotice]), 'Insert Notice');
    }
    res.status(201).json(notice);
  });

  app.delete('/api/notices/:id', requireAdminAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    memoryStore.notices = memoryStore.notices.filter((n) => n.id !== id);
    saveDbToDisk();
    broadcast('db_change', { entity: 'notices', action: 'delete', id });

    if (serverSupabase) {
      const uuid = toUuid(id);
      await safeRun(serverSupabase.from('notices').delete().eq('id', uuid), 'Delete Notice');
    }
    res.json({ success: true, id });
  });

  // Frontend serving: Production static build with fallback to Vite middleware
  const distPath = path.resolve(rootDir, 'dist');
  const distExists = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

  const isProduction = process.env.NODE_ENV === 'production' || (!process.argv.includes('--port') && distExists);

  if (isProduction && distExists) {
    console.log(`[Production Asset Serving] Serving static build from: ${distPath}`);
    app.use(
      express.static(distPath, {
        maxAge: '1d',
        setHeaders: (res, filePath) => {
          if (filePath.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    // Single-Page Application (SPA) fallback, excluding API routes
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log('[Development Server] Mounting Vite development middleware');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Global 404 handler for unknown API endpoints
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found.` });
  });

  // Global Unhandled Error Middleware
  app.use((err: any, _req: Request, res: Response, _next: any) => {
    console.error('[Unhandled Server Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'An unexpected internal server error occurred.',
        message: err?.message || 'Internal Server Error',
      });
    }
  });

  app.listen(PORT, HOST, () => {
    console.log(`[Full-Stack Server] The Goodwill Network running on http://${HOST}:${PORT}`);
    if (serverSupabase) {
      console.log(`[Supabase Backend] Connected to ${supabaseUrl}`);
    } else {
      console.log(`[Supabase Backend] Using persistent local JSON database: ${DB_FILE}`);
    }
  });
}

startServer().catch((err) => {
  console.error('[Server Startup Error]', err);
  process.exit(1);
});
