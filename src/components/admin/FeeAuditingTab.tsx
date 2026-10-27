import React from 'react';
import { Organization, FeeStatus } from '../../types';

interface FeeAuditingTabProps {
  organizations: Organization[];
  onToggleFeeStatus: (orgId: string, status: FeeStatus) => void;
}

export const FeeAuditingTab: React.FC<FeeAuditingTabProps> = ({
  organizations,
  onToggleFeeStatus,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-extrabold text-sm uppercase text-[#004182]">
          Organization Monetization & Bi-Weekly Fee Monitor
        </h3>
        <p className="text-xs text-[#6C757D]">
          Platform rules mandate a ৳250 fee every 14 days starting on the 4th donation. Monitor due dates and status.
        </p>
      </div>

      <div className="overflow-x-auto border border-[#CED4DA]">
        <table className="w-full min-w-[640px] text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#E9ECEF] border-b border-[#CED4DA] text-[#6C757D] uppercase font-bold text-[10px]">
              <th className="p-2.5">Organization</th>
              <th className="p-2.5">Donations</th>
              <th className="p-2.5">Total Raised</th>
              <th className="p-2.5">Fee Status</th>
              <th className="p-2.5">Next Fee Due</th>
              <th className="p-2.5 text-right">Admin Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CED4DA]">
            {organizations.map((org, index) => {
              const isOverdue = org.next_fee_due_date && new Date(org.next_fee_due_date).getTime() < Date.now();
              return (
                <tr key={org.id ? `fee-org-${org.id}-${index}` : `fee-org-${org.ngo_id || index}-${index}`} className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-[#004182]">
                    <div>{org.name}</div>
                    <div className="text-[10px] text-[#6C757D] font-normal">Dir: {org.director_name}</div>
                  </td>
                  <td className="p-2.5 font-mono">{org.donation_count ?? 0} gifts</td>
                  <td className="p-2.5 font-mono font-bold text-[#198754]">
                    ৳{(org.total_raised ?? 0).toLocaleString()}
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        org.fee_status === 'exempt'
                          ? 'bg-[#E9ECEF] text-[#212529]'
                          : org.fee_status === 'active'
                          ? 'bg-[#198754] text-white'
                          : 'bg-[#dc3545] text-white'
                      }`}
                    >
                      {org.fee_status}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono text-[11px]">
                    {org.next_fee_due_date ? (
                      <span className={isOverdue ? 'text-[#dc3545] font-bold' : 'text-[#212529]'}>
                        {new Date(org.next_fee_due_date).toLocaleDateString()}
                        {isOverdue && ' (OVERDUE)'}
                      </span>
                    ) : (
                      <span className="text-[#6C757D]">Exempt (Donations &lt; 4)</span>
                    )}
                  </td>
                  <td className="p-2.5 text-right space-x-1">
                    <button
                      onClick={() => onToggleFeeStatus(org.id, 'active')}
                      className="px-2 py-1 bg-[#198754] text-white text-[10px] font-bold uppercase hover:bg-[#146c43] cursor-pointer"
                    >
                      Mark Active
                    </button>
                    <button
                      onClick={() => onToggleFeeStatus(org.id, 'unpaid')}
                      className="px-2 py-1 bg-[#dc3545] text-white text-[10px] font-bold uppercase hover:bg-[#b02a37] cursor-pointer"
                    >
                      Mark Unpaid
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
