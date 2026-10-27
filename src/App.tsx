/**
 * The Goodwill Network
 * Strictly solid, flat UI • Zero gradients • Zero shadows • Pointy edges
 * High-Integrity Philanthropic Platform
 */

import React, { useState, useEffect } from 'react';
import { dataStore } from './lib/supabaseClient';
import { Profile, Organization, Post, Donation, Notice } from './types';
import { Navbar } from './components/Navbar';
import { ImpactFeed } from './components/ImpactFeed';
import { OrganizationsDirectory } from './components/OrganizationsDirectory';
import { BenefactorsList } from './components/BenefactorsList';
import { NoticesView } from './components/NoticesView';
import { DonationModal } from './components/DonationModal';
import { CreatePostModal } from './components/CreatePostModal';
import { RegisterOrgModal } from './components/RegisterOrgModal';
import { AuthModal } from './components/AuthModal';
import { AdminModal } from './components/AdminModal';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'feed' | 'directory' | 'benefactors' | 'notices'>('feed');

  // Reactive state from data store
  const [profiles, setProfiles] = useState<Profile[]>(dataStore.getProfiles());
  const [organizations, setOrganizations] = useState<Organization[]>(dataStore.getOrganizations());
  const [posts, setPosts] = useState<Post[]>(dataStore.getPosts());
  const [donations, setDonations] = useState<Donation[]>(dataStore.getDonations());
  const [notices, setNotices] = useState<Notice[]>(dataStore.getNotices());
  const [currentUser, setCurrentUser] = useState<Profile | null>(dataStore.currentUser);

  // Modals & Panels
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'pending' | 'ledger' | 'fees' | 'moderation' | 'notices' | 'supabase'>('pending');
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [selectedDonationOrg, setSelectedDonationOrg] = useState<Organization | null>(null);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isRegisterOrgOpen, setIsRegisterOrgOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = dataStore.subscribe(() => {
      setProfiles(dataStore.getProfiles());
      setOrganizations(dataStore.getOrganizations());
      setPosts(dataStore.getPosts());
      setDonations(dataStore.getDonations());
      setNotices(dataStore.getNotices());
      setCurrentUser(dataStore.currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Actions
  const handleOpenDonate = (org: Organization) => {
    setSelectedDonationOrg(org);
    setIsDonationOpen(true);
  };

  const handleConfirmDonation = (data: {
    donor_id: string;
    ngo_id: string;
    amount: number;
    method: 'bKash' | 'Nagad';
    mfs_account: string;
    reference: string;
    verification_hash?: string;
  }) => {
    dataStore.recordDonation(data);
  };

  const handleAdminAuthenticated = () => {
    const adminProfile = profiles.find((p) => p.role === 'admin');
    if (adminProfile) {
      dataStore.setCurrentUser(adminProfile);
    }
    setShowAdminDashboard(true);
  };

  return (
    <div className="min-h-screen bg-[#E9ECEF] flex flex-col justify-between font-sans text-[#212529]">
      <div>
        {/* Navigation Bar */}
        <Navbar
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            if (tab === 'directory') setSelectedOrgId(null);
            setCurrentTab(tab);
          }}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenAdmin={() => {
            if (currentUser?.role === 'admin') {
              setShowAdminDashboard(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setIsAdminAuthOpen(true);
            }
          }}
          onOpenNewPost={() => setIsNewPostOpen(true)}
          onSignOut={() => {
            dataStore.logout();
            setShowAdminDashboard(false);
          }}
        />

        {/* Main Workspace Container */}
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-20 md:pb-8">
          {/* Admin Dashboard view: STRICTLY LOCKED to authenticated admin */}
          {currentUser?.role === 'admin' && showAdminDashboard && (
            <AdminDashboard
              initialTab={adminInitialTab}
              profiles={profiles}
              organizations={organizations}
              posts={posts}
              donations={donations}
              notices={notices}
              onApproveNgo={(id) => dataStore.updateProfileStatus(id, 'approved')}
              onRejectNgo={(id) => dataStore.updateProfileStatus(id, 'rejected')}
              onRestrictProfile={(id) => dataStore.updateProfileStatus(id, 'restricted')}
              onUnrestrictProfile={(id) => dataStore.updateProfileStatus(id, 'approved')}
              onDeleteProfile={(id) => dataStore.deleteProfile(id)}
              onDeletePost={(id) => dataStore.deletePost(id)}
              onCreateNotice={(title, content) => dataStore.createNotice(title, content)}
              onDeleteNotice={(id) => dataStore.deleteNotice(id)}
              onToggleFeeStatus={(orgId, status) => dataStore.updateFeeStatus(orgId, status)}
              onCloseAdminView={() => setShowAdminDashboard(false)}
            />
          )}

          {/* EXACTLY 4 TABS ROUTING */}
          {currentTab === 'feed' && (
            <ImpactFeed
              posts={posts}
              profiles={profiles}
              organizations={organizations}
              donations={donations}
              notices={notices}
              currentUser={currentUser}
              onOpenNewPost={() => setIsNewPostOpen(true)}
              onOpenDonate={handleOpenDonate}
              onOpenRegisterOrg={() => setIsRegisterOrgOpen(true)}
              onPayFee={(ngoId) => dataStore.payOrganizationFee(ngoId)}
              onOpenAuth={() => setIsAuthOpen(true)}
              onSelectTab={(tab) => {
                if (tab === 'directory') setSelectedOrgId(null);
                setCurrentTab(tab);
              }}
              onSelectOrgProfile={(orgId) => {
                setSelectedOrgId(orgId);
                setCurrentTab('directory');
              }}
            />
          )}

          {currentTab === 'directory' && (
            <OrganizationsDirectory
              organizations={organizations}
              profiles={profiles}
              posts={posts}
              donations={donations}
              onOpenDonate={handleOpenDonate}
              selectedOrgId={selectedOrgId}
              onSelectOrgId={setSelectedOrgId}
            />
          )}

          {currentTab === 'benefactors' && (
            <BenefactorsList
              profiles={profiles}
              donations={donations}
              currentUser={currentUser}
              onOpenDonateModal={() => {
                const firstApproved = organizations[0];
                if (firstApproved) {
                  handleOpenDonate(firstApproved);
                }
              }}
            />
          )}

          {currentTab === 'notices' && (
            <NoticesView
              notices={notices}
              currentUser={currentUser}
              onOpenAdmin={() => {
                if (currentUser?.role === 'admin') {
                  setShowAdminDashboard(true);
                } else {
                  setIsAdminAuthOpen(true);
                }
              }}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <Footer
        onOpenAdmin={() => {
          if (currentUser?.role === 'admin') {
            setShowAdminDashboard(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            setIsAdminAuthOpen(true);
          }
        }}
        onResetData={() => dataStore.resetToDefaults()}
        onSelectTab={(tab) => setCurrentTab(tab)}
      />

      {/* MODALS */}

      {/* 1. MFS Donation Modal */}
      <DonationModal
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
        targetOrg={selectedDonationOrg}
        organizations={organizations.filter((org) => {
          const profile = profiles.find((p) => p.id === org.ngo_id);
          return profile?.status === 'approved';
        })}
        currentUser={currentUser}
        onConfirmDonation={handleConfirmDonation}
        onOpenAuth={() => {
          setIsDonationOpen(false);
          setIsAuthOpen(true);
        }}
      />

      {/* 2. NGO Post Creation Modal */}
      {currentUser && (
        <CreatePostModal
          isOpen={isNewPostOpen}
          onClose={() => setIsNewPostOpen(false)}
          currentUser={currentUser}
          onCreatePost={(data) => dataStore.createPost(data)}
        />
      )}

      {/* 3. Register Organization Modal (when logged in as NGO) */}
      {currentUser && currentUser.role === 'ngo' && (
        <RegisterOrgModal
          isOpen={isRegisterOrgOpen}
          onClose={() => setIsRegisterOrgOpen(false)}
          currentUser={currentUser}
          onRegister={(data) => dataStore.registerOrganization(data)}
        />
      )}

      {/* 4. Auth Modal (Signup / Login with separate NGO & Benefactor databases) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSignUpNgo={(data) => dataStore.signUpNgo(data)}
        onSignUpBenefactor={(data) => dataStore.signUpBenefactor(data)}
        onLogin={(role, data) => dataStore.loginAccount(role, data)}
        onSignUp={(data) => dataStore.signUp(data)}
        onSelectExistingUser={(user) => dataStore.setCurrentUser(user)}
        existingProfiles={profiles}
        ngoAccounts={dataStore.getNgoAccounts()}
        benefactorAccounts={dataStore.getBenefactorAccounts()}
      />

      {/* 5. Admin Governance Modal */}
      <AdminModal
        isOpen={isAdminAuthOpen}
        onClose={() => setIsAdminAuthOpen(false)}
        onAdminAuthenticated={handleAdminAuthenticated}
      />
    </div>
  );
}
