import React, { useState, useMemo } from 'react';
import { Download, Filter, Calendar, Building2, CheckCircle2 } from 'lucide-react';
import { Donation, Organization, Profile } from '../../types';

interface DonationLedgerTabProps {
  donations: Donation[];
  organizations: Organization[];
  profiles: Profile[];
}

export const DonationLedgerTab: React.FC<DonationLedgerTabProps> = ({
  donations,
  organizations,
  profiles,
}) => {
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedNgoFilter, setSelectedNgoFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Filter donations by date range and selected NGO
  const filteredDonations = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    return donations.filter((d) => {
      const donationTime = new Date(d.created_at).getTime();

      // Date filter
      if (dateFilter === 'today' && now - donationTime > oneDay) return false;
      if (dateFilter === 'week' && now - donationTime > oneWeek) return false;
      if (dateFilter === 'month' && now - donationTime > oneMonth) return false;

      // NGO filter
      if (selectedNgoFilter !== 'all' && d.ngo_id !== selectedNgoFilter) return false;

      return true;
    });
  }, [donations, dateFilter, selectedNgoFilter]);

  const totalFilteredVolume = useMemo(() => {
    return filteredDonations.reduce((sum, d) => sum + Number(d.amount), 0);
  }, [filteredDonations]);

  // Export to CSV Function
  const handleExportCsv = () => {
    setIsExporting(true);
    try {
      const headers = [
        'Date & Time (UTC)',
        'Donation ID',
        'Donor Name',
        'Donor MFS Phone',
        'Recipient NGO',
        'MFS Method',
        'Amount (BDT)',
        'Transaction Reference',
        'Verification Hash',
      ];

      const rows = filteredDonations.map((d) => {
        const donorProfile = profiles.find((p) => p.id === d.donor_id);
        const ngoProfile = profiles.find((p) => p.id === d.ngo_id);
        const org = organizations.find((o) => o.ngo_id === d.ngo_id);

        const cleanStr = (str: string | undefined | null) =>
          `"${(str || '').replace(/"/g, '""')}"`;

        return [
          cleanStr(d.created_at),
          cleanStr(d.id),
          cleanStr(donorProfile?.name || 'Anonymous Benefactor'),
          cleanStr(d.mfs_account),
          cleanStr(org?.name || ngoProfile?.name || d.ngo_id),
          cleanStr(d.method),
          d.amount,
          cleanStr(d.reference),
          cleanStr(d.verification_hash || 'VERIFIED-LEDGER'),
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `goodwill_donations_ledger_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header with Financial Volume & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-[#CED4DA]">
        <div>
          <h3 className="font-extrabold text-sm uppercase text-[#004182]">
            Live Donations Ledger (MFS Transactions)
          </h3>
          <p className="text-xs text-[#6C757D]">
            Live audit of all verified contributions joined with donor, NGO, method, and transaction references.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-[#6C757D]">Filtered Volume</div>
            <div className="text-base font-mono font-black text-[#198754]">
              ৳{totalFilteredVolume.toLocaleString()}
            </div>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={isExporting || filteredDonations.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#004182] hover:bg-[#002f5e] disabled:bg-[#CED4DA] disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export Ledger to CSV'}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Date Range + NGO Dropdown */}
      <div className="bg-[#E9ECEF] border border-[#CED4DA] p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Date Filter Tabs */}
        <div className="flex items-center gap-1">
          <span className="font-bold text-[#6C757D] uppercase text-[11px] flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5" />
            Date:
          </span>
          <button
            onClick={() => setDateFilter('all')}
            className={`px-2.5 py-1 font-bold text-[11px] uppercase cursor-pointer transition-colors ${
              dateFilter === 'all'
                ? 'bg-[#004182] text-white shadow-xs'
                : 'bg-white text-[#6C757D] border border-[#CED4DA] hover:text-[#212529]'
            }`}
          >
            All Time ({donations.length})
          </button>
          <button
            onClick={() => setDateFilter('today')}
            className={`px-2.5 py-1 font-bold text-[11px] uppercase cursor-pointer transition-colors ${
              dateFilter === 'today'
                ? 'bg-[#004182] text-white shadow-xs'
                : 'bg-white text-[#6C757D] border border-[#CED4DA] hover:text-[#212529]'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateFilter('week')}
            className={`px-2.5 py-1 font-bold text-[11px] uppercase cursor-pointer transition-colors ${
              dateFilter === 'week'
                ? 'bg-[#004182] text-white shadow-xs'
                : 'bg-white text-[#6C757D] border border-[#CED4DA] hover:text-[#212529]'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`px-2.5 py-1 font-bold text-[11px] uppercase cursor-pointer transition-colors ${
              dateFilter === 'month'
                ? 'bg-[#004182] text-white shadow-xs'
                : 'bg-white text-[#6C757D] border border-[#CED4DA] hover:text-[#212529]'
            }`}
          >
            This Month
          </button>
        </div>

        {/* NGO Filter Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <span className="font-bold text-[#6C757D] uppercase text-[11px] flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            NGO:
          </span>
          <select
            value={selectedNgoFilter}
            onChange={(e) => setSelectedNgoFilter(e.target.value)}
            className="p-2 sm:p-1.5 bg-white border border-[#CED4DA] text-sm sm:text-xs font-bold text-[#212529] focus:outline-none focus:border-[#004182] min-h-[40px] sm:min-h-0"
          >
            <option value="all">All Verified Organizations</option>
            {organizations.map((org, index) => (
              <option key={org.id || org.ngo_id ? `ngo-opt-${org.id || org.ngo_id}-${index}` : `ngo-opt-${index}`} value={org.ngo_id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger Table (Horizontally scrollable for mobile) */}
      {filteredDonations.length === 0 ? (
        <div className="p-8 text-center bg-white border border-[#CED4DA]">
          <CheckCircle2 className="w-8 h-8 text-[#6C757D] mx-auto mb-2" />
          <div className="text-xs font-bold text-[#212529]">No Contributions Found</div>
          <div className="text-xs text-[#6C757D]">
            No donation records match the selected date or organization filters.
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#CED4DA]">
          <table className="w-full min-w-[720px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#E9ECEF] border-b border-[#CED4DA] text-[#6C757D] uppercase font-bold text-[10px]">
                <th className="p-2.5">Date & Time</th>
                <th className="p-2.5">Donor Name & Contact</th>
                <th className="p-2.5">Recipient NGO</th>
                <th className="p-2.5">Method</th>
                <th className="p-2.5">Amount (BDT)</th>
                <th className="p-2.5">MFS Reference</th>
                <th className="p-2.5">Verification Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CED4DA] font-mono text-[11px] bg-white">
              {filteredDonations.map((d, index) => {
                const donorProfile = profiles.find((p) => p.id === d.donor_id);
                const ngoProfile = profiles.find((p) => p.id === d.ngo_id);
                const org = organizations.find((o) => o.ngo_id === d.ngo_id);
                const rowKey = d.id ? `donation-row-${d.id}-${index}` : `donation-fallback-${index}-${d.reference || ''}`;
                return (
                  <tr key={rowKey} className="hover:bg-slate-50">
                    <td className="p-2.5 text-[#6C757D]">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                    <td className="p-2.5">
                      <span className="font-bold text-[#212529]">
                        {donorProfile?.name || 'Anonymous Benefactor'}
                      </span>{' '}
                      ({d.mfs_account})
                    </td>
                    <td className="p-2.5 font-bold text-[#004182]">
                      {org?.name || ngoProfile?.name || d.ngo_id}
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
                      ৳{Number(d.amount).toLocaleString()}
                    </td>
                    <td className="p-2.5 font-bold text-[#212529]">{d.reference}</td>
                    <td className="p-2.5 text-[10px] text-[#6C757D] select-all font-mono">
                      {d.verification_hash || 'GW-MFS-LEGACY'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
