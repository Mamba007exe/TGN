import React from 'react';

interface FooterProps {
  onOpenAdmin: () => void;
  onResetData?: () => void;
  onSelectTab: (tab: 'feed' | 'directory' | 'benefactors' | 'notices') => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenAdmin,
  onSelectTab,
}) => {
  return (
    <footer className="w-full bg-[#E9ECEF] border-t border-[#CED4DA] mt-8 sm:mt-12 pt-6 sm:pt-8 pb-24 md:pb-8 text-[#6C757D] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#CED4DA] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-[#004182] text-white flex items-center justify-center font-black text-[10px]">
                GW
              </span>
              <span className="font-extrabold text-sm text-[#004182] tracking-tight">
                THE GOODWILL NETWORK
              </span>
            </div>
            <p className="text-[11px] text-[#6C757D] max-w-md">
              A lean SaaS platform connecting verified NGOs, benefactors, and administrative governance with transparent donation tracking, MFS integration, and automated fee scheduling.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <button
              onClick={() => onSelectTab('feed')}
              className="hover:text-[#004182] cursor-pointer"
            >
              Impact Feed
            </button>
            <button
              onClick={() => onSelectTab('directory')}
              className="hover:text-[#004182] cursor-pointer"
            >
              Organizations
            </button>
            <button
              onClick={() => onSelectTab('benefactors')}
              className="hover:text-[#004182] cursor-pointer"
            >
              Benefactors
            </button>
            <button
              onClick={() => onSelectTab('notices')}
              className="hover:text-[#004182] cursor-pointer"
            >
              Notices
            </button>
          </div>
        </div>

        {/* Bottom row with low-contrast footer links and admin login */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-[#6C757D]">
          <div>
            © {new Date().getFullYear()} The Goodwill Network.
          </div>

          <div className="flex items-center gap-3">
            <span>Verified Philanthropic Data Platform</span>
            {/* Admin access button remains in place but completely invisible */}
            <button
              onClick={onOpenAdmin}
              className="opacity-0 select-none cursor-default text-[11px] p-0 m-0 bg-transparent border-0"
              aria-label="Admin Access"
              title=""
            >
              Admin Access
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
