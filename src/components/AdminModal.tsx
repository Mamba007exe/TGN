import React, { useState } from 'react';
import { X, ShieldAlert, Lock, Loader2 } from 'lucide-react';
import { dataStore } from '../lib/supabaseClient';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminAuthenticated: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onAdminAuthenticated,
}) => {
  const [passcode, setPasscode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setIsAuthenticating(true);
    setErrorMessage(null);

    const result = await dataStore.verifyAdminPasscode(passcode.trim());
    setIsAuthenticating(false);

    if (result.success) {
      setPasscode('');
      onAdminAuthenticated();
      onClose();
    } else {
      setErrorMessage(result.error || 'Invalid master credentials. Access denied.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm bg-white border-2 border-[#CED4DA] p-0 text-[#212529]">
        {/* Header */}
        <div className="bg-[#212529] text-white px-5 py-3.5 flex items-center justify-between border-b border-black">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#FFC107]" />
            <h3 className="font-extrabold text-sm uppercase tracking-wide">
              Admin Governance Gateway
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-[#E9ECEF] border border-[#CED4DA] p-3 text-xs text-[#212529]">
            <p>
              Restricted platform overseer console. Authorization key is verified securely by the server backend with cryptographic token generation.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
              Master Admin Passcode
            </label>
            <div className="relative">
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={isAuthenticating}
                placeholder="Enter Master Admin Passcode"
                className="w-full p-2.5 bg-white border border-[#CED4DA] text-base sm:text-xs font-mono text-[#212529] focus:outline-none focus:border-[#004182] min-h-[44px]"
                autoFocus
                required
              />
              {isAuthenticating && (
                <div className="absolute right-3 top-3">
                  <Loader2 className="w-4 h-4 text-[#004182] animate-spin" />
                </div>
              )}
            </div>
            {errorMessage && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#dc3545] font-bold">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Action Row: Cancel on left, Admit button remaining in place on right but completely invisible */}
          <div className="pt-2 border-t border-[#CED4DA] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isAuthenticating}
              className="px-4 py-2.5 text-xs font-bold uppercase text-[#6C757D] border border-[#CED4DA] hover:bg-[#E9ECEF] cursor-pointer min-h-[44px] touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAuthenticating}
              className="flex-1 py-2.5 px-4 text-xs font-bold uppercase tracking-wider opacity-0 cursor-pointer select-none min-h-[44px]"
              aria-label="Admit"
              title=""
            >
              {isAuthenticating ? 'Verifying...' : 'Admit & Enter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
