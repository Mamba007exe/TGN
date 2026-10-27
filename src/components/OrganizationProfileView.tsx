import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  User,
  MapPin,
  Calendar,
  CreditCard,
  Heart,
  Share2,
  Copy,
  Check,
  ExternalLink,
  DollarSign,
  FileText,
  Clock
} from 'lucide-react';
import { Organization, Profile, Post, Donation } from '../types';

interface OrganizationProfileViewProps {
  organization: Organization;
  profile?: Profile;
  posts: Post[];
  donations: Donation[];
  profiles: Profile[];
  onBack: () => void;
  onOpenDonate: (org: Organization) => void;
}

export const OrganizationProfileView: React.FC<OrganizationProfileViewProps> = ({
  organization,
  profile,
  posts,
  donations,
  profiles,
  onBack,
  onOpenDonate,
}) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'ledger' | 'details'>('posts');
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  // Filter posts exclusively belonging to this organization
  const orgPosts = posts.filter((p) => p.ngo_id === organization.ngo_id);

  // Filter donations exclusively received by this organization
  const orgDonations = donations.filter((d) => d.ngo_id === organization.ngo_id);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(type);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className="space-y-4 text-[#212529]">
      {/* Top Breadcrumb & Return Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#CED4DA] text-xs font-bold text-[#004182] hover:bg-[#E9ECEF] cursor-pointer min-h-[44px] touch-manipulation self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organizations Directory</span>
        </button>

        <span className="text-xs font-mono text-[#6C757D]">
          Registry ID: {organization.id}
        </span>
      </div>

      {/* Main Profile Header Card (LinkedIn-style zero-bloat pointy layout) */}
      <div className="bg-white border-2 border-[#CED4DA] p-0">
        {/* Top Header Background Bar */}
        <div className="h-20 sm:h-28 bg-[#004182] p-3 sm:p-4 flex items-end justify-end border-b border-[#002f5e]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FFC107] text-[#212529] text-[11px] sm:text-xs font-extrabold uppercase">
            <ShieldCheck className="w-4 h-4 text-[#212529]" />
            <span>GOVERNANCE VERIFIED NGO</span>
          </span>
        </div>

        {/* Profile Info Row */}
        <div className="p-4 sm:p-6 -mt-10 sm:-mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white bg-white shadow-none overflow-hidden shrink-0 border border-[#CED4DA] aspect-square">
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={organization.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#004182] text-white flex items-center justify-center font-black text-3xl">
                    {organization.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-black text-[#004182] tracking-tight">
                  {organization.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6C757D]">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#004182]" />
                    <span>Director: <strong className="text-[#212529]">{organization.director_name}</strong></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Established {new Date(organization.date_created).getFullYear()}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{organization.address}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Action Button */}
            <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => onOpenDonate(organization)}
                className="w-full sm:w-auto bg-[#198754] text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-[#146c43] cursor-pointer flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
              >
                <CreditCard className="w-4 h-4" />
                <span>Make MFS Donation</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 sm:mt-6 pt-4 border-t border-[#CED4DA]">
            <div className="p-3 bg-[#E9ECEF] border border-[#CED4DA]">
              <div className="text-[10px] text-[#6C757D] uppercase font-bold">Total Capital Raised</div>
              <div className="text-base sm:text-lg font-mono font-black text-[#198754]">
                ৳{(organization.total_raised ?? 0).toLocaleString()}
              </div>
            </div>

            <div className="p-3 bg-[#E9ECEF] border border-[#CED4DA]">
              <div className="text-[10px] text-[#6C757D] uppercase font-bold">Total Donations</div>
              <div className="text-base sm:text-lg font-mono font-black text-[#004182]">
                {organization.donation_count ?? 0} gifts
              </div>
            </div>

            <div className="p-3 bg-[#E9ECEF] border border-[#CED4DA]">
              <div className="text-[10px] text-[#6C757D] uppercase font-bold">bKash Account</div>
              <div className="flex items-center justify-between text-xs font-mono font-bold text-[#E2136E] mt-0.5">
                <span className="truncate">{organization.bkash_no || '017XXXXXXXX'}</span>
                <button
                  onClick={() => copyToClipboard(organization.bkash_no || '', 'bkash')}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-slate-300 cursor-pointer touch-manipulation shrink-0"
                  title="Copy bKash number"
                  aria-label="Copy bKash number"
                >
                  {copiedAccount === 'bkash' ? <Check className="w-4 h-4 text-[#198754]" /> : <Copy className="w-4 h-4 text-[#6C757D]" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#E9ECEF] border border-[#CED4DA]">
              <div className="text-[10px] text-[#6C757D] uppercase font-bold">Nagad Account</div>
              <div className="flex items-center justify-between text-xs font-mono font-bold text-[#F7941D] mt-0.5">
                <span className="truncate">{organization.nagad_no || '018XXXXXXXX'}</span>
                <button
                  onClick={() => copyToClipboard(organization.nagad_no || '', 'nagad')}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-slate-300 cursor-pointer touch-manipulation shrink-0"
                  title="Copy Nagad number"
                  aria-label="Copy Nagad number"
                >
                  {copiedAccount === 'nagad' ? <Check className="w-4 h-4 text-[#198754]" /> : <Copy className="w-4 h-4 text-[#6C757D]" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher for Organization Details (Horizontally scrollable on mobile) */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-[#CED4DA] bg-white whitespace-nowrap">
        <button
          onClick={() => setActiveTab('posts')}
          className={`py-3 px-3.5 sm:px-5 text-xs font-bold uppercase tracking-wide cursor-pointer flex items-center gap-1.5 min-h-[44px] shrink-0 touch-manipulation ${
            activeTab === 'posts'
              ? 'border-b-2 border-[#004182] text-[#004182] bg-[#E9ECEF]'
              : 'text-[#6C757D] hover:text-[#212529]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Field Impact Updates ({orgPosts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-3 px-3.5 sm:px-5 text-xs font-bold uppercase tracking-wide cursor-pointer flex items-center gap-1.5 min-h-[44px] shrink-0 touch-manipulation ${
            activeTab === 'ledger'
              ? 'border-b-2 border-[#004182] text-[#004182] bg-[#E9ECEF]'
              : 'text-[#6C757D] hover:text-[#212529]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Verified Donations Ledger ({orgDonations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('details')}
          className={`py-3 px-3.5 sm:px-5 text-xs font-bold uppercase tracking-wide cursor-pointer flex items-center gap-1.5 min-h-[44px] shrink-0 touch-manipulation ${
            activeTab === 'details'
              ? 'border-b-2 border-[#004182] text-[#004182] bg-[#E9ECEF]'
              : 'text-[#6C757D] hover:text-[#212529]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Organization Info & Compliance</span>
        </button>
      </div>

      {/* TAB CONTENT 1: FIELD IMPACT POSTS */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {orgPosts.length === 0 ? (
            <div className="bg-white border border-[#CED4DA] p-10 text-center text-[#6C757D]">
              <FileText className="w-8 h-8 text-[#6C757D] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#212529]">No field updates published yet</p>
              <p className="text-xs mt-1">
                This organization has not broadcast any field photos or mission progress reports yet.
              </p>
            </div>
          ) : (
            orgPosts.map((post) => {
              const isLiked = Boolean(likedPosts[post.id]);
              return (
                <article key={post.id} className="bg-white border border-[#CED4DA] p-0 text-[#212529]">
                  {/* Post Header */}
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border border-[#CED4DA] overflow-hidden shrink-0">
                        {organization.logo_url ? (
                          <img
                            src={organization.logo_url}
                            alt={organization.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#004182] text-white flex items-center justify-center font-bold">
                            {organization.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-[#004182]">
                          {organization.name}
                        </div>
                        <div className="text-[11px] text-[#6C757D]">
                          Published on {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenDonate(organization)}
                      className="bg-[#198754] text-white px-3 py-1.5 text-xs font-bold uppercase hover:bg-[#146c43] cursor-pointer"
                    >
                      Donate
                    </button>
                  </div>

                  {/* Caption */}
                  <div className="px-4 pb-3 text-xs sm:text-sm text-[#212529] leading-relaxed whitespace-pre-line">
                    {post.caption}
                  </div>

                  {/* Media with aspect ratio and lazy loading */}
                  {post.media_url && (
                    <div className="w-full aspect-[16/9] sm:aspect-[16/10] bg-[#E9ECEF] border-y border-[#CED4DA] overflow-hidden relative">
                      <img
                        src={post.media_url}
                        alt="Field update"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Bottom bar (Thumb friendly) */}
                  <div className="px-3 sm:px-4 py-2 border-t border-[#CED4DA] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={`min-h-[44px] flex items-center gap-1.5 px-3 py-2 font-bold cursor-pointer hover:bg-[#E9ECEF] touch-manipulation ${
                          isLiked ? 'text-[#004182]' : 'text-[#6C757D]'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#004182]' : ''}`} />
                        <span>{isLiked ? 'Acknowledged (1)' : 'Acknowledge'}</span>
                      </button>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          setCopiedPostId(post.id);
                          setTimeout(() => setCopiedPostId(null), 2000);
                        }}
                        className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 font-bold text-[#6C757D] cursor-pointer hover:bg-[#E9ECEF] touch-manipulation"
                      >
                        {copiedPostId === post.id ? (
                          <>
                            <Check className="w-4 h-4 text-[#198754]" />
                            <span className="text-[#198754]">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4" />
                            <span>Share</span>
                          </>
                        )}
                      </button>
                    </div>

                    <span className="text-[10px] text-[#6C757D] font-mono">
                      Post ID: {post.id}
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* TAB CONTENT 2: VERIFIED DONATIONS LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white border border-[#CED4DA] p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#CED4DA] pb-3">
            <div>
              <h3 className="font-extrabold text-sm uppercase text-[#004182]">
                Public Contributions Ledger
              </h3>
              <p className="text-xs text-[#6C757D]">
                Every individual benefactor donation routed through official bKash & Nagad accounts is recorded here.
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-[#198754]">
              Total Volume: ৳{(organization.total_raised ?? 0).toLocaleString()}
            </div>
          </div>

          {orgDonations.length === 0 ? (
            <div className="p-8 text-center bg-[#E9ECEF] border border-[#CED4DA]">
              <DollarSign className="w-8 h-8 text-[#6C757D] mx-auto mb-2" />
              <div className="text-xs font-bold text-[#212529]">No Donations Recorded Yet</div>
              <p className="text-xs text-[#6C757D] mt-1">
                Be the first to contribute to {organization.name}.
              </p>
              <button
                onClick={() => onOpenDonate(organization)}
                className="mt-3 bg-[#198754] text-white px-4 py-2 text-xs font-bold uppercase hover:bg-[#146c43] cursor-pointer min-h-[44px] touch-manipulation"
              >
                Donate Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#CED4DA]">
              <table className="w-full min-w-[580px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#E9ECEF] border-b border-[#CED4DA] text-[#6C757D] uppercase font-bold text-[10px]">
                    <th className="p-2.5">Date & Time</th>
                    <th className="p-2.5">Benefactor Name</th>
                    <th className="p-2.5">Channel</th>
                    <th className="p-2.5">Amount (BDT)</th>
                    <th className="p-2.5">Transaction Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CED4DA] font-mono text-[11px]">
                  {orgDonations.map((d, index) => {
                    const donorProfile = profiles.find((p) => p.id === d.donor_id);
                    return (
                      <tr key={d.id ? `org-don-${d.id}-${index}` : `org-don-${index}-${d.reference || ''}`} className="hover:bg-slate-50">
                        <td className="p-2.5 text-[#6C757D]">
                          {new Date(d.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-2.5 font-sans font-bold text-[#212529]">
                          {donorProfile?.name || 'Verified Benefactor'}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold text-white ${
                              d.method === 'bKash' ? 'bg-[#E2136E]' : 'bg-[#F7941D]'
                            }`}
                          >
                            {d.method}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-[#198754]">
                          ৳{Number(d.amount || 0).toLocaleString()}
                        </td>
                        <td className="p-2.5 font-bold text-[#212529]">{d.reference}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: DETAILS & COMPLIANCE */}
      {activeTab === 'details' && (
        <div className="bg-white border border-[#CED4DA] p-5 space-y-5">
          <div>
            <h3 className="font-extrabold text-sm uppercase text-[#004182] mb-1">
              Legal Identity & Organizational Charter
            </h3>
            <p className="text-xs text-[#6C757D]">
              Verified non-profit credential data maintained under the Goodwill governance registry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-[#E9ECEF] border border-[#CED4DA] space-y-2">
              <div className="font-bold text-[#004182] uppercase text-[11px]">Leadership & Governance</div>
              <div className="space-y-1">
                <div>
                  <span className="text-[#6C757D]">Executive Director: </span>
                  <span className="font-bold">{organization.director_name}</span>
                </div>
                <div>
                  <span className="text-[#6C757D]">Date Founded: </span>
                  <span className="font-mono font-bold">{new Date(organization.date_created).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[#6C757D]">Registered Address: </span>
                  <span className="font-bold">{organization.address}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#E9ECEF] border border-[#CED4DA] space-y-2">
              <div className="font-bold text-[#004182] uppercase text-[11px]">Financial Operations</div>
              <div className="space-y-1">
                <div>
                  <span className="text-[#6C757D]">Primary MFS Rail: </span>
                  <span className="font-bold">bKash Merchant/Personal ({organization.bkash_no})</span>
                </div>
                <div>
                  <span className="text-[#6C757D]">Secondary MFS Rail: </span>
                  <span className="font-bold">Nagad Merchant/Personal ({organization.nagad_no})</span>
                </div>
                <div>
                  <span className="text-[#6C757D]">Platform Fee Tier: </span>
                  <span className="font-bold uppercase font-mono">{organization.fee_status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
