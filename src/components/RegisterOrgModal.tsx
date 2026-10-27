import React, { useState } from 'react';
import { X, Building2, Upload, CheckCircle2 } from 'lucide-react';
import { Profile } from '../types';
import { compressImageFile } from '../lib/imageCompressor.ts';

interface RegisterOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile;
  onRegister: (data: {
    ngo_id: string;
    name: string;
    date_created: string;
    director_name: string;
    address: string;
    logo_url: string;
    bkash_no: string;
    nagad_no: string;
  }) => void;
}

export const RegisterOrgModal: React.FC<RegisterOrgModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRegister,
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [dateCreated, setDateCreated] = useState('2018-05-15');
  const [directorName, setDirectorName] = useState('');
  const [address, setAddress] = useState(currentUser.address || '');
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=400&q=80');
  const [bkashNo, setBkashNo] = useState(currentUser.bkash_no || currentUser.phone || '');
  const [nagadNo, setNagadNo] = useState(currentUser.nagad_no || currentUser.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (currentUser.role !== 'ngo') {
      setFormError('Access Denied: Only registered NGO accounts can create organizations.');
      return;
    }
    if (!name.trim() || !directorName.trim() || !address.trim() || !bkashNo.trim()) {
      setFormError('Please fill out all required fields marked with an asterisk (*).');
      return;
    }

    setIsSubmitting(true);
    onRegister({
      ngo_id: currentUser.id,
      name: name.trim(),
      date_created: dateCreated,
      director_name: directorName.trim(),
      address: address.trim(),
      logo_url: logoUrl,
      bkash_no: bkashNo.trim(),
      nagad_no: nagadNo.trim() || bkashNo.trim(),
    });

    setIsSubmitting(false);
    onClose();
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { dataUrl } = await compressImageFile(file, { maxWidth: 600, maxHeight: 600, quality: 0.85 });
        setLogoUrl(dataUrl);
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setLogoUrl(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2.5 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white border-2 border-[#CED4DA] p-0 text-[#212529] max-h-[94vh] overflow-y-auto my-auto shadow-xl">
        {/* Header */}
        <div className="bg-[#004182] text-white px-4 sm:px-5 py-3 flex items-center justify-between border-b border-[#002f5e] sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#FFC107]" />
            <h3 className="font-extrabold text-xs sm:text-base tracking-wide uppercase truncate">
              Register Organization (NGO Profile)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {formError && (
            <div className="bg-[#f8d7da] border border-[#dc3545] text-[#842029] p-3 text-xs font-bold">
              {formError}
            </div>
          )}
          <div className="bg-[#E9ECEF] border border-[#CED4DA] p-3 text-xs text-[#212529]">
            <p>
              Complete the verified organization filing. Once submitted, your organization profile will be linked to your NGO account (<strong className="font-mono">{currentUser.phone}</strong>) for transparent public listing.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
              Organization Legal / Operating Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bangladesh Rural Aid Society"
              className="w-full p-2 bg-white border border-[#CED4DA] text-xs font-bold text-[#212529] focus:outline-none focus:border-[#004182]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                Date Founded / Created *
              </label>
              <input
                type="date"
                value={dateCreated}
                onChange={(e) => setDateCreated(e.target.value)}
                className="w-full p-2 bg-white border border-[#CED4DA] text-xs text-[#212529] focus:outline-none focus:border-[#004182]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                Director / Executive Head *
              </label>
              <input
                type="text"
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                placeholder="Full Legal Name"
                className="w-full p-2 bg-white border border-[#CED4DA] text-xs text-[#212529] focus:outline-none focus:border-[#004182]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
              Registered Physical Headquarters Address *
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House, Road, Block, District"
              className="w-full p-2 bg-white border border-[#CED4DA] text-xs text-[#212529] focus:outline-none focus:border-[#004182]"
              required
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
              Official Organization Logo (PNG, JPG, WebP)
            </label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 border border-[#CED4DA] bg-[#E9ECEF] flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-[#6C757D]" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="w-full text-xs text-[#6C757D] file:mr-2 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-bold file:bg-[#004182] file:text-white hover:file:bg-[#003366] cursor-pointer"
                />
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Or paste public logo URL"
                  className="w-full p-1.5 bg-white border border-[#CED4DA] text-xs text-[#212529] font-mono focus:outline-none focus:border-[#004182]"
                />
              </div>
            </div>
          </div>

          {/* MFS numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                Official bKash Account No *
              </label>
              <input
                type="text"
                value={bkashNo}
                onChange={(e) => setBkashNo(e.target.value)}
                placeholder="e.g. 017XXXXXXXX"
                className="w-full p-2 bg-white border border-[#CED4DA] text-xs font-mono text-[#212529] focus:outline-none focus:border-[#004182]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                Official Nagad Account No *
              </label>
              <input
                type="text"
                value={nagadNo}
                onChange={(e) => setNagadNo(e.target.value)}
                placeholder="e.g. 018XXXXXXXX"
                className="w-full p-2 bg-white border border-[#CED4DA] text-xs font-mono text-[#212529] focus:outline-none focus:border-[#004182]"
                required
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#CED4DA] flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold uppercase text-[#6C757D] border border-[#CED4DA] hover:bg-[#E9ECEF] cursor-pointer min-h-[44px] touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-[#004182] text-white text-xs font-extrabold uppercase tracking-wider hover:bg-[#003366] cursor-pointer min-h-[44px] touch-manipulation"
            >
              Submit Organization Registration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
