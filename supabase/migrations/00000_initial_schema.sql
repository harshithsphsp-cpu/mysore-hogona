-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('super_admin', 'org_admin', 'member');
CREATE TYPE contact_status AS ENUM (
  'Not Called', 
  'Called', 
  'Interested', 
  'Not Interested', 
  'No Response', 
  'Busy', 
  'Wrong Number', 
  'Follow-up Required', 
  'Callback Scheduled', 
  'Registered for Event'
);
CREATE TYPE campaign_status AS ENUM ('active', 'paused', 'completed');
CREATE TYPE follow_up_status AS ENUM ('pending', 'completed');

-- Organizations Table
CREATE TABLE public.organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles Table (Extends auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    system_role user_role DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Members
CREATE TABLE public.organization_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role user_role DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Campaigns Table
CREATE TABLE public.campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status campaign_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts Table
CREATE TABLE public.contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    first_name TEXT,
    last_name TEXT,
    name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    phone_number TEXT,
    email TEXT,
    location TEXT,
    status contact_status DEFAULT 'Not Called',
    notes TEXT,
    assigned_member_id UUID REFERENCES public.organization_members(id) ON DELETE SET NULL,
    callback_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-Ups Table
CREATE TABLE public.follow_ups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    assigned_member_id UUID REFERENCES public.organization_members(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ NOT NULL,
    status follow_up_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Logs Table
CREATE TABLE public.activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    previous_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_follow_ups_updated_at BEFORE UPDATE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS Policies Setup

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is in organization
CREATE OR REPLACE FUNCTION user_in_org(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles: Users can read their own profile, members of same org can read each other
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Organizations: Users can view organizations they belong to
CREATE POLICY "Users can view their orgs" ON public.organizations FOR SELECT USING (user_in_org(id));

-- Organization Members: Users can view members in their orgs
CREATE POLICY "Users can view org members" ON public.organization_members FOR SELECT USING (user_in_org(organization_id));

-- Campaigns: Users can view campaigns in their orgs
CREATE POLICY "Users can view org campaigns" ON public.campaigns FOR SELECT USING (user_in_org(organization_id));
CREATE POLICY "Org admins can manage campaigns" ON public.campaigns FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = campaigns.organization_id AND user_id = auth.uid() AND role IN ('org_admin', 'super_admin')
  )
);

-- Contacts: Users can view contacts in their orgs
CREATE POLICY "Users can view org contacts" ON public.contacts FOR SELECT USING (user_in_org(organization_id));
CREATE POLICY "Users can insert contacts" ON public.contacts FOR INSERT WITH CHECK (user_in_org(organization_id));
CREATE POLICY "Users can update contacts" ON public.contacts FOR UPDATE USING (user_in_org(organization_id));

-- Follow-Ups: Users can view and manage follow-ups in their orgs
CREATE POLICY "Users can view org follow-ups" ON public.follow_ups FOR SELECT USING (user_in_org(organization_id));
CREATE POLICY "Users can insert follow-ups" ON public.follow_ups FOR INSERT WITH CHECK (user_in_org(organization_id));
CREATE POLICY "Users can update follow-ups" ON public.follow_ups FOR UPDATE USING (user_in_org(organization_id));

-- Activity Logs: Users can view logs for their org
CREATE POLICY "Users can view org activity logs" ON public.activity_logs FOR SELECT USING (user_in_org(organization_id));
CREATE POLICY "Users can insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (user_in_org(organization_id));

-- Notifications: Users can view and update their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Enable Supabase Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_ups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create auth trigger to initialize profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
