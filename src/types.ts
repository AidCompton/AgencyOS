export interface AgencyOverview {
  mrr: number;
  arr: number;
  avgRetainer: number;
  activeCampaigns: number;
  pipelineValue: number;
  clientCount: number;
  churnRate: number;
}

export interface Lead {
  id: string;
  company_name: string;
  industry: string;
  source: string;
  status: string;
  estimated_value: number;
  deal_name?: string;
  deal_stage?: string;
  deal_value?: number;
}

export interface Client {
  id: string;
  name: string;
  onboarding_status: string;
  lifecycle_stage: string;
  health_score: number;
  health_label: 'Healthy' | 'Stable' | 'At Risk' | 'Critical';
  retainer_amount: number;
  last_communication?: string;
  contract_end?: string;
  renewal_date?: string;
  account_manager_id?: string;
}

export interface Campaign {
  id: string;
  client_id: string;
  client_name: string;
  name: string;
  type: string;
  status: 'planning' | 'creative_production' | 'launch' | 'optimisation' | 'reporting' | 'completed';
  budget: number;
  start_date?: string;
  end_date?: string;
  meta_ad_account_id?: string;
  meta_access_token?: string;
  meta_pixel_id?: string;
}

export interface CampaignMetric {
  id: number;
  campaign_id: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr?: number;
  cpc?: number;
  cpl?: number;
  cpa?: number;
  roas?: number;
  organic_traffic?: number;
  keyword_rankings_top3?: number;
  engagement_rate?: number;
  open_rate?: number;
  click_rate?: number;
}

export interface Task {
  id: string;
  title: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed';
  category: string;
  internal_deadline?: string;
  external_deadline?: string;
  brief?: string;
  assigned_to?: string;
  completed_at?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  capacity_hours: number;
  allocated_hours: number;
  satisfaction_score: number;
  client_count: number;
  revenue_managed: number;
  on_time_percentage?: number;
  retention_rate?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  end_date?: string;
  type: 'client_meeting' | 'campaign_launch' | 'review' | 'internal' | 'upload' | 'deadline' | 'campaign' | 'meeting';
  description?: string;
  client_id?: string;
}

export interface Retainer {
  id: string;
  client_id: string;
  amount: number;
  total_hours: number;
  billing_cycle: string;
  next_invoice_date: string;
  status: string;
}

export interface Service {
  id: string;
  retainer_id: string;
  name: string;
  allocated_hours: number;
  used_hours?: number; // Calculated field
}

export interface TimeEntry {
  id: string;
  client_id: string;
  service_id: string;
  task_id?: string;
  user_id: string;
  hours: number;
  date: string;
  description: string;
  service_name?: string; // Joined field
  user_name?: string; // Joined field
}

export interface Contract {
  id: string;
  client_id: string;
  title: string;
  document_url?: string;
  signed_at: string;
  status: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface Report {
  id: string;
  title: string;
  content: string;
  created_at: string;
  type: 'performance' | 'client' | 'campaign';
}
