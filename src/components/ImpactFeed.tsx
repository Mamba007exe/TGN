import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Share2,
  Heart,
  MessageSquare,
  PlusCircle,
  ExternalLink,
  CreditCard,
  AlertCircle,
  Sparkles,
  Phone,
  ArrowRight,
  Newspaper,
  Trophy,
  Medal,
  Award,
  Crown
} from 'lucide-react';
import { Profile, Organization, Post, Donation, Notice } from '../types';
import { FeeBanner } from './FeeBanner';

interface ImpactFeedProps {
  posts: Post[];
  profiles: Profile[];
  organizations: Organization[];
  donations: Donation[];
  notices: Notice[];
  currentUser: Profile | null;
  onOpenNewPost: () => void;
  onOpenDonate: (org: Organization) => void;
  onOpenRegisterOrg: () => void;
  onPayFee: (ngoId: string) => void;
  onOpenAuth: () => void;
  onSelectTab: (tab: 'feed' | 'directory' | 'benefactors' | 'notices') => void;
  onSelectOrgProfile?: (orgId: string) => void;
}

export const ImpactFeed: React.FC<ImpactFeedProps> = ({
  posts,
  profiles,
  organizations,
  donations,
  notices,
  currentUser,
  onOpenNewPost,
  onOpenDonate,
  onOpenRegisterOrg,
  onPayFee,
  onOpenAuth,
  onSelectTab,
  onSelectOrgProfile,
}) => {
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Guardrail: Display all posts from active non-profit organizations unless explicitly restricted or rejected
  const visiblePosts = posts
    .filter((post) => {
      const profile = profiles.find(
        (p) => p.id === post.ngo_id || (p as any).ngo_id === post.ngo_id || post.ngo_id?.includes(p.id)
      );
      if (profile && (profile.status === 'restricted' || profile.status === 'rejected')) {
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Current user's organization if NGO
  const currentOrg = currentUser?.role === 'ngo'
    ? organizations.find((o) => o.ngo_id === currentUser.id)
    : null;

  // Donor stats if benefactor
  const donorDonations = currentUser?.role === 'benefactor'
    ? donations.filter((d) => d.donor_id === currentUser.id)
    : [];
  const isProminent = donorDonations.length >= 5;

  // Continuously calculate total money donated by each benefactor account and rank them from 1 to N
  const benefactorProfiles = profiles.filter((p) => p.role === 'benefactor');
  const rankedBenefactors = benefactorProfiles
    .map((benefactor) => {
      const userDonations = donations.filter((d) => d.donor_id === benefactor.id);
      const totalAmount = userDonations.reduce((sum, d) => sum + Number(d.amount), 0);
      const donationCount = userDonations.length;
      return {
        ...benefactor,
        totalAmount,
        donationCount,
      };
    })
    .sort((a, b) => {
      if (b.totalAmount !== a.totalAmount) {
        return b.totalAmount - a.totalAmount;
      }
      if (b.donationCount !== a.donationCount) {
        return b.donationCount - a.donationCount;
      }
      return a.name.localeCompare(b.name);
    });

  const top3Benefactors = rankedBenefactors.slice(0, 3);
  const totalBenefactorsCount = rankedBenefactors.length;

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleShare = (postId: string) => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* LEFT COLUMN: Identity & Quick Stats (Order 2 on mobile, Order 1 on lg desktop) */}
      <div className="lg:col-span-3 space-y-4 order-2 lg:order-1">
        {/* User Card */}
        <div className="bg-white border border-[#CED4DA] p-4 text-[#212529]">
          {currentUser ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#004182] text-white flex items-center justify-center font-black text-xl">
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#004182] flex items-center gap-1">
                    <span>{currentUser.name}</span>
                    {currentUser.status === 'approved' && (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#FFC107] shrink-0" />
                    )}
                  </h3>
                  <div className="text-[11px] text-[#6C757D] font-mono">{currentUser.phone}</div>
                </div>
              </div>

              <div className="border-t border-[#CED4DA] pt-2 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#6C757D]">System Role:</span>
                  <span className="font-bold uppercase text-[10px] px-1.5 py-0.5 bg-[#E9ECEF]">
                    {currentUser.role}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6C757D]">Verification:</span>
                  <span
                    className={`font-bold uppercase text-[10px] px-1.5 py-0.5 ${
                      currentUser.status === 'approved'
                        ? 'bg-[#FFC107] text-[#212529]'
                        : currentUser.status === 'pending'
                        ? 'bg-[#6C757D] text-white'
                        : 'bg-[#dc3545] text-white'
                    }`}
                  >
                    {currentUser.status}
                  </span>
                </div>

                {currentUser.role === 'benefactor' && (
                  <div className="bg-[#E9ECEF] p-2 mt-2 border border-[#CED4DA] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[#6C757D] uppercase">
                        Lifetime Donations:
                      </span>
                      <span className="font-mono font-bold">{donorDonations.length} gifts</span>
                    </div>
                    {isProminent ? (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#212529] bg-[#FFC107] p-1 justify-center">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Prominent Benefactor</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#6C757D]">
                        {5 - donorDonations.length} more gift(s) until Prominent Badge (#FFC107).
                      </div>
                    )}
                  </div>
                )}

                {currentUser.role === 'ngo' && currentOrg && (
                  <div className="bg-[#E9ECEF] p-2 mt-2 border border-[#CED4DA] space-y-1 text-xs">
                    <div className="font-bold text-[#004182]">{currentOrg.name}</div>
                    <div className="flex justify-between">
                      <span className="text-[#6C757D]">Total Raised:</span>
                      <span className="font-bold font-mono text-[#198754]">
                        ৳{(currentOrg.total_raised ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6C757D]">Donations:</span>
                      <span className="font-mono font-bold">{(currentOrg.donation_count ?? 0)} gifts</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3 py-2">
              <div className="w-10 h-10 bg-[#004182] text-white flex items-center justify-center mx-auto font-black">
                GW
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase text-[#004182]">The Goodwill Network</h4>
                <p className="text-xs text-[#6C757D] mt-1">
                  Connect directly with verified non-profits across Bangladesh with transparent MFS rails.
                </p>
              </div>
              <button
                onClick={onOpenAuth}
                className="w-full py-2 bg-[#004182] text-white text-xs font-bold uppercase hover:bg-[#003366] cursor-pointer"
              >
                Join / Sign In
              </button>
            </div>
          )}
        </div>

        {/* Quick Nav Card */}
        <div className="bg-white border border-[#CED4DA] p-3 text-xs space-y-2">
          <div className="font-extrabold uppercase text-[#6C757D] text-[10px] tracking-wider">
            Network Shortcuts
          </div>
          <button
            onClick={() => onSelectTab('directory')}
            className="w-full text-left py-1.5 px-2 hover:bg-[#E9ECEF] font-semibold text-[#004182] flex items-center justify-between"
          >
            <span>Browse {organizations.length} Verified NGOs</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#6C757D]" />
          </button>
          <button
            onClick={() => onSelectTab('benefactors')}
            className="w-full text-left py-1.5 px-2 hover:bg-[#E9ECEF] font-semibold text-[#004182] flex items-center justify-between"
          >
            <span>Prominent Benefactors Roll</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#6C757D]" />
          </button>
          <button
            onClick={() => onSelectTab('notices')}
            className="w-full text-left py-1.5 px-2 hover:bg-[#E9ECEF] font-semibold text-[#004182] flex items-center justify-between"
          >
            <span>Official Platform Notices</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#6C757D]" />
          </button>
        </div>
      </div>

      {/* CENTER COLUMN: Feed Posts & Composer (Order 1 on mobile, Order 2 on lg desktop) */}
      <div className="lg:col-span-6 space-y-4 order-1 lg:order-2">
        {/* NGO Status Alerts / Registration Banner */}
        {currentUser?.role === 'ngo' && (
          <div>
            {!currentOrg ? (
              <div className="bg-white border-2 border-[#004182] p-4 mb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-[#FFC107] text-[#212529] px-1.5 py-0.5">
                      Action Required
                    </span>
                    <h3 className="font-extrabold text-sm text-[#004182] mt-1.5">
                      Register Your Official Organization
                    </h3>
                    <p className="text-xs text-[#6C757D] mt-0.5">
                      Your NGO profile is created, but no organization profile has been filed yet. Complete the registration form to appear in the directory.
                    </p>
                  </div>
                  <button
                    onClick={onOpenRegisterOrg}
                    className="shrink-0 bg-[#004182] text-white px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#003366] cursor-pointer"
                  >
                    + Register Organization
                  </button>
                </div>
              </div>
            ) : (
              <FeeBanner organization={currentOrg} onPayFee={onPayFee} />
            )}

            {currentUser.status === 'pending' && (
              <div className="bg-[#fff8e1] border border-[#FFC107] p-3 text-xs text-[#212529] mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#FFC107] shrink-0" />
                <span>
                  <strong>Application Pending Review:</strong> Your profile is currently in the administrative queue. Field updates will be hidden from the public feed until approved.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Composer for approved NGO */}
        {currentUser?.role === 'ngo' && currentUser.status === 'approved' && (
          <div className="bg-white border border-[#CED4DA] p-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#004182] text-white flex items-center justify-center font-bold text-sm">
                {currentUser.name.charAt(0)}
              </div>
              <button
                onClick={onOpenNewPost}
                className="flex-1 bg-[#E9ECEF] hover:bg-slate-200 text-left px-3.5 py-2 text-xs font-semibold text-[#6C757D] border border-[#CED4DA] cursor-pointer"
              >
                Start an impact update, share relief distribution metrics, or report field progress...
              </button>
            </div>
          </div>
        )}

        {/* Posts Feed Header */}
        <div className="bg-white border border-[#CED4DA] px-4 py-2 flex items-center justify-between text-xs">
          <div className="font-bold uppercase tracking-wider text-[#004182] flex items-center gap-2">
            <span>Verified Impact Feed</span>
            <span className="text-[10px] font-mono text-[#6C757D]">
              ({visiblePosts.length} broadcast updates)
            </span>
          </div>
          <span className="text-[11px] text-[#6C757D]">Real-Time Verified</span>
        </div>

        {/* Feed Posts */}
        {visiblePosts.length === 0 ? (
          <div className="bg-white border border-[#CED4DA] p-10 text-center text-[#6C757D] space-y-3">
            <Newspaper className="w-10 h-10 text-[#6C757D] mx-auto" />
            <div>
              <p className="text-base font-bold text-[#212529]">No field updates published yet</p>
              <p className="text-xs text-[#6C757D] max-w-md mx-auto mt-1">
                Be the first to publish a field impact update. Verified NGOs can broadcast photos, relief metrics, and transparent progress reports directly to benefactors.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {currentUser?.role === 'ngo' && currentUser.status === 'approved' ? (
                <button
                  onClick={onOpenNewPost}
                  className="bg-[#198754] text-white px-4 py-2 text-xs font-bold uppercase hover:bg-[#146c43] cursor-pointer"
                >
                  + Publish First Update
                </button>
              ) : currentUser?.role === 'ngo' && !currentOrg ? (
                <button
                  onClick={onOpenRegisterOrg}
                  className="bg-[#004182] text-white px-4 py-2 text-xs font-bold uppercase hover:bg-[#003366] cursor-pointer"
                >
                  + Register Organization
                </button>
              ) : !currentUser ? (
                <button
                  onClick={onOpenAuth}
                  className="bg-[#004182] text-white px-4 py-2 text-xs font-bold uppercase hover:bg-[#003366] cursor-pointer"
                >
                  Join / Create Account
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          visiblePosts.map((post) => {
            const authorOrg =
              organizations.find((o) => o.ngo_id === post.ngo_id || o.id === post.ngo_id) ||
              organizations.find((o) => profiles.some((p) => (p.id === o.ngo_id || (p as any).ngo_id === o.ngo_id) && (p.id === post.ngo_id || (p as any).ngo_id === post.ngo_id)));
            const authorProfile =
              profiles.find((p) => p.id === post.ngo_id || (p as any).ngo_id === post.ngo_id) ||
              profiles.find((p) => p.id === authorOrg?.ngo_id);
            const displayName = authorOrg?.name || authorProfile?.name || 'Verified NGO';
            const isLiked = Boolean(likedPosts[post.id]);

            return (
              <article key={post.id} className="bg-white border border-[#CED4DA] p-0 text-[#212529]">
                {/* Post Header */}
                <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                    <button
                      onClick={() => {
                        if (authorOrg && onSelectOrgProfile) {
                          onSelectOrgProfile(authorOrg.id);
                        }
                      }}
                      className="w-10 h-10 sm:w-11 sm:h-11 border border-[#CED4DA] bg-[#E9ECEF] overflow-hidden shrink-0 cursor-pointer p-0 text-left aspect-square"
                      title={authorOrg ? "View organization profile" : undefined}
                      aria-label={authorOrg ? `View ${authorOrg.name} profile` : "View organization profile"}
                    >
                      {authorOrg?.logo_url ? (
                        <img
                          src={authorOrg.logo_url}
                          alt={displayName}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#004182] text-white flex items-center justify-center font-bold text-sm">
                          {displayName.charAt(0) || 'N'}
                        </div>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => {
                            if (authorOrg && onSelectOrgProfile) {
                              onSelectOrgProfile(authorOrg.id);
                            }
                          }}
                          className="font-extrabold text-sm text-[#004182] hover:underline cursor-pointer p-0 border-0 bg-transparent text-left truncate max-w-[200px] sm:max-w-none"
                        >
                          {displayName}
                        </button>
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#FFC107] text-[#212529] text-[10px] font-extrabold uppercase shrink-0"
                          title="Verified NGO by Platform Governance"
                        >
                          <ShieldCheck className="w-3 h-3 text-[#212529]" />
                          <span>VERIFIED</span>
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6C757D] truncate">
                        Director: {authorOrg?.director_name || 'Executive Head'} •{' '}
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[10px] text-[#6C757D]">
                        <span className="bg-[#E9ECEF] px-1.5 py-0.5 border border-[#CED4DA] whitespace-nowrap">
                          bKash: {authorOrg?.bkash_no || authorProfile?.bkash_no || '01713000101'}
                        </span>
                        <span className="bg-[#E9ECEF] px-1.5 py-0.5 border border-[#CED4DA] whitespace-nowrap">
                          Nagad: {authorOrg?.nagad_no || authorProfile?.nagad_no || '01813000101'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {authorOrg && (
                    <button
                      onClick={() => onOpenDonate(authorOrg)}
                      className="w-full sm:w-auto shrink-0 bg-[#198754] text-white px-4 py-2 sm:py-1.5 text-xs font-black uppercase tracking-wider hover:bg-[#146c43] cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px] touch-manipulation"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Donate</span>
                    </button>
                  )}
                </div>

                {/* Caption */}
                <div className="px-3 sm:px-4 pb-3 text-xs sm:text-sm text-[#212529] leading-relaxed whitespace-pre-line">
                  {post.caption}
                </div>

                {/* Media Image with strict aspect ratio and async decoding */}
                {post.media_url && (
                  <div className="w-full aspect-[16/9] sm:aspect-[16/10] bg-[#E9ECEF] border-y border-[#CED4DA] overflow-hidden relative">
                    <img
                      src={post.media_url}
                      alt="Field impact evidence"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Engagement Bar (LinkedIn-style zero bloat, mobile touch optimized) */}
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
                      onClick={() => handleShare(post.id)}
                      className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 font-bold text-[#6C757D] cursor-pointer hover:bg-[#E9ECEF] touch-manipulation"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>{copiedPostId === post.id ? 'Link Copied!' : 'Share'}</span>
                    </button>
                  </div>

                  {authorOrg && (
                    <div className="text-[11px] font-mono text-[#6C757D] sm:text-right pt-1 sm:pt-0 border-t sm:border-t-0 border-[#CED4DA]/50">
                      Total Raised: <strong className="text-[#198754]">৳{(authorOrg.total_raised ?? 0).toLocaleString()}</strong> ({(authorOrg.donation_count ?? 0)} gifts)
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* RIGHT COLUMN: Network Ledger Pulse & Notices (Order 3 on mobile, Order 3 on lg desktop) */}
      <div className="lg:col-span-3 space-y-4 order-3 lg:order-3">
        {/* Network Metrics */}
        <div className="bg-white border border-[#CED4DA] p-4 text-[#212529] space-y-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-[#6C757D] border-b border-[#CED4DA] pb-1.5">
            Network Transparency Ledger
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#6C757D]">Verified NGOs:</span>
              <span className="font-bold text-[#004182]">
                {profiles.filter((p) => p.role === 'ngo' && p.status === 'approved').length} Active
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6C757D]">Total Benefactors:</span>
              <span className="font-bold">
                {profiles.filter((p) => p.role === 'benefactor').length} Donors
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6C757D]">Donations Logged:</span>
              <span className="font-bold font-mono">{donations.length} Transactions</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#CED4DA]">
              <span className="text-[#6C757D] font-bold">Total Capital Disbursed:</span>
              <span className="font-bold font-mono text-sm text-[#198754]">
                ৳{(donations.reduce((sum, d) => sum + Number(d.amount || 0), 0) ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Prominent Benefactors Continuous Leaderboard Card */}
        <div className="bg-white border border-[#CED4DA] p-4 text-[#212529] space-y-3">
          <div className="flex items-center justify-between border-b border-[#CED4DA] pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#FFC107] text-[#212529] flex items-center justify-center font-black">
                <Trophy className="w-3.5 h-3.5 text-[#212529]" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#004182] block">
                  Prominent Benefactors
                </span>
                <span className="text-[10px] text-[#6C757D]">
                  Top donors by total funds contributed
                </span>
              </div>
            </div>
            <button
              onClick={() => onSelectTab('benefactors')}
              className="text-[11px] font-bold text-[#004182] hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {top3Benefactors.length === 0 ? (
            <div className="p-4 bg-[#E9ECEF] border border-[#CED4DA] text-center space-y-2">
              <Award className="w-6 h-6 text-[#6C757D] mx-auto opacity-70" />
              <div className="text-xs font-bold text-[#004182]">No Benefactors Logged Yet</div>
              <p className="text-[11px] text-[#6C757D] leading-tight">
                Create a benefactor account and log contributions to claim the #1 Prominent Benefactor spot!
              </p>
              <button
                onClick={() => onSelectTab('directory')}
                className="inline-block mt-1 px-3 py-1 bg-[#004182] hover:bg-[#003366] text-white text-[10px] font-bold uppercase cursor-pointer"
              >
                Donate Now
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {top3Benefactors.map((donor, idx) => {
                const rank = idx + 1;
                const isCurrentUser = currentUser?.id === donor.id;

                // Rank custom borders & badges for Top 3
                const rankStyles = [
                  {
                    border: 'border-l-4 border-l-[#FFC107] border-y border-r border-[#CED4DA] bg-amber-50/50',
                    badge: 'bg-[#FFC107] text-[#212529] border border-[#d39e00]',
                    icon: <Crown className="w-3 h-3 text-[#212529]" />,
                  },
                  {
                    border: 'border-l-4 border-l-slate-400 border-y border-r border-[#CED4DA] bg-slate-50',
                    badge: 'bg-slate-200 text-slate-800 border border-slate-300',
                    icon: <Medal className="w-3 h-3 text-slate-700" />,
                  },
                  {
                    border: 'border-l-4 border-l-amber-700 border-y border-r border-[#CED4DA] bg-amber-50/20',
                    badge: 'bg-amber-100 text-amber-900 border border-amber-300',
                    icon: <Award className="w-3 h-3 text-amber-800" />,
                  },
                ][idx] || {
                  border: 'border border-[#CED4DA] bg-white',
                  badge: 'bg-[#E9ECEF] text-[#212529] border border-[#CED4DA]',
                  icon: null,
                };

                return (
                  <div
                    key={donor.id}
                    className={`p-2.5 ${rankStyles.border} transition-colors`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 flex items-center justify-center text-xs font-black shrink-0 ${rankStyles.badge}`}
                          title={`Rank #${rank} of ${totalBenefactorsCount}`}
                        >
                          #{rank}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-[#212529] truncate max-w-[130px]">
                              {donor.name}
                            </span>
                            {isCurrentUser && (
                              <span className="px-1 py-0.2 bg-[#004182] text-white text-[9px] font-bold uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#6C757D] flex items-center gap-1">
                            <span>Rank {rank} of {totalBenefactorsCount}</span>
                            <span>•</span>
                            <span>
                              {donor.donationCount} {donor.donationCount === 1 ? 'gift' : 'gifts'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black font-mono text-[#198754]">
                          ৳{(donor.totalAmount ?? 0).toLocaleString()}
                        </div>
                        <div className="text-[9px] font-semibold text-[#6C757D] uppercase">
                          Contributed
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Open spot indicators if fewer than 3 benefactors exist */}
              {top3Benefactors.length < 3 &&
                Array.from({ length: 3 - top3Benefactors.length }).map((_, i) => {
                  const openRank = top3Benefactors.length + i + 1;
                  return (
                    <div
                      key={`open-rank-${openRank}`}
                      className="p-2 border border-dashed border-[#CED4DA] bg-[#F8F9FA] flex items-center justify-between text-xs text-[#6C757D]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-[#E9ECEF] text-[#6C757D] flex items-center justify-center font-bold text-[10px] border border-[#CED4DA]">
                          #{openRank}
                        </div>
                        <span className="text-[11px] italic">Rank #{openRank} available</span>
                      </div>
                      <button
                        onClick={() => onSelectTab('directory')}
                        className="text-[10px] font-bold text-[#004182] hover:underline cursor-pointer"
                      >
                        Donate to claim
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

          <div className="pt-2 border-t border-[#CED4DA] flex items-center justify-between text-[10px] text-[#6C757D]">
            <span>Continuous dynamic ranking</span>
            <button
              onClick={() => onSelectTab('benefactors')}
              className="font-bold text-[#004182] hover:underline cursor-pointer"
            >
              Full Philanthropic Honor Roll →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
