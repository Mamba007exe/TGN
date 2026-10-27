import React, { useState } from 'react';
import { Sparkles, HeartHandshake, Search, Gift, Users } from 'lucide-react';
import { Profile, Donation } from '../types';

interface BenefactorsListProps {
  profiles: Profile[];
  donations: Donation[];
  currentUser: Profile | null;
  onOpenDonateModal: () => void;
}

export const BenefactorsList: React.FC<BenefactorsListProps> = ({
  profiles,
  donations,
  currentUser,
  onOpenDonateModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBadge, setFilterBadge] = useState<'all' | 'prominent' | 'regular'>('all');

  // Filter profiles where role = 'benefactor'
  const benefactors = profiles.filter((p) => p.role === 'benefactor');

  // Map each donor to donation count and total
  const enrichedBenefactors = benefactors.map((donor) => {
    const userDonations = donations.filter((d) => d.donor_id === donor.id);
    const count = userDonations.length;
    const total = userDonations.reduce((sum, d) => sum + Number(d.amount), 0);
    const isProminent = count >= 5;

    return {
      ...donor,
      donationCount: count,
      totalContributed: total,
      isProminent,
    };
  })
  .sort((a, b) => b.totalContributed - a.totalContributed || b.donationCount - a.donationCount || a.name.localeCompare(b.name))
  .map((b, index) => ({
    ...b,
    rank: index + 1,
  }));

  const filteredBenefactors = enrichedBenefactors.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.phone.includes(searchQuery) ||
      (b.address && b.address.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter =
      filterBadge === 'all' ||
      (filterBadge === 'prominent' && b.isProminent) ||
      (filterBadge === 'regular' && !b.isProminent);

    return matchesSearch && matchesFilter;
  });

  // Current user's progress if benefactor
  const currentDonorEnriched = enrichedBenefactors.find((b) => b.id === currentUser?.id);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-[#CED4DA] p-4 text-[#212529]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-base uppercase text-[#004182] tracking-wide flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-[#004182]" />
              <span>Platform Benefactors & Philanthropic Honor Roll</span>
            </h2>
            <p className="text-xs text-[#6C757D]">
              Verified individuals contributing to Bangladeshi non-profits. Donors recording 5+ contributions receive the dynamic <strong className="text-[#212529]">Prominent Benefactor</strong> badge (#FFC107).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#6C757D] absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search donors by name..."
                className="w-full pl-9 pr-3 py-2.5 sm:py-2 bg-white border border-[#CED4DA] text-sm sm:text-xs font-semibold text-[#212529] focus:outline-none focus:border-[#004182] min-h-[44px]"
              />
            </div>

            <select
              value={filterBadge}
              onChange={(e) => setFilterBadge(e.target.value as any)}
              className="py-2.5 sm:py-2 px-3 bg-white border border-[#CED4DA] text-sm sm:text-xs font-semibold text-[#212529] focus:outline-none focus:border-[#004182] min-h-[44px]"
            >
              <option value="all">All Benefactors</option>
              <option value="prominent">Prominent (5+ Gifts)</option>
              <option value="regular">Standard Donors (&lt; 5)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Interactive Progress Box for Current User */}
      {currentUser?.role === 'benefactor' && (
        <div className="bg-white border-2 border-[#004182] p-4 text-[#212529]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase text-[#004182]">Your Benefactor Status</span>
                {currentDonorEnriched?.isProminent ? (
                  <span className="px-2 py-0.5 bg-[#FFC107] text-[#212529] text-[10px] font-black uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Prominent Benefactor Active</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-[#E9ECEF] text-[#212529] text-[10px] font-bold uppercase">
                    Standard Level ({currentDonorEnriched?.donationCount || 0}/5 Contributions)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6C757D]">
                {currentDonorEnriched?.isProminent
                  ? `Outstanding leadership: You have completed ${currentDonorEnriched?.donationCount} verified donations totaling ৳${(currentDonorEnriched?.totalContributed ?? 0).toLocaleString()}!`
                  : `You are only ${5 - (currentDonorEnriched?.donationCount || 0)} donation(s) away from securing the permanent Prominent Benefactor badge.`}
              </p>
            </div>

            <button
              onClick={onOpenDonateModal}
              className="w-full sm:w-auto shrink-0 bg-[#198754] text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#146c43] cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] touch-manipulation"
            >
              <Gift className="w-4 h-4" />
              <span>Make a Contribution</span>
            </button>
          </div>
        </div>
      )}

      {/* Benefactors Grid */}
      {filteredBenefactors.length === 0 ? (
        <div className="bg-white border border-[#CED4DA] p-10 text-center text-[#6C757D]">
          <Users className="w-8 h-8 text-[#6C757D] mx-auto mb-2" />
          <p className="text-sm font-bold text-[#212529]">No benefactors registered yet</p>
          <p className="text-xs mt-1">Be the first to create a benefactor profile and support verified non-profits.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBenefactors.map((donor) => (
            <div
              key={donor.id}
              className={`bg-white border p-4 flex flex-col justify-between text-[#212529] ${
                donor.isProminent ? 'border-2 border-[#FFC107]' : 'border-[#CED4DA]'
              }`}
            >
              <div>
                {/* Header with Prominent badge or Standard */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 flex items-center justify-center font-black text-sm text-white ${
                        donor.isProminent ? 'bg-[#FFC107] text-[#212529]' : 'bg-[#004182]'
                      }`}
                    >
                      {donor.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#212529] leading-tight">
                        {donor.name}
                      </h3>
                      <div className="text-[10px] text-[#6C757D] font-mono">
                        Member since {new Date(donor.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black uppercase ${
                        donor.rank === 1
                          ? 'bg-[#FFC107] text-[#212529] border border-[#d39e00]'
                          : donor.rank === 2
                          ? 'bg-slate-200 text-slate-800 border border-slate-300'
                          : donor.rank === 3
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#E9ECEF] text-[#6C757D] border border-[#CED4DA]'
                      }`}
                      title={`Rank #${donor.rank} by total funds donated`}
                    >
                      Rank #{donor.rank}
                    </span>
                    {donor.isProminent && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFC107] text-[#212529] text-[10px] font-black uppercase"
                        title="Prominent Benefactor (5+ Verified Donations)"
                      >
                        <Sparkles className="w-3 h-3 text-[#212529]" />
                        <span>PROMINENT</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Location */}
                {donor.address && (
                  <div className="text-xs text-[#6C757D] mb-3">
                    Resident of {donor.address}
                  </div>
                )}

                {/* Contribution Metrics */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#E9ECEF] border border-[#CED4DA] text-center">
                  <div>
                    <div className="text-[10px] text-[#6C757D] font-bold uppercase">Total Donated</div>
                    <div className="text-xs font-mono font-black text-[#198754]">
                      ৳{(donor.totalContributed ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#6C757D] font-bold uppercase">Gifts Logged</div>
                    <div className="text-xs font-mono font-black text-[#004182]">
                      {donor.donationCount} donations
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Status Tag */}
              <div className="mt-3 pt-2 border-t border-[#CED4DA] flex items-center justify-between text-[11px] text-[#6C757D]">
                <span>Verified Benefactor Profile</span>
                <span className="font-mono text-[#004182] font-semibold">Status: Active</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
