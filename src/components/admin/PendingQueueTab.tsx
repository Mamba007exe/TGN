import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Profile, Organization } from '../../types';

interface PendingQueueTabProps {
  pendingNgos: Profile[];
  organizations: Organization[];
  onApproveNgo: (id: string) => void;
  onRejectNgo: (id: string) => void;
}

export const PendingQueueTab: React.FC<PendingQueueTabProps> = ({
  pendingNgos,
  organizations,
  onApproveNgo,
  onRejectNgo,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-sm uppercase text-[#004182]">
            Pending NGO Verification Requests
          </h3>
          <p className="text-xs text-[#6C757D]">
            Review unverified NGO registrations. Approving issues the verified badge (#FFC107) and activates public feed broadcasting.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-[#6C757D]">
          Pending Count: {pendingNgos.length}
        </span>
      </div>

      {pendingNgos.length === 0 ? (
        <div className="p-8 text-center bg-[#E9ECEF] border border-[#CED4DA]">
          <CheckCircle2 className="w-8 h-8 text-[#198754] mx-auto mb-2" />
          <div className="text-xs font-bold text-[#212529]">Queue Clear</div>
          <div className="text-xs text-[#6C757D]">
            No pending NGO profiles awaiting review at this time.
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#CED4DA] border border-[#CED4DA]">
          {pendingNgos.map((ngo) => {
            const relatedOrg = organizations.find((o) => o.ngo_id === ngo.id);
            return (
              <div key={ngo.id} className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#212529]">{ngo.name}</span>
                    <span className="px-1.5 py-0.5 bg-[#FFC107] text-[#212529] text-[10px] font-bold uppercase">
                      STATUS: PENDING
                    </span>
                  </div>
                  <div className="text-xs text-[#6C757D] space-x-2">
                    <span>Phone: <strong className="font-mono text-[#212529]">{ngo.phone}</strong></span>
                    <span>•</span>
                    <span>Address: {ngo.address || 'Not specified'}</span>
                  </div>
                  <div className="text-xs font-mono text-[#6C757D]">
                    bKash: {ngo.bkash_no || 'None'} | Nagad: {ngo.nagad_no || 'None'} | Registered: {new Date(ngo.created_at).toLocaleDateString()}
                  </div>
                  {relatedOrg && (
                    <div className="text-xs bg-[#E9ECEF] p-1.5 border border-[#CED4DA] mt-1">
                      Org Record: <span className="font-bold">{relatedOrg.name}</span> (Director: {relatedOrg.director_name})
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#CED4DA]">
                  <button
                    onClick={() => onApproveNgo(ngo.id)}
                    className="flex items-center justify-center gap-1.5 bg-[#198754] text-white px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#146c43] cursor-pointer min-h-[44px] touch-manipulation"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Verify</span>
                  </button>
                  <button
                    onClick={() => onRejectNgo(ngo.id)}
                    className="flex items-center justify-center gap-1.5 bg-[#dc3545] text-white px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#b02a37] cursor-pointer min-h-[44px] touch-manipulation"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
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
