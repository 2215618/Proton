-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations
CREATE TABLE orgs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Profiles (Users linked to Orgs)
CREATE TABLE profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'agent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Leads
CREATE TABLE leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT,
  stage TEXT CHECK (stage IN ('Nuevo', 'Contactado', 'Calificado', 'Visita', 'Oferta', 'Cierre', 'Perdido')) DEFAULT 'Nuevo',
  budget_min NUMERIC,
  budget_max NUMERIC,
  location TEXT,
  assigned_to UUID REFERENCES profiles(user_id),
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(org_id, email),
  UNIQUE(org_id, phone)
);

-- Properties
CREATE TABLE properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  operation TEXT CHECK (operation IN ('sale', 'rent')),
  price_sale NUMERIC,
  price_rent NUMERIC,
  location TEXT,
  address TEXT,
  property_type TEXT,
  bedrooms INT,
  bathrooms INT,
  area_sqm NUMERIC,
  status TEXT CHECK (status IN ('Active', 'Pending', 'Sold')) DEFAULT 'Active',
  description TEXT,
  amenities TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Visits
CREATE TABLE visits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('programada', 'completada', 'cancelada')) DEFAULT 'programada',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Tasks
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
  related_type TEXT,
  related_id UUID,
  assignee_id UUID REFERENCES profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Notes (Timeline)
CREATE TABLE notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(user_id),
  related_type TEXT,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Helper Functions
CREATE OR REPLACE FUNCTION get_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Profiles Policy
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);

-- Standard Organization Isolation Policy
CREATE POLICY "Access own org data only (Leads)" ON leads USING (org_id = get_org_id());
CREATE POLICY "Access own org data only (Properties)" ON properties USING (org_id = get_org_id());
CREATE POLICY "Access own org data only (Visits)" ON visits USING (org_id = get_org_id());
CREATE POLICY "Access own org data only (Tasks)" ON tasks USING (org_id = get_org_id());
CREATE POLICY "Access own org data only (Notes)" ON notes USING (org_id = get_org_id());

-- Triggers for created_at updated_at omitted for brevity but recommended.
