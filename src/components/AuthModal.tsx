import React, { useState, useRef } from 'react';
import {
  X,
  UserCheck,
  HeartHandshake,
  Building2,
  Phone,
  AlertCircle,
  LogIn,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  Lock,
  User,
  MapPin,
  CheckCircle2,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Profile, NgoAccount, BenefactorAccount } from '../types';
import { compressImageFile } from '../lib/imageCompressor.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUpNgo?: (data: {
    name: string;
    picture: string;
    director_name: string;
    phone: string;
    address: string;
    bkash_no?: string;
    nagad_no?: string;
    password: string;
  }) => Promise<NgoAccount> | NgoAccount;
  onSignUpBenefactor?: (data: {
    name: string;
    phone: string;
    picture: string;
    bkash_no?: string;
    nagad_no?: string;
    password: string;
  }) => Promise<BenefactorAccount> | BenefactorAccount;
  onLogin?: (
    role: 'ngo' | 'benefactor',
    credentials: { name: string; phone: string; password: string }
  ) => Promise<Profile> | Profile;
  onSignUp?: (data: any) => void;
  onSelectExistingUser: (user: Profile) => void;
  existingProfiles: Profile[];
  ngoAccounts?: NgoAccount[];
  benefactorAccounts?: BenefactorAccount[];
}

// Curated high quality presets for quick selection
const NGO_PICTURE_PRESETS = [
  { label: 'Relief Hands', url: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=400&q=80' },
  { label: 'Medical Care', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80' },
  { label: 'Community Aid', url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=400&q=80' },
  { label: 'Child Education', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80' },
];

const BENEFACTOR_PICTURE_PRESETS = [
  { label: 'Avatar 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
  { label: 'Avatar 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' },
  { label: 'Avatar 3', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80' },
  { label: 'Avatar 4', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80' },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSignUpNgo,
  onSignUpBenefactor,
  onLogin,
  onSignUp,
  onSelectExistingUser,
  existingProfiles,
  ngoAccounts = [],
  benefactorAccounts = [],
}) => {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [role, setRole] = useState<'ngo' | 'benefactor'>('ngo');

  // Shared / Common Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+8801');
  const [picture, setPicture] = useState('');
  const [bkashNo, setBkashNo] = useState('');
  const [nagadNo, setNagadNo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // NGO-Specific Fields
  const [directorName, setDirectorName] = useState('');
  const [address, setAddress] = useState('');

  // Login Mode State
  const [loginRole, setLoginRole] = useState<'ngo' | 'benefactor'>('ngo');
  const [loginName, setLoginName] = useState('');
  const [loginPhone, setLoginPhone] = useState('+8801');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Error & Status States
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local file upload with automated compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { dataUrl } = await compressImageFile(file, { maxWidth: 600, maxHeight: 600, quality: 0.85 });
        setPicture(dataUrl);
        setError(null);
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setPicture(reader.result);
            setError(null);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Sign Up submission handler
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Mandatory bKash or Nagad check (either 1 is mandatory, both fine)
    const hasBkash = Boolean(bkashNo.trim());
    const hasNagad = Boolean(nagadNo.trim());
    if (!hasBkash && !hasNagad) {
      setError('MFS Number Required: You must provide either a bKash number or a Nagad number (or both).');
      return;
    }

    // 2. Picture validation
    if (!picture.trim()) {
      setError('Picture is required. Please upload an image, select a preset, or enter an image URL.');
      return;
    }

    // 3. Password validation
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(`Registering ${role === 'ngo' ? 'Verified NGO' : 'Benefactor'} Account in Database...`);

    try {
      // 4. Role-specific validation & dispatch
      if (role === 'ngo') {
        if (!name.trim()) {
          setError('Organization / NGO Name is required.');
          setIsSubmitting(false);
          return;
        }
        if (!directorName.trim()) {
          setError('Director Name is required for NGO accounts.');
          setIsSubmitting(false);
          return;
        }
        if (!phone.trim() || phone.trim() === '+8801') {
          setError('Valid Mobile Phone Number is required.');
          setIsSubmitting(false);
          return;
        }
        if (!address.trim()) {
          setError('Operating Address is required for NGO accounts.');
          setIsSubmitting(false);
          return;
        }

        if (onSignUpNgo) {
          await onSignUpNgo({
            name: name.trim(),
            picture: picture.trim(),
            director_name: directorName.trim(),
            phone: phone.trim(),
            address: address.trim(),
            bkash_no: bkashNo.trim() || undefined,
            nagad_no: nagadNo.trim() || undefined,
            password,
          });
        } else if (onSignUp) {
          await onSignUp({
            role: 'ngo',
            name: name.trim(),
            picture: picture.trim(),
            director_name: directorName.trim(),
            phone: phone.trim(),
            address: address.trim(),
            bkash_no: bkashNo.trim() || undefined,
            nagad_no: nagadNo.trim() || undefined,
            password,
          });
        }
      } else {
        // Benefactor sign up
        if (!name.trim()) {
          setError('Benefactor Full Name is required.');
          setIsSubmitting(false);
          return;
        }
        if (!phone.trim() || phone.trim() === '+8801') {
          setError('Valid Mobile Phone Number is required.');
          setIsSubmitting(false);
          return;
        }

        if (onSignUpBenefactor) {
          await onSignUpBenefactor({
            name: name.trim(),
            phone: phone.trim(),
            picture: picture.trim(),
            bkash_no: bkashNo.trim() || undefined,
            nagad_no: nagadNo.trim() || undefined,
            password,
          });
        } else if (onSignUp) {
          await onSignUp({
            role: 'benefactor',
            name: name.trim(),
            phone: phone.trim(),
            picture: picture.trim(),
            bkash_no: bkashNo.trim() || undefined,
            nagad_no: nagadNo.trim() || undefined,
            password,
          });
        }
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
      setStatusMessage(null);
    }
  };

  // Login submission handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginName.trim()) {
      setError('Name is required to log in.');
      return;
    }
    if (!loginPhone.trim() || loginPhone.trim() === '+8801') {
      setError('Phone Number is required to log in.');
      return;
    }
    if (!loginPassword) {
      setError('Password is required to log in.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(`Searching ${loginRole.toUpperCase()} Account Database...`);

    try {
      if (onLogin) {
        const user = await onLogin(loginRole, {
          name: loginName.trim(),
          phone: loginPhone.trim(),
          password: loginPassword,
        });
        if (user) {
          onClose();
          return;
        }
      }

      // Local fallback verification against existing profiles & account lists
      const cleanPhone = loginPhone.trim().replace(/\D/g, '');
      const cleanName = loginName.trim().toLowerCase();

      const candidateList =
        loginRole === 'ngo'
          ? (ngoAccounts.length > 0 ? ngoAccounts : existingProfiles.filter((p) => p.role === 'ngo'))
          : (benefactorAccounts.length > 0 ? benefactorAccounts : existingProfiles.filter((p) => p.role === 'benefactor'));

      const user = candidateList.find((p) => {
        const pClean = p.phone.replace(/\D/g, '');
        const nClean = p.name.trim().toLowerCase();
        return (pClean === cleanPhone || p.phone.trim() === loginPhone.trim()) && nClean === cleanName;
      });

      if (!user) {
        setError(
          `No registered ${loginRole.toUpperCase()} account found matching Name "${loginName}" and Mobile "${loginPhone}". Please check your details or create an account.`
        );
        return;
      }

      if (user.password && user.password !== loginPassword) {
        setError('Incorrect password. Please verify your credentials.');
        return;
      }

      onSelectExistingUser(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
      setStatusMessage(null);
    }
  };

  const currentPresets = role === 'ngo' ? NGO_PICTURE_PRESETS : BENEFACTOR_PICTURE_PRESETS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2.5 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white border-2 border-[#CED4DA] p-0 text-[#212529] max-h-[94vh] overflow-y-auto my-auto shadow-xl">
        {/* Modal Header */}
        <div className="bg-[#004182] text-white px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-[#002f5e] sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#FFC107]" />
            <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-wide truncate">
              {mode === 'signup' ? 'Create Account' : 'Account Login'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Sign Up vs Login */}
        <div className="flex border-b border-[#CED4DA] bg-[#E9ECEF]">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors min-h-[44px] touch-manipulation ${
              mode === 'signup'
                ? 'bg-white text-[#004182] border-b-2 border-[#004182]'
                : 'text-[#6C757D] hover:text-[#212529]'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors min-h-[44px] touch-manipulation ${
              mode === 'login'
                ? 'bg-white text-[#004182] border-b-2 border-[#004182]'
                : 'text-[#6C757D] hover:text-[#212529]'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="m-4 mb-0 bg-[#f8d7da] border border-[#dc3545] text-[#842029] p-3 text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#dc3545] shrink-0 mt-0.5" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* ========================================================== */}
        {/* MODE 1: SIGN UP FORM */}
        {/* ========================================================== */}
        {mode === 'signup' ? (
          <form onSubmit={handleSignUpSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Account Type Selection */}
            <div>
              <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1.5">
                Select Account Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRole('ngo');
                    setError(null);
                    if (!picture || BENEFACTOR_PICTURE_PRESETS.some((p) => p.url === picture)) {
                      setPicture(NGO_PICTURE_PRESETS[0].url);
                    }
                  }}
                  className={`p-3 text-xs font-bold border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                    role === 'ngo'
                      ? 'bg-[#004182] text-white border-[#004182] ring-2 ring-[#004182]/20'
                      : 'bg-white text-[#212529] border-[#CED4DA] hover:bg-[#E9ECEF]'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="uppercase tracking-wide font-extrabold">NGO / Charity</span>
                  <span className="text-[10px] font-normal opacity-90">Director & Office Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole('benefactor');
                    setError(null);
                    if (!picture || NGO_PICTURE_PRESETS.some((p) => p.url === picture)) {
                      setPicture(BENEFACTOR_PICTURE_PRESETS[0].url);
                    }
                  }}
                  className={`p-3 text-xs font-bold border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                    role === 'benefactor'
                      ? 'bg-[#004182] text-white border-[#004182] ring-2 ring-[#004182]/20'
                      : 'bg-white text-[#212529] border-[#CED4DA] hover:bg-[#E9ECEF]'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span className="uppercase tracking-wide font-extrabold">Benefactor</span>
                  <span className="text-[10px] font-normal opacity-90">Individual Donor Account</span>
                </button>
              </div>
            </div>

            {/* Field: Name */}
            <div>
              <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                {role === 'ngo' ? 'Organization / NGO Name *' : 'Benefactor Full Name *'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'ngo' ? 'e.g. Bangladesh Rural Aid Society' : 'e.g. Rafiqul Islam'}
                  className="w-full p-2 bg-white border border-[#CED4DA] text-xs font-bold text-[#212529] focus:outline-none focus:border-[#004182]"
                  required
                />
              </div>
            </div>

            {/* Field: Director Name (Mandatory for NGO) */}
            {role === 'ngo' && (
              <div>
                <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                  Director Name *
                </label>
                <input
                  type="text"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                  placeholder="Full name of Managing Director / Chairperson"
                  className="w-full p-2 bg-white border border-[#CED4DA] text-xs text-[#212529] focus:outline-none focus:border-[#004182]"
                  required
                />
              </div>
            )}

            {/* Field: Phone Number */}
            <div>
              <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                Phone Number (Primary Login Identifier) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+8801XXXXXXXXX"
                  className="w-full p-2 bg-white border border-[#CED4DA] text-xs font-mono font-bold text-[#212529] focus:outline-none focus:border-[#004182]"
                  required
                />
              </div>
              <p className="text-[10px] text-[#6C757D] mt-0.5">
                Will be used with your Name & Password to log in.
              </p>
            </div>

            {/* Field: Address (Mandatory for NGO) */}
            {role === 'ngo' && (
              <div>
                <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                  Operating Office Address *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. House 42, Road 7, Dhanmondi, Dhaka-1205"
                  className="w-full p-2 bg-white border border-[#CED4DA] text-xs text-[#212529] focus:outline-none focus:border-[#004182]"
                  required
                />
              </div>
            )}

            {/* Field: Picture (Mandatory for both NGO and Benefactor) */}
            <div className="border border-[#CED4DA] p-3 bg-[#F8F9FA] space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase text-[#004182] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#004182]" />
                  <span>{role === 'ngo' ? 'Organization Logo / Picture *' : 'Profile Picture / Avatar *'}</span>
                </label>
                {picture && (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Picture Selected</span>
                  </span>
                )}
              </div>

              {/* Picture Preview and Upload button */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white border border-[#CED4DA] flex items-center justify-center overflow-hidden shrink-0">
                  {picture ? (
                    <img
                      src={picture}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setPicture('')}
                    />
                  ) : (
                    <User className="w-6 h-6 text-[#6C757D]" />
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#004182] hover:bg-[#003366] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Picture</span>
                    </button>
                    <span className="text-[10px] text-[#6C757D]">or paste link below</span>
                  </div>

                  <input
                    type="url"
                    value={picture}
                    onChange={(e) => setPicture(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full p-1.5 bg-white border border-[#CED4DA] text-[11px] text-[#212529] focus:outline-none focus:border-[#004182]"
                  />
                </div>
              </div>

              {/* Preset Quick Selectors */}
              <div className="pt-1 border-t border-[#CED4DA]/70">
                <div className="text-[10px] uppercase font-bold text-[#6C757D] mb-1">
                  Quick Sample Presets:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentPresets.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setPicture(preset.url)}
                      className={`px-2 py-0.5 text-[10px] font-bold border cursor-pointer transition-colors ${
                        picture === preset.url
                          ? 'bg-[#004182] text-white border-[#004182]'
                          : 'bg-white text-[#212529] border-[#CED4DA] hover:bg-[#E9ECEF]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Field: bKash or Nagad (include both fields, but either 1 is mandatory, both fine) */}
            <div className="border border-[#CED4DA] p-3 bg-[#F8F9FA] space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase text-[#004182]">
                  bKash or Nagad Accounts *
                </label>
                {(bkashNo.trim() || nagadNo.trim()) ? (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Payment MFS Valid</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[#dc3545]">
                    * At least 1 mandatory
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#6C757D] leading-tight">
                Provide either your bKash number or Nagad number. You may also provide both if you support both payment methods.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#6C757D] mb-0.5">
                    bKash Wallet Number {bkashNo.trim() && <span className="text-emerald-600 font-bold">✓</span>}
                  </label>
                  <input
                    type="text"
                    value={bkashNo}
                    onChange={(e) => setBkashNo(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full p-2 bg-white border border-[#CED4DA] text-xs font-mono text-[#212529] focus:outline-none focus:border-[#004182]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#6C757D] mb-0.5">
                    Nagad Wallet Number {nagadNo.trim() && <span className="text-emerald-600 font-bold">✓</span>}
                  </label>
                  <input
                    type="text"
                    value={nagadNo}
                    onChange={(e) => setNagadNo(e.target.value)}
                    placeholder="018XXXXXXXX"
                    className="w-full p-2 bg-white border border-[#CED4DA] text-xs font-mono text-[#212529] focus:outline-none focus:border-[#004182]"
                  />
                </div>
              </div>
            </div>

            {/* Field: Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 4 characters"
                    className="w-full p-2 pr-8 bg-white border border-[#CED4DA] text-xs text-[#212529] focus:outline-none focus:border-[#004182]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2.5 text-[#6C757D] hover:text-[#212529]"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full p-2 bg-white border border-[#CED4DA] text-xs text-[#212529] focus:outline-none focus:border-[#004182]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 bg-[#004182] hover:bg-[#003366] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-colors flex items-center justify-center gap-2 ${
                isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{statusMessage || 'Saving to database...'}</span>
                </>
              ) : (
                <span>
                  {role === 'ngo' ? 'Register Verified NGO Account' : 'Register Benefactor Account'}
                </span>
              )}
            </button>

            <div className="text-center pt-2 border-t border-[#CED4DA] text-xs text-[#6C757D]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="font-bold text-[#004182] hover:underline cursor-pointer"
              >
                Sign in here
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================== */
          /* MODE 2: LOGIN FORM */
          /* ========================================================== */
          <form onSubmit={handleLoginSubmit} className="p-5 space-y-4">
            <div className="bg-[#E9ECEF] border border-[#CED4DA] p-3 text-xs text-[#212529] space-y-1">
              <div className="font-bold uppercase text-[11px] text-[#004182]">
                Secure Account Sign In
              </div>
              <p className="text-[11px] text-[#6C757D]">
                Enter your registered <strong>Name</strong>, <strong>Phone Number</strong>, and <strong>Password</strong> to access your account.
              </p>
            </div>

            {/* Account Type Selector for Login */}
            <div>
              <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                Select Account Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginRole('ngo');
                    setError(null);
                  }}
                  className={`p-2.5 text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    loginRole === 'ngo'
                      ? 'bg-[#004182] text-white border-[#004182]'
                      : 'bg-white text-[#212529] border-[#CED4DA] hover:bg-[#E9ECEF]'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>NGO / Charity</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginRole('benefactor');
                    setError(null);
                  }}
                  className={`p-2.5 text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    loginRole === 'benefactor'
                      ? 'bg-[#004182] text-white border-[#004182]'
                      : 'bg-white text-[#212529] border-[#CED4DA] hover:bg-[#E9ECEF]'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>Benefactor (Donor)</span>
                </button>
              </div>
            </div>

            {/* Login Field: Name */}
            <div>
              <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                {loginRole === 'ngo' ? 'Registered Organization Name *' : 'Registered Full Name *'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => {
                    setLoginName(e.target.value);
                    setError(null);
                  }}
                  placeholder={loginRole === 'ngo' ? 'e.g. Bangladesh Rural Aid Society' : 'e.g. Rafiqul Islam'}
                  className="w-full p-2.5 bg-white border border-[#CED4DA] text-xs font-bold text-[#212529] focus:outline-none focus:border-[#004182]"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Login Field: Phone Number */}
            <div>
              <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                Registered Mobile Phone Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginPhone}
                  onChange={(e) => {
                    setLoginPhone(e.target.value);
                    setError(null);
                  }}
                  placeholder="+8801XXXXXXXXX"
                  className="w-full p-2.5 bg-white border border-[#CED4DA] text-xs font-mono font-bold text-[#212529] focus:outline-none focus:border-[#004182]"
                  required
                />
              </div>
            </div>

            {/* Login Field: Password */}
            <div>
              <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
                Account Password *
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your account password"
                  className="w-full p-2.5 pr-8 bg-white border border-[#CED4DA] text-xs text-[#212529] focus:outline-none focus:border-[#004182]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-2.5 top-3 text-[#6C757D] hover:text-[#212529]"
                >
                  {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 bg-[#004182] hover:bg-[#003366] text-white text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-colors ${
                isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{statusMessage || 'Searching Database...'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>
                    {loginRole === 'ngo' ? 'Log In to NGO Account' : 'Log In to Benefactor Account'}
                  </span>
                </>
              )}
            </button>

            <div className="pt-2 border-t border-[#CED4DA] flex items-center justify-between text-xs text-[#6C757D]">
              <span>Don't have an account yet?</span>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="font-bold text-[#004182] hover:underline cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
