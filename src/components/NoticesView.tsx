import React from 'react';
import { Bell, ShieldCheck, Calendar, ShieldAlert, PlusCircle } from 'lucide-react';
import { Notice, Profile } from '../types';

interface NoticesViewProps {
  notices: Notice[];
  currentUser: Profile | null;
  onOpenAdmin: () => void;
}

export const NoticesView: React.FC<NoticesViewProps> = ({
  notices,
  currentUser,
  onOpenAdmin,
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-[#CED4DA] p-4 text-[#212529]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-base uppercase text-[#004182] tracking-wide flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#004182]" />
              <span>Official Platform Notices & Governance Directives</span>
            </h2>
            <p className="text-xs text-[#6C757D]">
              Platform announcements fetched from the <code className="font-mono bg-[#E9ECEF] px-1">notices</code> table, authored exclusively by the Platform Admin.
            </p>
          </div>

          {currentUser?.role === 'admin' ? (
            <button
              onClick={onOpenAdmin}
              className="bg-[#004182] text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-[#003366] cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Publish Notice (Admin)</span>
            </button>
          ) : (
            <span className="text-[11px] font-mono font-bold text-[#6C757D] bg-[#E9ECEF] px-2.5 py-1 border border-[#CED4DA]">
              Admin Verified Feed
            </span>
          )}
        </div>
      </div>

      {/* Notices List */}
      <div className="space-y-3">
        {notices.map((notice) => (
          <div
            key={notice.id}
            className="bg-white border border-[#CED4DA] p-5 text-[#212529] space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#CED4DA] pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#004182]" />
                <h3 className="font-extrabold text-sm sm:text-base text-[#004182]">
                  {notice.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6C757D] font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>Published: {new Date(notice.created_at).toLocaleDateString()}</span>
                <span className="px-1.5 py-0.2 bg-[#E9ECEF] text-[#212529] font-bold text-[10px] uppercase">
                  OFFICIAL
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#212529] leading-relaxed whitespace-pre-line pt-1">
              {notice.content}
            </p>

            <div className="pt-2 flex items-center justify-between text-[11px] text-[#6C757D] font-mono">
              <span className="flex items-center gap-1 text-[#004182] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FFC107]" />
                <span>Authorized by Governance Council</span>
              </span>
              <span>Notice ID: {notice.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
