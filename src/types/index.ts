export type UserRole = 'ngo' | 'benefactor' | 'admin';
export type ProfileStatus = 'pending' | 'approved' | 'rejected' | 'restricted';
export type FeeStatus = 'exempt' | 'active' | 'unpaid';
export type PaymentMethod = 'bKash' | 'Nagad';

export interface NgoAccount {
  id: string;
  role: 'ngo';
  name: string;
  picture: string;
  director_name: string;
  phone: string;
  address: string;
  bkash_no?: string | null;
  nagad_no?: string | null;
  password?: string | null;
  status: ProfileStatus;
  created_at: string;
}

export interface BenefactorAccount {
  id: string;
  role: 'benefactor';
  name: string;
  phone: string;
  picture: string;
  address?: string | null;
  director_name?: string | null;
  bkash_no?: string | null;
  nagad_no?: string | null;
  password?: string | null;
  status: ProfileStatus;
  created_at: string;
}

export interface AdminAccount {
  id: string;
  role: 'admin';
  name: string;
  phone: string;
  password?: string | null;
  picture?: string | null;
  address?: string | null;
  director_name?: string | null;
  bkash_no?: string | null;
  nagad_no?: string | null;
  status: ProfileStatus;
  created_at: string;
}

export type Profile = NgoAccount | BenefactorAccount | AdminAccount | {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  picture?: string | null;
  address?: string | null;
  director_name?: string | null;
  bkash_no?: string | null;
  nagad_no?: string | null;
  password?: string | null;
  status: ProfileStatus;
  created_at: string;
};

export interface Organization {
  id: string;
  ngo_id: string;
  name: string;
  date_created: string;
  director_name: string;
  address: string;
  logo_url: string;
  bkash_no: string;
  nagad_no: string;
  total_raised: number;
  donation_count: number;
  fee_status: FeeStatus;
  next_fee_due_date: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  ngo_id: string;
  caption: string;
  media_url: string;
  created_at: string;
}

export interface Donation {
  id: string;
  donor_id: string;
  ngo_id: string;
  amount: number;
  method: PaymentMethod;
  mfs_account: string;
  reference: string;
  verification_hash?: string;
  created_at: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface EnrichedPost extends Post {
  organization?: Organization;
  ngo_profile?: Profile;
}

export interface EnrichedDonation extends Donation {
  donor_name?: string;
  donor_phone?: string;
  ngo_name?: string;
}
