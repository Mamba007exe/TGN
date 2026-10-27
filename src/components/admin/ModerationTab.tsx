import React, { useState } from 'react';
import { Users, FileText } from 'lucide-react';
import { Profile, Organization, Post } from '../../types';

interface ModerationTabProps {
  profiles: Profile[];
  organizations: Organization[];
  posts: Post[];
  onRestrictProfile: (id: string) => void;
  onUnrestrictProfile: (id: string) => void;
  onDeleteProfile: (id: string) => void;
  onDeletePost: (id: string) => void;
}

export const ModerationTab: React.FC<ModerationTabProps> = ({
  profiles,
  posts,
  onRestrictProfile,
  onUnrestrictProfile,
  onDeleteProfile,
  onDeletePost,
}) => {
  const [profileRoleFilter, setProfileRoleFilter] = useState<'all' | 'ngo' | 'benefactor'>('all');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-extrabold text-sm uppercase text-[#004182]">
          Account & Post Moderation Center
        </h3>
        <p className="text-xs text-[#6C757D]">
          Delete any row in posts or profiles, or toggle status to 'restricted' (which immediately hides the profile and associated posts platform-wide while preserving audit logs).
        </p>
      </div>

      {/* Profiles Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h4 className="text-xs font-bold uppercase text-[#212529] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#004182]" />
            <span>Permanent Account Database Ledger ({profiles.length})</span>
          </h4>

          {/* Sub-Filter Tabs: All, NGO, Benefactor */}
          <div className="flex items-center gap-1 bg-[#E9ECEF] p-1 border border-[#CED4DA] text-xs">
            <button
              onClick={() => setProfileRoleFilter('all')}
              className={`px-2.5 py-1 font-bold text-[11px] uppercase cursor-pointer transition-colors ${
                profileRoleFilter === 'all'
                  ? 'bg-[#004182] text-white shadow-xs'
                  : 'text-[#6C757D] hover:text-[#212529]'
              }`}
            >
              All Accounts ({profiles.length})
            </button>
            <button
              onClick={() => setProfileRoleFilter('ngo')}
              className={`px-2.5 py-1 font-bold text-[11px] uppercase cursor-pointer transition-colors ${
                profileRoleFilter === 'ngo'
                  ? 'bg-[#004182] text-white shadow-xs'
                  : 'text-[#6C757D] hover:text-[#212529]'
              }`}
            >
              NGO Accounts ({profiles.filter((p) => p.role === 'ngo').length})
            </button>
            <button
              onClick={() => setProfileRoleFilter('benefactor')}
              className={`px-2.5 py-1 font-bold text-[11px] uppercase cursor-pointer transition-colors ${
                profileRoleFilter === 'benefactor'
                  ? 'bg-[#004182] text-white shadow-xs'
                  : 'text-[#6C757D] hover:text-[#212529]'
              }`}
            >
              Benefactor Accounts ({profiles.filter((p) => p.role === 'benefactor').length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-[#CED4DA]">
          <table className="w-full min-w-[700px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#E9ECEF] border-b border-[#CED4DA] text-[#6C757D] uppercase font-bold text-[10px]">
                <th className="p-2.5">Account / Entity</th>
                <th className="p-2.5">Database Table</th>
                <th className="p-2.5">Primary Phone</th>
                <th className="p-2.5">MFS Wallets (bKash / Nagad)</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Database Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CED4DA] bg-white">
              {profiles
                .filter((p) => profileRoleFilter === 'all' || p.role === profileRoleFilter)
                .map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#E9ECEF] border border-[#CED4DA] flex items-center justify-center shrink-0 overflow-hidden">
                          {p.picture ? (
                            <img src={p.picture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-4 h-4 text-[#6C757D]" />
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-[#212529]">{p.name}</div>
                          {p.director_name && (
                            <div className="text-[10px] text-[#6C757D]">
                              Director: <span className="text-[#212529] font-medium">{p.director_name}</span>
                            </div>
                          )}
                          {p.address && (
                            <div className="text-[10px] text-[#6C757D] truncate max-w-xs">
                              {p.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase ${
                          p.role === 'ngo'
                            ? 'bg-[#004182] text-white'
                            : p.role === 'benefactor'
                            ? 'bg-[#198754] text-white'
                            : 'bg-[#212529] text-white'
                        }`}
                      >
                        {p.role === 'ngo'
                          ? 'ngo_accounts'
                          : p.role === 'benefactor'
                          ? 'benefactor_accounts'
                          : 'system_admin'}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono font-bold text-[#212529]">{p.phone}</td>
                    <td className="p-2.5 font-mono text-[11px] text-[#6C757D]">
                      <div className="space-y-0.5">
                        {p.bkash_no && (
                          <div>
                            <span className="font-bold text-[#E2136E]">bKash:</span> {p.bkash_no}
                          </div>
                        )}
                        {p.nagad_no && (
                          <div>
                            <span className="font-bold text-[#F7941D]">Nagad:</span> {p.nagad_no}
                          </div>
                        )}
                        {!p.bkash_no && !p.nagad_no && <span className="italic text-[10px]">None</span>}
                      </div>
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          p.status === 'approved'
                            ? 'bg-[#FFC107] text-[#212529]'
                            : p.status === 'restricted'
                            ? 'bg-[#dc3545] text-white'
                            : p.status === 'pending'
                            ? 'bg-[#6C757D] text-white'
                            : 'bg-slate-200 text-[#212529]'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                      {p.role !== 'admin' && (
                        <>
                          {p.status === 'restricted' ? (
                            <button
                              onClick={() => onUnrestrictProfile(p.id)}
                              className="px-2 py-1 bg-[#198754] text-white text-[10px] font-bold uppercase hover:bg-[#146c43] cursor-pointer"
                            >
                              Unrestrict
                            </button>
                          ) : (
                            <button
                              onClick={() => onRestrictProfile(p.id)}
                              className="px-2 py-1 bg-[#dc3545] text-white text-[10px] font-bold uppercase hover:bg-[#b02a37] cursor-pointer"
                            >
                              Restrict
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Permanently delete account "${p.name}"? This will erase it forever from the persistent database.`
                                )
                              ) {
                                onDeleteProfile(p.id);
                              }
                            }}
                            className="px-2.5 py-1 bg-[#212529] text-white text-[10px] font-bold uppercase hover:bg-black cursor-pointer"
                            title="Permanently remove from database forever"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Posts Moderation */}
      <div>
        <h4 className="text-xs font-bold uppercase text-[#212529] mb-2 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#004182]" />
          <span>Live Posts Moderation ({posts.length})</span>
        </h4>
        <div className="divide-y divide-[#CED4DA] border border-[#CED4DA]">
          {posts.map((post) => {
            const author = profiles.find((p) => p.id === post.ngo_id);
            return (
              <div key={post.id} className="p-3 bg-white flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#004182]">{author?.name || post.ngo_id}</span>
                    <span className="text-[10px] text-[#6C757D]">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#212529] line-clamp-2">{post.caption}</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Delete this post from public feed?')) {
                      onDeletePost(post.id);
                    }
                  }}
                  className="px-2 py-1 bg-[#dc3545] text-white text-[10px] font-bold uppercase hover:bg-[#b02a37] cursor-pointer shrink-0"
                >
                  Delete Post
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
