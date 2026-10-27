import React, { useState } from 'react';
import { ShieldCheck, Newspaper, Building2, Users, Bell, LogIn, PlusCircle, Shield, LogOut } from 'lucide-react';
import { Profile } from '../types';

interface NavbarProps {
  currentTab: 'feed' | 'directory' | 'benefactors' | 'notices';
  setCurrentTab: (tab: 'feed' | 'directory' | 'benefactors' | 'notices') => void;
  currentUser: Profile | null;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  onOpenNewPost: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onOpenAuth,
  onOpenAdmin,
  onOpenNewPost,
  onSignOut,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <>
      <header className="w-full bg-[#004182] text-white border-b border-[#002f5e] sticky top-0 z-40">
        {/* Main Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo & Identity */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => setCurrentTab('feed')}
                className="flex items-center gap-2 text-left hover:opacity-95 cursor-pointer bg-transparent border-0 p-0 text-white min-h-[44px]"
                aria-label="The Goodwill Network Home"
              >
                <div className="w-8 h-8 bg-white text-[#004182] flex items-center justify-center font-black text-lg tracking-tighter border border-white shrink-0 aspect-square">
                  GW
                </div>
                <div>
                  <div className="font-extrabold text-sm sm:text-base tracking-tight leading-none text-white whitespace-nowrap">
                    THE GOODWILL NETWORK
                  </div>
                  <div className="text-[9px] sm:text-[10px] tracking-wider text-slate-300 uppercase leading-none mt-0.5 whitespace-nowrap">
                    Lean Philanthropy SaaS
                  </div>
                </div>
              </button>
            </div>

            {/* DESKTOP: EXACTLY 4 TABS (Hidden on mobile phones, shown on md and above) */}
            <nav className="hidden md:flex items-center h-full">
              <button
                onClick={() => setCurrentTab('feed')}
                className={`h-14 px-3 sm:px-4 flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide border-b-4 transition-colors cursor-pointer whitespace-nowrap ${
                  currentTab === 'feed'
                    ? 'border-[#FFC107] text-white bg-[#003870]'
                    : 'border-transparent text-slate-200 hover:text-white hover:bg-[#003870]'
                }`}
              >
                <Newspaper className="w-4 h-4 shrink-0" />
                <span>Impact Feed</span>
              </button>

              <button
                onClick={() => setCurrentTab('directory')}
                className={`h-14 px-3 sm:px-4 flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide border-b-4 transition-colors cursor-pointer whitespace-nowrap ${
                  currentTab === 'directory'
                    ? 'border-[#FFC107] text-white bg-[#003870]'
                    : 'border-transparent text-slate-200 hover:text-white hover:bg-[#003870]'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span>Organizations</span>
              </button>

              <button
                onClick={() => setCurrentTab('benefactors')}
                className={`h-14 px-3 sm:px-4 flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide border-b-4 transition-colors cursor-pointer whitespace-nowrap ${
                  currentTab === 'benefactors'
                    ? 'border-[#FFC107] text-white bg-[#003870]'
                    : 'border-transparent text-slate-200 hover:text-white hover:bg-[#003870]'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Benefactors</span>
              </button>

              <button
                onClick={() => setCurrentTab('notices')}
                className={`h-14 px-3 sm:px-4 flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide border-b-4 transition-colors cursor-pointer whitespace-nowrap ${
                  currentTab === 'notices'
                    ? 'border-[#FFC107] text-white bg-[#003870]'
                    : 'border-transparent text-slate-200 hover:text-white hover:bg-[#003870]'
                }`}
              >
                <Bell className="w-4 h-4 shrink-0" />
                <span>Notices</span>
              </button>
            </nav>

            {/* Right Action Area */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {currentUser?.role === 'ngo' && currentUser.status === 'approved' && (
                <button
                  onClick={onOpenNewPost}
                  className="flex items-center gap-1.5 bg-[#198754] text-white px-2.5 sm:px-3 py-1.5 text-xs font-bold border border-[#146c43] cursor-pointer hover:bg-[#146c43] min-h-[40px] touch-manipulation"
                  title="Publish Field Update"
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Publish Update</span>
                  <span className="sm:hidden text-[11px]">Post</span>
                </button>
              )}

              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-1.5 sm:gap-2 bg-[#003366] hover:bg-[#002852] px-2 sm:px-2.5 py-1.5 border border-[#084b8f] cursor-pointer text-left min-h-[40px] touch-manipulation"
                    aria-label="User Account Menu"
                  >
                    <div className="w-7 h-7 sm:w-6 sm:h-6 bg-white text-[#004182] font-black text-xs flex items-center justify-center shrink-0 aspect-square">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                        <span className="truncate max-w-[110px]">{currentUser.name}</span>
                        {currentUser.status === 'approved' && (
                          <ShieldCheck className="w-3 h-3 text-[#FFC107] shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-300 uppercase leading-none">
                        {currentUser.role} • {currentUser.status}
                      </div>
                    </div>
                  </button>

                  {showUserDropdown && (
                    <div className="absolute right-0 mt-1 w-64 max-w-[90vw] bg-white text-[#212529] border-2 border-[#CED4DA] z-50 p-2 shadow-lg">
                      <div className="p-2 border-b border-[#CED4DA] mb-2 bg-[#E9ECEF]">
                        <div className="text-xs font-bold text-[#004182]">{currentUser.name}</div>
                        <div className="text-[11px] text-[#6C757D]">{currentUser.phone}</div>
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-[#004182] text-white">
                            Role: {currentUser.role}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 ${
                            currentUser.status === 'approved' ? 'bg-[#FFC107] text-[#212529]' : 'bg-[#6C757D] text-white'
                          }`}>
                            {currentUser.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 py-1">
                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => {
                              setShowUserDropdown(false);
                              onOpenAdmin();
                            }}
                            className="w-full text-left text-xs px-2.5 py-2.5 bg-[#E9ECEF] hover:bg-slate-200 text-[#004182] font-bold flex items-center gap-2 cursor-pointer min-h-[44px]"
                          >
                            <Shield className="w-4 h-4 shrink-0" />
                            <span>Governance Dashboard</span>
                          </button>
                        )}

                        {currentUser.role === 'ngo' && currentUser.status === 'approved' && (
                          <button
                            onClick={() => {
                              setShowUserDropdown(false);
                              onOpenNewPost();
                            }}
                            className="w-full text-left text-xs px-2.5 py-2.5 bg-[#E9ECEF] hover:bg-slate-200 text-[#198754] font-bold flex items-center gap-2 cursor-pointer min-h-[44px]"
                          >
                            <PlusCircle className="w-4 h-4 shrink-0" />
                            <span>Publish Field Update</span>
                          </button>
                        )}
                      </div>

                      <div className="border-t border-[#CED4DA] pt-2">
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onSignOut();
                          }}
                          className="w-full text-left text-xs px-2.5 py-2.5 bg-[#E9ECEF] hover:bg-[#dc3545] hover:text-white font-bold transition-colors flex items-center gap-2 cursor-pointer min-h-[44px]"
                        >
                          <LogOut className="w-4 h-4 shrink-0" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onOpenAuth}
                    className="flex items-center gap-1.5 bg-white text-[#004182] px-3 sm:px-3.5 py-2 sm:py-1.5 text-xs font-bold border border-white cursor-pointer hover:bg-slate-100 min-h-[40px] touch-manipulation whitespace-nowrap"
                  >
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    <span>Join / Log In</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE FIXED BOTTOM TAB BAR (Navigation Anchor for phone users - thumb-zone optimized) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#CED4DA] md:hidden pb-safe shadow-[0_-2px_6px_rgba(0,0,0,0.06)]"
      >
        <div className="grid grid-cols-4 items-center h-14">
          <button
            type="button"
            onClick={() => setCurrentTab('feed')}
            className={`h-full flex flex-col items-center justify-center cursor-pointer transition-colors touch-manipulation border-t-2 ${
              currentTab === 'feed'
                ? 'border-[#004182] text-[#004182] bg-slate-50 font-black'
                : 'border-transparent text-[#6C757D] hover:text-[#212529] font-medium'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-tight mt-0.5">Feed</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('directory')}
            className={`h-full flex flex-col items-center justify-center cursor-pointer transition-colors touch-manipulation border-t-2 ${
              currentTab === 'directory'
                ? 'border-[#004182] text-[#004182] bg-slate-50 font-black'
                : 'border-transparent text-[#6C757D] hover:text-[#212529] font-medium'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-tight mt-0.5">NGOs</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('benefactors')}
            className={`h-full flex flex-col items-center justify-center cursor-pointer transition-colors touch-manipulation border-t-2 ${
              currentTab === 'benefactors'
                ? 'border-[#004182] text-[#004182] bg-slate-50 font-black'
                : 'border-transparent text-[#6C757D] hover:text-[#212529] font-medium'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-tight mt-0.5">Benefactors</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('notices')}
            className={`h-full flex flex-col items-center justify-center cursor-pointer transition-colors touch-manipulation border-t-2 ${
              currentTab === 'notices'
                ? 'border-[#004182] text-[#004182] bg-slate-50 font-black'
                : 'border-transparent text-[#6C757D] hover:text-[#212529] font-medium'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-tight mt-0.5">Notices</span>
          </button>
        </div>
      </nav>
    </>
  );
};
