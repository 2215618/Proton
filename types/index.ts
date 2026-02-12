export interface Org {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  user_id: string;
  org_id: string;
  full_name: string;
  role: 'admin' | 'agent';
}

export type LeadStage = 'Nuevo' | 'Contactado' | 'Calificado' | 'Visita' | 'Oferta' | 'Cierre' | 'Perdido';

export interface Lead {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: LeadStage;
  budget_min: number | null;
  budget_max: number | null;
  location: string | null;
  assigned_to: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

export interface Property {
  id: string;
  org_id: string;
  title: string;
  operation: 'sale' | 'rent';
  price_sale: number | null;
  price_rent: number | null;
  location: string | null;
  address: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  status: 'Active' | 'Pending' | 'Sold';
  description: string | null;
  amenities: string[] | null;
  image_url?: string;
  created_at: string;
}

export interface Visit {
  id: string;
  org_id: string;
  lead_id: string;
  property_id: string | null;
  scheduled_for: string;
  status: 'programada' | 'completada' | 'cancelada';
  notes: string | null;
  created_at: string;
  // Joins
  leads?: Lead;
  properties?: Property;
}

export interface Task {
  id: string;
  org_id: string;
  title: string;
  due_date: string | null;
  status: 'pending' | 'completed';
  related_type: 'lead' | 'deal' | null;
  related_id: string | null;
  assignee_id: string | null;
  created_at: string;
}
