import React, { useState } from 'react';
import { Search, ShieldCheck, MapPin, Calendar, CreditCard, Building2, User, ArrowRight, FileText } from 'lucide-react';
import { Organization, Profile, Post, Donation } from '../types';
import { OrganizationProfileView } from './OrganizationProfileView';

interface OrganizationsDirectoryProps {
  organizations: Organization[];
  profiles: Profile[];
  posts: Post[];
  donations: Donation[];
  onOpenDonate: (org: Organization) => void;
  selectedOrgId?: string | null;
  onSelectOrgId?: (id: string | null) => void;
}

export const OrganizationsDirectory: React.FC<OrganizationsDirectoryProps> = ({
  organizations,
  profiles,
  posts,
  donations,
  onOpenDonate,
  selectedOrgId,
  onSelectOrgId,
}) => {
  const [internalSelectedOrgId, setInternalSelectedOrgId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFee, setFilterFee] = useState<'all' | 'exempt' | 'active'>('all');

  const activeOrgId = selectedOrgId !== undefined ? selectedOrgId : internalSelectedOrgId;
  const setActiveOrgId = (id: string | null) => {
    if (onSelectOrgId) {
      onSelectOrgId(id);
    } else {
      setInternalSelectedOrgId(id);
    }
  };

  // Filterable list showing all registered organizations unless explicitly restricted or rejected
  const activeOrgs = organizations.filter((org) => {
    const profile = profiles.find(
      (p) => p.id === org.ngo_id || (p as any).ngo_id === org.ngo_id || org.id === p.id || org.ngo_id?.includes(p.id)
    );
    if (profile && (profile.status === 'restricted' || profile.status === 'rejected')) {
      return false;
    }
    return true;
  });

  // If an organization is currently selected, render its unique profile view
  const currentSelectedOrg = activeOrgs.find((o) => o.id === activeOrgId || o.ngo_id === activeOrgId);
  if (currentSelectedOrg) {
    const orgProfile = profiles.find(
      (p) => p.id === currentSelectedOrg.ngo_id || (p as any).ngo_id === currentSelectedOrg.ngo_id || currentSelectedOrg.id === p.id
    );
    return (
      <OrganizationProfileView
        organization={currentSelectedOrg}
        profile={orgProfile}
        posts={posts}
        donations={donations}
        profiles={profiles}
        onBack={() => setActiveOrgId(null)}
        onOpenDonate={onOpenDonate}
      />
    );
  }

  const filteredOrgs = activeOrgs.filter((org) => {
    const profile = profiles.find(
      (p) => p.id === org.ngo_id || (p as any).ngo_id === org.ngo_id || org.id === p.id
    );
    const matchesQuery =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.director_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (profile && profile.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFee =
      filterFee === 'all' ||
      (filterFee === 'exempt' && org.fee_status === 'exempt') ||
      (filterFee === 'active' && org.fee_status === 'active');

    return matchesQuery && matchesFee;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="bg-white border border-[#CED4DA] p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-base uppercase text-[#004182] tracking-wide flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#004182]" />
              <span>Verified Organizations Directory</span>
            </h2>
            <p className="text-xs text-[#6C757D]">
              Select any organization to review their unique profile, field impact updates, and transparent ledger.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#6C757D] absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search NGO, director, city..."
                className="w-full pl-9 pr-3 py-2.5 sm:py-2 bg-white border border-[#CED4DA] text-sm sm:text-xs font-semibold text-[#212529] focus:outline-none focus:border-[#004182] min-h-[44px]"
              />
            </div>

            <select
              value={filterFee}
              onChange={(e) => setFilterFee(e.target.value as any)}
              className="py-2.5 sm:py-2 px-3 bg-white border border-[#CED4DA] text-sm sm:text-xs font-semibold text-[#212529] focus:outline-none focus:border-[#004182] min-h-[44px]"
            >
              <option value="all">All Fee Tiers</option>
              <option value="exempt">Onboarding (Exempt)</option>
              <option value="active">Active Donated (4+ Gifts)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      {filteredOrgs.length === 0 ? (
        <div className="bg-white border border-[#CED4DA] p-10 text-center text-[#6C757D] space-y-2">
          <Building2 className="w-10 h-10 text-[#6C757D] mx-auto mb-2" />
          <p className="text-base font-bold text-[#212529]">No organizations registered yet</p>
          <p className="text-xs text-[#6C757D] max-w-md mx-auto">
            The platform directory is ready for verified non-profit organizations. Once registered and approved by the Governance Administrator, organizations appear here with their verified bKash & Nagad disbursement accounts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrgs.map((org) => {
            const orgPostCount = posts.filter((p) => p.ngo_id === org.ngo_id).length;

            return (
              <div
                key={org.id}
                onClick={() => setActiveOrgId(org.id)}
                className="bg-white border border-[#CED4DA] p-4 flex flex-col justify-between text-[#212529] hover:border-[#004182] transition-colors cursor-pointer group"
              >
                <div>
                  {/* Top Bar with Logo & Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-14 h-14 border border-[#CED4DA] bg-[#E9ECEF] overflow-hidden shrink-0">
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt={org.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#004182] text-white flex items-center justify-center font-bold text-base">
                          {org.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFC107] text-[#212529] text-[10px] font-extrabold uppercase shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#212529]" />
                      <span>VERIFIED NGO</span>
                    </span>
                  </div>

                  {/* Name and Director */}
                  <div className="block w-full">
                    <h3 className="font-extrabold text-sm text-[#004182] leading-snug group-hover:underline">
                      {org.name}
                    </h3>
                  </div>

                  <div className="text-xs text-[#6C757D] flex items-center gap-1 mt-1">
                    <User className="w-3 h-3 text-[#6C757D]" />
                    <span>Director: <strong className="text-[#212529]">{org.director_name}</strong></span>
                  </div>

                  {/* Address */}
                  <div className="text-xs text-[#6C757D] flex items-start gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-[#6C757D] shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{org.address}</span>
                  </div>

                  {/* Founded Date & Posts Count */}
                  <div className="text-xs text-[#6C757D] flex items-center justify-between mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#6C757D]" />
                      <span>Founded: {new Date(org.date_created).getFullYear()}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-[#004182]">
                      <FileText className="w-3 h-3" />
                      <span>{orgPostCount} updates</span>
                    </span>
                  </div>

                  {/* MFS Contact Details */}
                  <div className="mt-3 p-2 bg-[#E9ECEF] border border-[#CED4DA] space-y-1 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-[#6C757D] text-[10px] font-bold">bKash Account:</span>
                      <span className="font-bold text-[#E2136E]">{org.bkash_no || '017XXXXXXXX'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#6C757D] text-[10px] font-bold">Nagad Account:</span>
                      <span className="font-bold text-[#F7941D]">{org.nagad_no || '018XXXXXXXX'}</span>
                    </div>
                  </div>

                  {/* Financial Stats */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#CED4DA] text-center">
                    <div className="bg-[#E9ECEF] p-2 border border-[#CED4DA]">
                      <div className="text-[10px] text-[#6C757D] font-bold uppercase">Total Raised</div>
                      <div className="text-xs font-mono font-extrabold text-[#198754]">
                        ৳{(org.total_raised ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-[#E9ECEF] p-2 border border-[#CED4DA]">
                      <div className="text-[10px] text-[#6C757D] font-bold uppercase">Gifts Logged</div>
                      <div className="text-xs font-mono font-extrabold text-[#212529]">
                        {org.donation_count ?? 0} gifts
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions: View Profile and Donate (Thumb friendly) */}
                <div className="mt-4 pt-3 border-t border-[#CED4DA] flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveOrgId(org.id);
                    }}
                    className="flex-1 py-2.5 px-3 bg-[#004182] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#003366] cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] touch-manipulation"
                  >
                    <span>View Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDonate(org);
                    }}
                    className="py-2.5 px-4 bg-[#198754] text-white text-xs font-extrabold uppercase tracking-wider hover:bg-[#146c43] cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] touch-manipulation"
                    title="Direct MFS Donation"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Donate</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
