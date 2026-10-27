/**
 * The Goodwill Network - Complete Supabase PostgreSQL Schema & Migration Script
 * Ready for copy-pasting into Supabase SQL Editor
 */

export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- THE GOODWILL NETWORK: COMPLETE SUPABASE POSTGRESQL SCHEMA
-- Execute in Supabase SQL Editor: Dashboard > SQL Editor > New Query
-- ========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ngo', 'benefactor', 'admin')),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    bkash_no TEXT,
    nagad_no TEXT,
    picture TEXT,
    director_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'restricted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2a. Separate Table: NGO Accounts
CREATE TABLE IF NOT EXISTS public.ngo_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    picture TEXT NOT NULL,
    director_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    bkash_no TEXT,
    nagad_no TEXT,
    password TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'restricted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2b. Separate Table: Benefactor Accounts
CREATE TABLE IF NOT EXISTS public.benefactor_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    picture TEXT NOT NULL,
    bkash_no TEXT,
    nagad_no TEXT,
    password TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'restricted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ngo_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date_created DATE NOT NULL,
    director_name TEXT NOT NULL,
    address TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    bkash_no TEXT NOT NULL,
    nagad_no TEXT NOT NULL,
    total_raised NUMERIC NOT NULL DEFAULT 0,
    donation_count INTEGER NOT NULL DEFAULT 0,
    fee_status TEXT NOT NULL DEFAULT 'exempt' CHECK (fee_status IN ('exempt', 'active', 'unpaid')),
    next_fee_due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_ngo_org UNIQUE(ngo_id)
);

-- 4. Create Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ngo_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    caption TEXT NOT NULL,
    media_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Create Donations Table
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ngo_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL CHECK (method IN ('bKash', 'Nagad')),
    mfs_account TEXT NOT NULL,
    reference TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Create Notices Table
CREATE TABLE IF NOT EXISTS public.notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ========================================================
-- 6b. PERFORMANCE & REALTIME COMPOUND INDEXES
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_ngo_id ON public.posts(ngo_id);
CREATE INDEX IF NOT EXISTS idx_organizations_ngo_id ON public.organizations(ngo_id);
CREATE INDEX IF NOT EXISTS idx_donations_ngo_created ON public.donations(ngo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);

-- ========================================================
-- 7. DATABASE TRIGGER FUNCTION: after_donation_insert
-- Increments donation_count, total_raised, triggers fee on 4th donation
-- ========================================================

CREATE OR REPLACE FUNCTION public.after_donation_insert()
RETURNS TRIGGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    -- Update organization counts and total raised
    UPDATE public.organizations
    SET 
        donation_count = donation_count + 1,
        total_raised = total_raised + NEW.amount
    WHERE ngo_id = NEW.ngo_id
    RETURNING donation_count INTO new_count;

    -- If donation_count == 4, set fee_status = 'active' and next_fee_due_date = NOW() + INTERVAL '14 days'
    IF new_count = 4 THEN
        UPDATE public.organizations
        SET 
            fee_status = 'active',
            next_fee_due_date = NOW() + INTERVAL '14 days'
        WHERE ngo_id = NEW.ngo_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if already exists and recreate
DROP TRIGGER IF EXISTS trg_after_donation_insert ON public.donations;
CREATE TRIGGER trg_after_donation_insert
AFTER INSERT ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.after_donation_insert();

-- ========================================================
-- 8. STORAGE BUCKET PROVISIONING
-- ========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ngo-logos', 'ngo-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public read ngo-logos" ON storage.objects;
CREATE POLICY "Public read ngo-logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'ngo-logos');

DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ngo-logos');

DROP POLICY IF EXISTS "Public read post-media" ON storage.objects;
CREATE POLICY "Public read post-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "Authenticated users can upload post media" ON storage.objects;
CREATE POLICY "Authenticated users can upload post media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-media');

-- ========================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read for approved profiles; users can update own profile
DROP POLICY IF EXISTS "Public read approved profiles" ON public.profiles;
CREATE POLICY "Public read approved profiles"
ON public.profiles FOR SELECT
USING (status = 'approved' OR auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Organizations: Public read for approved NGOs; NGOs can insert/update own organization
DROP POLICY IF EXISTS "Public read approved organizations" ON public.organizations;
CREATE POLICY "Public read approved organizations"
ON public.organizations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = organizations.ngo_id AND profiles.status = 'approved'
    ) OR auth.uid() = ngo_id
);

DROP POLICY IF EXISTS "NGOs can insert own organization" ON public.organizations;
CREATE POLICY "NGOs can insert own organization"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = ngo_id);

DROP POLICY IF EXISTS "NGOs can update own organization" ON public.organizations;
CREATE POLICY "NGOs can update own organization"
ON public.organizations FOR UPDATE
TO authenticated
USING (auth.uid() = ngo_id);

-- Posts: Public read for approved NGOs; NGOs can insert/delete own posts
DROP POLICY IF EXISTS "Public read approved posts" ON public.posts;
CREATE POLICY "Public read approved posts"
ON public.posts FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = posts.ngo_id AND profiles.status = 'approved'
    )
);

DROP POLICY IF EXISTS "NGOs can insert own posts" ON public.posts;
CREATE POLICY "NGOs can insert own posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = ngo_id);

DROP POLICY IF EXISTS "NGOs can delete own posts" ON public.posts;
CREATE POLICY "NGOs can delete own posts"
ON public.posts FOR DELETE
TO authenticated
USING (auth.uid() = ngo_id);

-- Donations: Benefactors can insert donations; admins and involved parties can read
DROP POLICY IF EXISTS "Benefactors can insert donations" ON public.donations;
CREATE POLICY "Benefactors can insert donations"
ON public.donations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = donor_id);

DROP POLICY IF EXISTS "Involved parties and admins can read donations" ON public.donations;
CREATE POLICY "Involved parties and admins can read donations"
ON public.donations FOR SELECT
TO authenticated
USING (
    auth.uid() = donor_id OR 
    auth.uid() = ngo_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Notices: Public read; Admin-only write/delete
DROP POLICY IF EXISTS "Public read notices" ON public.notices;
CREATE POLICY "Public read notices"
ON public.notices FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admin insert notices" ON public.notices;
CREATE POLICY "Admin insert notices"
ON public.notices FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "Admin delete notices" ON public.notices;
CREATE POLICY "Admin delete notices"
ON public.notices FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
`;
