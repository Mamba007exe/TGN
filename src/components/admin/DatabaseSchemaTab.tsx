import React, { useState } from 'react';
import { Database, Wifi, WifiOff, RefreshCw, Server, Copy, Check, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Profile, Organization, Post, Donation } from '../../types';
import { SUPABASE_SQL_SCHEMA } from '../../lib/supabaseSql';
import { dataStore } from '../../lib/supabaseClient';

interface DatabaseSchemaTabProps {
  supabaseStatus: any;
  isCheckingSupabase: boolean;
  onCheckSupabase: () => void;
  copiedSchema: boolean;
  onCopySchema: () => void;
  profiles: Profile[];
  organizations: Organization[];
  posts: Post[];
  donations: Donation[];
}

export const DatabaseSchemaTab: React.FC<DatabaseSchemaTabProps> = ({
  supabaseStatus,
  isCheckingSupabase,
  onCheckSupabase,
  copiedSchema,
  onCopySchema,
  profiles,
  organizations,
  posts,
  donations,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncAllAccounts = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await dataStore.syncAllWithSupabase();
      if (res.success) {
        setSyncFeedback(res.message);
        onCheckSupabase();
      } else {
        setSyncFeedback(`Sync failed: ${res.message}`);
      }
    } catch (err: any) {
      setSyncFeedback(`Sync error: ${err?.message || 'Unknown'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Live Connection Diagnostics Panel */}
      <div className="bg-white border-2 border-[#004182] p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9ECEF] pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                supabaseStatus?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {supabaseStatus?.connected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm uppercase text-[#212529]">
                  Supabase Connection Status:
                </h4>
                <span
                  className={`px-2 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                    supabaseStatus?.connected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {supabaseStatus?.connected ? 'Connected to Project' : 'Connecting / Checking...'}
                </span>
              </div>
              <p className="text-xs font-mono text-[#6C757D] mt-0.5">
                Endpoint: {supabaseStatus?.url || 'https://cxwxewggxwssvrdcrxfm.supabase.co'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncAllAccounts}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-[#198754] hover:bg-[#157347] text-white text-xs font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Tables...' : 'Sync Accounts to Supabase'}</span>
            </button>
            <button
              type="button"
              onClick={onCheckSupabase}
              disabled={isCheckingSupabase}
              className="px-3 py-1.5 bg-[#004182] hover:bg-[#003366] text-white text-xs font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingSupabase ? 'animate-spin' : ''}`} />
              <span>{isCheckingSupabase ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Status Message Details */}
        <div className="bg-[#F8F9FA] p-3 border border-[#CED4DA] mb-3 text-xs">
          <div className="font-bold text-[#004182] flex items-center gap-1.5 mb-1">
            <Server className="w-4 h-4" />
            <span>Live Diagnostic Result:</span>
          </div>
          <p className="text-[#212529] font-medium leading-relaxed">
            {supabaseStatus?.statusMessage || 'Querying live Supabase project status...'}
          </p>
          {supabaseStatus?.connected && !supabaseStatus?.schemaReady && (
            <div className="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-900 p-2 leading-relaxed">
              <strong>Next Step:</strong> Click <strong>"Copy SQL Schema"</strong> below, go to your <strong>Supabase Dashboard &gt; SQL Editor</strong>, paste, and run.
            </div>
          )}
        </div>

        {/* Individual Table Statuses */}
        {supabaseStatus?.tables && (
          <div>
            <div className="text-[11px] font-bold uppercase text-[#6C757D] mb-1.5">
              PostgreSQL Tables Readiness Checklist:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(supabaseStatus.tables).map(([table, ready]) => (
                <div
                  key={table}
                  className={`p-2 border text-xs flex items-center justify-between ${
                    ready
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="font-mono text-[11px] font-semibold">{table}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 ${
                      ready ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-800'
                    }`}
                  >
                    {ready ? 'Active' : 'Pending SQL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#E9ECEF] p-4 border border-[#CED4DA]">
        <div>
          <h3 className="font-extrabold text-sm uppercase text-[#004182] flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>PostgreSQL Database Architecture & Ledger</span>
          </h3>
          <p className="text-xs text-[#6C757D] mt-0.5">
            Synchronized with Express API backend routes and direct Supabase client SDK.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCopySchema}
            className="px-3 py-1.5 bg-[#198754] hover:bg-[#146c43] text-white text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5"
          >
            {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSchema ? 'SQL Copied!' : 'Copy SQL Schema'}</span>
          </button>
        </div>
      </div>

      {/* Current Table Synchronized Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-white border border-[#CED4DA] text-center">
          <div className="text-[10px] uppercase font-bold text-[#6C757D]">NGO Accounts Table</div>
          <div className="text-lg font-black text-[#004182]">
            {profiles.filter((p) => p.role === 'ngo').length}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold">Separate DB Store</div>
        </div>
        <div className="p-3 bg-white border border-[#CED4DA] text-center">
          <div className="text-[10px] uppercase font-bold text-[#6C757D]">Benefactor Accounts</div>
          <div className="text-lg font-black text-[#004182]">
            {profiles.filter((p) => p.role === 'benefactor').length}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold">Separate DB Store</div>
        </div>
        <div className="p-3 bg-white border border-[#CED4DA] text-center">
          <div className="text-[10px] uppercase font-bold text-[#6C757D]">Organizations Table</div>
          <div className="text-lg font-black text-[#004182]">{organizations.length}</div>
          <div className="text-[10px] text-emerald-600 font-bold">Sync Active</div>
        </div>
        <div className="p-3 bg-white border border-[#CED4DA] text-center">
          <div className="text-[10px] uppercase font-bold text-[#6C757D]">Donations Ledger</div>
          <div className="text-lg font-black text-[#004182]">{donations.length}</div>
          <div className="text-[10px] text-emerald-600 font-bold">Sync Active</div>
        </div>
        <div className="p-3 bg-white border border-[#CED4DA] text-center">
          <div className="text-[10px] uppercase font-bold text-[#6C757D]">Field Posts Table</div>
          <div className="text-lg font-black text-[#004182]">{posts.length}</div>
          <div className="text-[10px] text-emerald-600 font-bold">Sync Active</div>
        </div>
      </div>

      {/* Automation Details */}
      <div className="p-3 bg-[#E9ECEF] border border-[#CED4DA] text-xs space-y-1">
        <div className="font-bold text-[#004182] uppercase text-[11px]">Database Features & Business Logic Rules:</div>
        <ul className="list-disc list-inside text-[#6C757D] text-[11px] space-y-0.5">
          <li>Automated Postgres trigger <code className="font-mono bg-white px-1">after_donation_insert()</code> increments donation counts & total raised amounts.</li>
          <li>Bi-weekly fee schedule (৳250/14 days) automatically triggers on the 4th donation.</li>
          <li>Row Level Security (RLS) protects writes while allowing verified public read feeds.</li>
          <li>Dual-stack synchronization keeps the UI responsive even during network fluctuations.</li>
        </ul>
      </div>

      {/* SQL Script Viewer */}
      <div className="space-y-1.5">
        <div className="text-xs font-bold uppercase text-[#6C757D]">
          Complete PostgreSQL Schema (Run in Supabase SQL Editor):
        </div>
        <pre className="p-3 bg-[#1e293b] text-emerald-400 font-mono text-[11px] h-60 overflow-y-auto border border-slate-700 leading-relaxed select-all">
          {SUPABASE_SQL_SCHEMA}
        </pre>
      </div>
    </div>
  );
};
