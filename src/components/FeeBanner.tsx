import React from 'react';
import { AlertTriangle, Clock, CreditCard, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Organization } from '../types';

interface FeeBannerProps {
  organization: Organization;
  onPayFee: (ngoId: string) => void;
}

export const FeeBanner: React.FC<FeeBannerProps> = ({ organization, onPayFee }) => {
  const { donation_count, fee_status, next_fee_due_date, total_raised } = organization;

  // Calculate days remaining until next fee due date
  let daysRemaining: number | null = null;
  let isOverdue = false;

  if (next_fee_due_date) {
    const dueTime = new Date(next_fee_due_date).getTime();
    const diffMs = dueTime - Date.now();
    daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffMs <= 0) {
      isOverdue = true;
    }
  }

  if (fee_status === 'exempt') {
    return (
      <div className="bg-white border-2 border-[#198754] p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#198754] text-white shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase font-extrabold tracking-wider text-[#198754]">
                Onboarding Exemption Period
              </div>
              <h4 className="font-bold text-sm text-[#212529]">
                Zero Platform Fees Active ({donation_count} of 3 Free Donations Logged)
              </h4>
              <p className="text-xs text-[#6C757D] mt-0.5">
                Your organization is currently exempt from bi-weekly platform maintenance fees. Total Raised: ৳{(total_raised ?? 0).toLocaleString()}. The 4th recorded donation will initiate the standard bi-weekly maintenance fee cycle (৳250 / 14 days).
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block px-2.5 py-1 bg-[#E9ECEF] border border-[#CED4DA] text-xs font-mono font-bold text-[#212529]">
              FEE STATUS: EXEMPT
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 mb-4 border-2 ${isOverdue || fee_status === 'unpaid' ? 'bg-[#fff5f5] border-[#dc3545]' : 'bg-[#fffdf0] border-[#FFC107]'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 shrink-0 ${isOverdue || fee_status === 'unpaid' ? 'bg-[#dc3545] text-white' : 'bg-[#FFC107] text-[#212529]'}`}>
            {isOverdue || fee_status === 'unpaid' ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 ${
                fee_status === 'unpaid' || isOverdue ? 'bg-[#dc3545] text-white' : 'bg-[#004182] text-white'
              }`}>
                {fee_status === 'unpaid' ? 'FEE OVERDUE / UNPAID' : 'MAINTENANCE CYCLE ACTIVE'}
              </span>
              <span className="text-xs font-mono font-bold text-[#6C757D]">
                Total Received: {donation_count ?? 0} donations (৳{(total_raised ?? 0).toLocaleString()})
              </span>
            </div>
            <h4 className="font-bold text-sm text-[#212529] mt-1">
              Bi-Weekly Platform Maintenance Assessment: ৳250 / 14 Days
            </h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#212529]">
              <Clock className="w-3.5 h-3.5 text-[#6C757D]" />
              {next_fee_due_date ? (
                <span>
                  Next Assessment Due Date:{' '}
                  <strong className="font-mono">
                    {new Date(next_fee_due_date).toLocaleDateString()} (
                    {daysRemaining !== null && daysRemaining > 0
                      ? `${daysRemaining} days remaining`
                      : 'Due Today / In Arrears'}
                    )
                  </strong>
                </span>
              ) : (
                <span>Next assessment calculation pending</span>
              )}
            </div>
            <p className="text-[11px] text-[#6C757D] mt-0.5">
              Fees cover database verification, bKash & Nagad ledger auditing, and directory prominence.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <button
            onClick={() => onPayFee(organization.ngo_id)}
            className="flex items-center justify-center gap-1.5 bg-[#198754] text-white px-4 py-2 text-xs font-bold border border-[#146c43] hover:bg-[#146c43] cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pay ৳250 Assessment</span>
          </button>
          <span className="text-[10px] text-[#6C757D]">MFS Instant Clearance</span>
        </div>
      </div>
    </div>
  );
};
