import React, { useState, useEffect } from 'react';
import {
  Shield,
  Clock,
  DollarSign,
  FileText,
  UserX,
  CreditCard,
  Database,
} from 'lucide-react';
import { Profile, Organization, Post, Donation, Notice, FeeStatus } from '../types';
import { SUPABASE_SQL_SCHEMA } from '../lib/supabaseSql';
import { PendingQueueTab } from './admin/PendingQueueTab';
import { FeeAuditingTab } from './admin/FeeAuditingTab';
import { DonationLedgerTab } from './admin/DonationLedgerTab';
import { ModerationTab } from './admin/ModerationTab';
import { NoticesManagerTab } from './admin/NoticesManagerTab';
import { DatabaseSchemaTab } from './admin/DatabaseSchemaTab';

interface AdminDashboardProps {
  initialTab?: 'pending' | 'ledger' | 'fees' | 'moderation' | 'notices' | 'supabase';
  profiles: Profile[];
  organizations: Organization[];
  posts: Post[];
  donations: Donation[];
  notices: Notice[];
  onApproveNgo: (profileId: string) => void;
  onRejectNgo: (profileId: string) => void;
  onRestrictProfile: (profileId: string) => void;
  onUnrestrictProfile: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onDeletePost: (postId: string) => void;
  onCreateNotice: (title: string, content: string) => void;
  onDeleteNotice: (noticeId: string) => void;
  onToggleFeeStatus: (orgId: string, status: FeeStatus) => void;
  onCloseAdminView: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialTab = 'pending',
  profiles,
  organizations,
  posts,
  donations,
  notices,
  onApproveNgo,
  onRejectNgo,
  onRestrictProfile,
  onUnrestrictProfile,
  onDeleteProfile,
  onDeletePost,
  onCreateNotice,
  onDeleteNotice,
  onToggleFeeStatus,
  onCloseAdminView,
}) => {
  const [adminTab, setAdminTab] = useState<'pending' | 'ledger' | 'fees' | 'moderation' | 'notices' | 'supabase'>(initialTab);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setAdminTab(initialTab);
    }
  }, [initialTab]);

  const checkSupabaseConnection = async () => {
    setIsCheckingSupabase(true);
    try {
      const res = await fetch('/api/supabase/status');
      const data = await res.json();
      setSupabaseStatus(data);
    } catch (err: any) {
      setSupabaseStatus({
        configured: false,
        connected: false,
        error: err.message || 'Failed to query Supabase status endpoint',
      });
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  useEffect(() => {
    if (adminTab === 'supabase') {
      checkSupabaseConnection();
    }
  }, [adminTab]);

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  // Pending Queue: role = 'ngo' and status = 'pending'
  const pendingNgos = profiles.filter((p) => p.role === 'ngo' && p.status === 'pending');

  // Fee Monitoring: Organizations with fee_status = 'active' or 'unpaid'
  const feeMonitoredOrgs = organizations.filter(
    (o) => o.fee_status === 'active' || o.fee_status === 'unpaid'
  );

  return (
    <div className="bg-white border-2 border-[#CED4DA] p-0 mb-6 text-[#212529]">
      {/* Top Banner */}
      <div className="bg-[#212529] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-black">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#FFC107] text-[#212529] font-black flex items-center justify-center text-sm">
            ADM
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide uppercase">
              Platform Governance Center (Admin Console)
            </h2>
            <div className="text-[10px] text-slate-300 uppercase">
              Active Session: Master Governance Administrator • Real-Time Database Authority
            </div>
          </div>
        </div>

        <button
          onClick={onCloseAdminView}
          className="text-xs bg-[#495057] hover:bg-[#343a40] px-3.5 py-2 uppercase font-bold text-white border border-slate-600 cursor-pointer min-h-[44px] flex items-center justify-center touch-manipulation self-start sm:self-auto"
        >
          Close Admin Workspace
        </button>
      </div>

      {/* Admin Tabs Bar (Horizontally scrollable on mobile) */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-[#CED4DA] bg-[#F8F9FA] text-xs font-bold whitespace-nowrap">
        <button
          onClick={() => setAdminTab('pending')}
          className={`shrink-0 px-3.5 sm:px-4 py-3 min-h-[44px] flex items-center gap-1.5 uppercase tracking-wide cursor-pointer touch-manipulation ${
            adminTab === 'pending'
              ? 'bg-white text-[#004182] border-b-2 border-[#004182]'
              : 'text-[#6C757D] hover:text-[#212529]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending NGOs</span>
          {pendingNgos.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-[#dc3545] text-white text-[10px]">
              {pendingNgos.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('fees')}
          className={`shrink-0 px-3.5 sm:px-4 py-3 min-h-[44px] flex items-center gap-1.5 uppercase tracking-wide cursor-pointer touch-manipulation ${
            adminTab === 'fees'
              ? 'bg-white text-[#004182] border-b-2 border-[#004182]'
              : 'text-[#6C757D] hover:text-[#212529]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Fee Monitor (৳250/2-wk)</span>
          <span className="ml-1 px-1.5 py-0.2 bg-[#004182] text-white text-[10px]">
            {feeMonitoredOrgs.length}
          </span>
        </button>

        <button
          onClick={() => setAdminTab('ledger')}
          className={`shrink-0 px-3.5 sm:px-4 py-3 min-h-[44px] flex items-center gap-1.5 uppercase tracking-wide cursor-pointer touch-manipulation ${
            adminTab === 'ledger'
              ? 'bg-white text-[#004182] border-b-2 border-[#004182]'
              : 'text-[#6C757D] hover:text-[#212529]'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Donations Ledger</span>
          <span className="ml-1 px-1.5 py-0.2 bg-[#198754] text-white text-[10px]">
            {donations.length}
          </span>
        </button>

        <button
          onClick={() => setAdminTab('moderation')}
          className={`shrink-0 px-3.5 sm:px-4 py-3 min-h-[44px] flex items-center gap-1.5 uppercase tracking-wide cursor-pointer touch-manipulation ${
            adminTab === 'moderation'
              ? 'bg-white text-[#004182] border-b-2 border-[#004182]'
              : 'text-[#6C757D] hover:text-[#212529]'
          }`}
        >
          <UserX className="w-3.5 h-3.5" />
          <span>Account & Post Moderation</span>
        </button>

        <button
          onClick={() => setAdminTab('notices')}
          className={`shrink-0 px-3.5 sm:px-4 py-3 min-h-[44px] flex items-center gap-1.5 uppercase tracking-wide cursor-pointer touch-manipulation ${
            adminTab === 'notices'
              ? 'bg-white text-[#004182] border-b-2 border-[#004182]'
              : 'text-[#6C757D] hover:text-[#212529]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Notices Manager</span>
        </button>

        <button
          onClick={() => setAdminTab('supabase')}
          className={`shrink-0 px-3.5 sm:px-4 py-3 min-h-[44px] flex items-center gap-1.5 uppercase tracking-wide cursor-pointer touch-manipulation ${
            adminTab === 'supabase'
              ? 'bg-white text-[#004182] border-b-2 border-[#004182]'
              : 'text-[#6C757D] hover:text-[#212529]'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Database & Schema</span>
        </button>
      </div>

      {/* Admin Content Area */}
      <div className="p-5">
        {adminTab === 'pending' && (
          <PendingQueueTab
            pendingNgos={pendingNgos}
            organizations={organizations}
            onApproveNgo={onApproveNgo}
            onRejectNgo={onRejectNgo}
          />
        )}

        {adminTab === 'fees' && (
          <FeeAuditingTab
            organizations={organizations}
            onToggleFeeStatus={onToggleFeeStatus}
          />
        )}

        {adminTab === 'ledger' && (
          <DonationLedgerTab
            donations={donations}
            organizations={organizations}
            profiles={profiles}
          />
        )}

        {adminTab === 'moderation' && (
          <ModerationTab
            profiles={profiles}
            organizations={organizations}
            posts={posts}
            onRestrictProfile={onRestrictProfile}
            onUnrestrictProfile={onUnrestrictProfile}
            onDeleteProfile={onDeleteProfile}
            onDeletePost={onDeletePost}
          />
        )}

        {adminTab === 'notices' && (
          <NoticesManagerTab
            notices={notices}
            onCreateNotice={onCreateNotice}
            onDeleteNotice={onDeleteNotice}
          />
        )}

        {adminTab === 'supabase' && (
          <DatabaseSchemaTab
            supabaseStatus={supabaseStatus}
            isCheckingSupabase={isCheckingSupabase}
            onCheckSupabase={checkSupabaseConnection}
            copiedSchema={copiedSchema}
            onCopySchema={handleCopySchema}
            profiles={profiles}
            organizations={organizations}
            posts={posts}
            donations={donations}
          />
        )}
      </div>
    </div>
  );
};
