import React, { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { Organization, Profile } from '../types';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetOrg: Organization | null;
  organizations: Organization[];
  currentUser: Profile | null;
  onConfirmDonation: (data: {
    donor_id: string;
    ngo_id: string;
    amount: number;
    method: 'bKash' | 'Nagad';
    mfs_account: string;
    reference: string;
    verification_hash?: string;
  }) => void;
  onOpenAuth?: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  onClose,
  targetOrg,
  organizations,
  currentUser,
  onConfirmDonation,
}) => {
  const [selectedNgoId, setSelectedNgoId] = useState<string>(
    targetOrg?.ngo_id || (organizations[0]?.ngo_id || '')
  );
  const [phone, setPhone] = useState<string>(currentUser?.phone || '');
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedAmount, setSubmittedAmount] = useState<number>(0);

  // Sync selected org when targetOrg or organizations change
  useEffect(() => {
    if (targetOrg) {
      setSelectedNgoId(targetOrg.ngo_id);
    } else if (organizations.length > 0 && !selectedNgoId) {
      setSelectedNgoId(organizations[0].ngo_id);
    }
    if (currentUser?.phone && !phone) {
      setPhone(currentUser.phone);
    }
  }, [targetOrg, organizations, currentUser]);

  if (!isOpen) return null;

  const currentOrg =
    organizations.find((o) => o.ngo_id === selectedNgoId) ||
    targetOrg ||
    organizations[0];

  const handleClose = () => {
    setError(null);
    setIsSuccess(false);
    onClose();
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate phone number (Bangladesh 11-digit mobile format: 013-019)
    const cleanPhone = phone.replace(/[\s-]/g, '').trim();
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      setError('Please enter a valid 11-digit Bangladesh phone number (e.g. 017XXXXXXXX, 018XXXXXXXX, 019XXXXXXXX).');
      return;
    }

    // Validate donation amount
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < 50 || numAmount > 500000) {
      setError('Amount must be between ৳50 and ৳500,000.');
      return;
    }

    if (!currentOrg) {
      setError('Please select an organization to receive the donation.');
      return;
    }

    const donorId = currentUser?.id || 'p-benefactor-2';
    const reference = `MANUAL-${Date.now().toString(36).toUpperCase()}`;
    const verificationHash = `GW-MFS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Record the donation
    onConfirmDonation({
      donor_id: donorId,
      ngo_id: currentOrg.ngo_id,
      amount: numAmount,
      method: 'bKash',
      mfs_account: cleanPhone,
      reference,
      verification_hash: verificationHash,
    });

    setSubmittedAmount(numAmount);
    setIsSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white border-2 border-[#CED4DA] p-0 text-[#212529] shadow-xl my-auto">
        {/* Modal Header */}
        <div className="bg-[#004182] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#002f5e]">
          <h3 className="font-extrabold text-sm sm:text-base tracking-wide uppercase">
            Make a Donation
          </h3>
          <button
            onClick={handleClose}
            className="text-slate-300 hover:text-white p-1 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-[#198754] text-white flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-[#212529]">Donation Submitted</h4>
              <p className="text-xs text-[#6C757D] mt-1">
                Your donation of <strong className="text-[#212529]">৳{submittedAmount.toLocaleString()}</strong> to{' '}
                <strong className="text-[#004182]">{currentOrg?.name}</strong> has been recorded in the platform ledger.
              </p>
            </div>
            <div className="p-3 bg-[#E9ECEF] border border-[#CED4DA] text-xs text-[#495057]">
              "Our project runs on kindness and Honesty, so no fake donations are expected."
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-[#004182] text-white text-xs font-bold uppercase hover:bg-[#002f5e] cursor-pointer min-h-[44px]"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleFinish} className="p-5 sm:p-6 space-y-4">
            {error && (
              <div className="bg-[#f8d7da] border border-[#dc3545] text-[#842029] p-3 text-xs font-bold">
                {error}
              </div>
            )}

            {/* If opening donation generally without a locked target org, show select */}
            {!targetOrg && organizations.length > 1 && (
              <div>
                <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                  Recipient Organization:
                </label>
                <select
                  value={selectedNgoId}
                  onChange={(e) => setSelectedNgoId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CED4DA] text-xs font-bold text-[#212529] focus:outline-none focus:border-[#004182] min-h-[44px]"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.ngo_id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 1. Enter your Bkash/Nagad Number: */}
            <div>
              <label className="block text-xs font-extrabold uppercase text-[#212529] mb-1.5">
                Enter your Bkash/Nagad Number:
              </label>
              <input
                type="tel"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="01XXXXXXXXX"
                required
                className="w-full p-3 bg-white border border-[#CED4DA] text-sm font-mono text-[#212529] focus:outline-none focus:border-[#004182] min-h-[44px]"
              />
            </div>

            {/* 2. Amount: */}
            <div>
              <label className="block text-xs font-extrabold uppercase text-[#212529] mb-1.5">
                Amount:
              </label>
              <input
                type="number"
                min="50"
                max="500000"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount (৳)"
                required
                className="w-full p-3 bg-white border border-[#CED4DA] text-sm font-bold text-[#212529] focus:outline-none focus:border-[#004182] min-h-[44px]"
              />
            </div>

            {/* 3. The organization's Bkash/Nagad number will be shown: */}
            <div className="bg-[#F8F9FA] border border-[#CED4DA] p-3.5 space-y-2">
              <div className="text-xs font-extrabold uppercase text-[#495057]">
                The organization's Bkash/Nagad number:
              </div>
              {currentOrg && (
                <div className="text-xs font-bold text-[#004182]">
                  {currentOrg.name}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-white p-2.5 border border-[#CED4DA]">
                  <div className="text-[11px] font-bold text-[#E2136E]">bKash Number:</div>
                  <div className="font-extrabold text-sm text-[#212529] select-all mt-0.5">
                    {currentOrg?.bkash_no || '01713000101'}
                  </div>
                </div>
                <div className="bg-white p-2.5 border border-[#CED4DA]">
                  <div className="text-[11px] font-bold text-[#F7941D]">Nagad Number:</div>
                  <div className="font-extrabold text-sm text-[#212529] select-all mt-0.5">
                    {currentOrg?.nagad_no || '01813000101'}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Notice box below */}
            <div className="bg-[#FFF3CD] border border-[#FFEBAA] text-[#664D03] p-3.5 text-xs leading-relaxed font-medium">
              You have to make the donations yourself manually, through your phone or PC, our project runs on kindness and Honesty, so no fake donations are expected.
            </div>

            {/* 5. Finally a button: "Finish" */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-[#198754] text-white text-sm font-extrabold uppercase tracking-wider border border-[#146c43] hover:bg-[#146c43] cursor-pointer min-h-[44px] transition-colors"
              >
                Finish
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
